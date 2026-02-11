import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import * as OBF from '@thatopen/fragments';
import { MaterialGroup } from '../types';

interface Props {
  fileId: string;
  selectedMaterial: string | null;
  materialGroups: MaterialGroup[];
  highlightMode?: 'highlight' | 'xray';
  onClearSelection?: () => void;
  onReset?: () => void;
}

export function Viewer({ fileId, selectedMaterial, materialGroups, highlightMode = 'highlight', onClearSelection, onReset }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);
  const modelRef = useRef<OBF.FragmentsModel | null>(null);
  const fileIdRef = useRef<string | null>(null);
  const worldRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const initViewer = async () => {
      try {
        const components = new OBC.Components();
        const worlds = components.get(OBC.Worlds);
        const world = worlds.create<
          OBC.SimpleScene,
          OBC.SimpleCamera,
          OBC.SimpleRenderer
        >();

        world.scene = new OBC.SimpleScene(components);
        world.scene.setup();
        world.scene.three.background = null;
        world.renderer = new OBC.SimpleRenderer(components, containerRef.current!);
        world.camera = new OBC.SimpleCamera(components);
        await world.camera.controls.setLookAt(10, 10, 10, 0, 0, 0);

        const canvas = containerRef.current!.querySelector('canvas');
        if (canvas) {
          canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            setError('WebGL context lost. Please refresh the page to reload the viewer.');
            setIsLoading(false);
          });
        }

        components.init();

        const ifcLoader = components.get(OBC.IfcLoader);
        await ifcLoader.setup({
          autoSetWasm: false,
          wasm: {
            path: "/",
            absolute: true,
          },
        });

        const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
        const fetchedUrl = await fetch(githubUrl);
        const workerBlob = await fetchedUrl.blob();
        const workerFile = new File([workerBlob], "worker.mjs", {
          type: "text/javascript",
        });
        const workerUrl = URL.createObjectURL(workerFile);
        const fragments = components.get(OBC.FragmentsManager);
        fragments.init(workerUrl);
        fragmentsRef.current = fragments;

        world.camera.controls.addEventListener("update", () => fragments.core.update());

        fragments.list.onItemSet.add(async ({ value: model }) => {
          model.useCamera(world.camera.three);
          world.scene.three.add(model.object);
          await fragments.core.update(true);

          worldRef.current = world;
          modelRef.current = model;
          setIsLoading(false);
        });

        fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
          if (!("isLodMaterial" in material && (material as any).isLodMaterial)) {
            material.polygonOffset = true;
            material.polygonOffsetUnits = 1;
            material.polygonOffsetFactor = Math.random();
          }
        });

        const highlighter = components.get(OBCF.Highlighter);
        highlighter.setup({
          world,
          selectMaterialDefinition: {
            color: new THREE.Color("#FFFF00"),
            opacity: 1,
            transparent: false,
            renderedFaces: 0,
          },
        });
        highlighterRef.current = highlighter;

        highlighter.styles.set('xray', {
          color: new THREE.Color("#ffffff"),
          opacity: 0.15,
          transparent: true,
          depthTest: true,
          renderedFaces: 0,
        });

        componentsRef.current = components;
        setIsInitialized(true);
        
      } catch (err) {
        setError('Failed to initialize 3D viewer');
      }
    };

    initViewer();

    return () => {
      try {
        if (modelRef.current && fragmentsRef.current) {
          fragmentsRef.current.core.dispose();
          modelRef.current = null;
        }

        componentsRef.current?.dispose();
        
        componentsRef.current = null;
        fragmentsRef.current = null;
        highlighterRef.current = null;
        modelRef.current = null;
        fileIdRef.current = null;
      } catch {
      }
    };
  }, []);

  useEffect(() => {
    if (!isInitialized || !fileId || !fragmentsRef.current) {
      return;
    }
    
    if (fileIdRef.current === fileId) {
      return;
    }

    const loadIfc = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setConversionProgress(0);

        if (modelRef.current) {
          await modelRef.current.dispose();
          modelRef.current = null;
        }

        const response = await fetch(`/api/upload/${fileId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch IFC file');
        }
        
        const data = await response.arrayBuffer();
        const buffer = new Uint8Array(data);

        const ifcLoader = componentsRef.current!.get(OBC.IfcLoader);
        await ifcLoader.load(buffer, false, fileId, {
          processData: {
            progressCallback: (progress) => {
              setConversionProgress(Math.round(progress * 100));
            },
          },
        });
        
        fileIdRef.current = fileId;
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load IFC');
        setIsLoading(false);
      }
    };

    loadIfc();
  }, [fileId, isInitialized]);

  useEffect(() => {
    const highlightMaterial = async () => {
      if (!highlighterRef.current || !modelRef.current) {
        return;
      }
       
      const highlighter = highlighterRef.current;
      
      highlighter.clear('select');
      highlighter.clear('xray');
      
      if (!selectedMaterial) {
        return;
      }

      const group = materialGroups.find(g => g.materialGroup === selectedMaterial);
      
      if (!group || !group.elementIds || group.elementIds.length === 0) {
        return;
      }

      try {
        const guids = group.elementIds;
        const localIdResults = await modelRef.current.getLocalIdsByGuids(guids);

        const selectedIds = localIdResults.filter((id): id is number => id !== null);

        if (selectedIds.length === 0) {
          return;
        }

        const allIds = await modelRef.current.getLocalIds();
        const modelId = modelRef.current.modelId;

        if (!modelId) {
          return;
        }

        const selectedIdMap: OBC.ModelIdMap = {};
        selectedIdMap[modelId] = new Set(selectedIds);

        const allIdMap: OBC.ModelIdMap = {};
        allIdMap[modelId] = new Set(allIds);

        if (highlightMode === 'xray') {
          await highlighter.highlightByID('xray', allIdMap, false);
          await highlighter.highlightByID('select', selectedIdMap, true);
        } else {
          await highlighter.highlightByID('select', selectedIdMap, true);
        }
         
      } catch (err) {
      }
    };

    highlightMaterial();
  }, [selectedMaterial, materialGroups, highlightMode]);

  const handleReset = useCallback(async () => {
    if (highlighterRef.current) {
      highlighterRef.current.clear('select');
      highlighterRef.current.clear('xray');
    }

    if (onClearSelection) {
      onClearSelection();
    }

    if (onReset) {
      onReset();
    }

    if (!fileId || !componentsRef.current || !fragmentsRef.current || !worldRef.current) {
      return;
    }

    if (modelRef.current) {
      worldRef.current.scene.three.remove(modelRef.current.object);
      await modelRef.current.dispose();
      modelRef.current = null;
    }

    fileIdRef.current = null;
    setIsLoading(true);
    setConversionProgress(0);
    setError(null);

    try {
      const response = await fetch(`/api/upload/${fileId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch IFC file');
      }

      const data = await response.arrayBuffer();
      const buffer = new Uint8Array(data);

      const ifcLoader = componentsRef.current.get(OBC.IfcLoader);
      await ifcLoader.load(buffer, false, fileId, {
        processData: {
          progressCallback: (progress) => {
            setConversionProgress(Math.round(progress * 100));
          },
        },
      });

      const maxWait = 10000;
      const checkInterval = 100;
      let waited = 0;

      const checkModel = setInterval(() => {
        waited += checkInterval;

        for (const [_, model] of fragmentsRef.current!.list) {
          if (model && !modelRef.current) {
            clearInterval(checkModel);

            model.useCamera(worldRef.current.camera.three);
            worldRef.current.scene.three.add(model.object);
            fragmentsRef.current!.core.update(true);

            modelRef.current = model;
            fileIdRef.current = fileId;
            setIsLoading(false);
            break;
          }
        }

        if (waited >= maxWait) {
          clearInterval(checkModel);
          setError('Model load timeout');
          setIsLoading(false);
        }
      }, checkInterval);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload model');
      setIsLoading(false);
    }
  }, [fileId, onClearSelection, onReset]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      
      {isLoading && (
        <div style={overlayStyle}>
          <div>Converting IFC... {conversionProgress}%</div>
        </div>
      )}
      
      {error && (
        <div style={{...overlayStyle, backgroundColor: 'rgba(200,50,50,0.9)'}}>
          <div>{error}</div>
        </div>
      )}
      
      {!isLoading && modelRef.current && (
        <button 
          onClick={handleReset}
          style={resetButtonStyle}
        >
          Rerender Model
        </button>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute', 
  top: 0, left: 0, right: 0, bottom: 0,
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center',
  backgroundColor: 'rgba(26, 26, 46, 0.95)', 
  color: '#ffffff',
  zIndex: 10,
};

const resetButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  padding: '8px 16px',
   backgroundColor: '#FFFF00',
  color: '#1a1a2e',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  zIndex: 20,
};
