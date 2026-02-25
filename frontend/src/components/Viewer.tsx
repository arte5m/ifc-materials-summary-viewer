import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import * as OBF from '@thatopen/fragments';
import { MaterialGroup } from '../types';
import { getWorkerUrl, revokeWorkerUrl } from '../utils/worker';
import { ViewerControls } from './ViewerControls';

interface Props {
  fileId: string;
  selectedMaterial: string | null;
  materialGroups: MaterialGroup[];
  highlightMode?: 'highlight' | 'xray';
  onHighlightModeChange?: (mode: 'highlight' | 'xray') => void;
  onClearSelection?: () => void;
  onReset?: () => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onElementClicked?: (materialGroup: string) => void;
}

export function Viewer({ fileId, selectedMaterial, materialGroups, highlightMode = 'highlight', onHighlightModeChange, onClearSelection, onReset, onLoadingChange, onElementClicked }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);
  const modelRef = useRef<OBF.FragmentsModel | null>(null);
  const fileIdRef = useRef<string | null>(null);
  const worldRef = useRef<any>(null);
  const workerUrlRef = useRef<string | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const handleResizeRef = useRef<(() => void) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [modelLoadedId, setModelLoadedId] = useState<string | null>(null);

  // Build GUID to material group lookup map for O(1) access
  const guidToMaterialMap = useMemo(() => {
    const map = new Map<string, string>();
    materialGroups.forEach(group => {
      group.elementIds.forEach(guid => {
        map.set(guid, group.materialGroup);
      });
    });
    return map;
  }, [materialGroups]);

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initViewer = async () => {
      try {
        const components = new OBC.Components();
        const worlds = components.get(OBC.Worlds);
        const world = worlds.create<
          OBC.SimpleScene,
          OBC.OrthoPerspectiveCamera,
          OBC.SimpleRenderer
        >();

        world.scene = new OBC.SimpleScene(components);
        world.scene.setup();
        world.scene.three.background = null;
        world.renderer = new OBC.SimpleRenderer(components, containerRef.current!);
        world.camera = new OBC.OrthoPerspectiveCamera(components);
        await world.camera.controls.setLookAt(68, 23, -8.5, 21.5, -5.5, 23);        
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

        if (!workerUrlRef.current) {
          workerUrlRef.current = await getWorkerUrl();
        }
        const fragments = components.get(OBC.FragmentsManager);
        (fragments as any).init(workerUrlRef.current);
        fragmentsRef.current = fragments;

        world.camera.controls.addEventListener("update", () => (fragments as any).core.update());

        // Handle window/container resize to prevent model stretching
        handleResizeRef.current = () => {
          if (!containerRef.current || !world.renderer || !world.camera) return;
          
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          
          // Update renderer size (false = don't update CSS style)
          world.renderer.three.setSize(width, height, false);
          
          // Update camera aspect ratio to prevent stretching
          world.camera.updateAspect();
        };
        
        // Use ResizeObserver for container resize detection
        if (containerRef.current) {
          resizeObserverRef.current = new ResizeObserver(handleResizeRef.current);
          resizeObserverRef.current.observe(containerRef.current);
        }

        fragments.list.onItemSet.add(async ({ value: model }) => {
          model.useCamera(world.camera.three);
          world.scene.three.add(model.object);
          await (fragments as any).core.update(true);

          // Frame camera to fit model using BoundingBoxer
          try {
            const boxer = components.get(OBC.BoundingBoxer);
            boxer.list.clear();
            boxer.addFromModels();
            const box = boxer.get();
            const sphere = new THREE.Sphere();
            box.getBoundingSphere(sphere);
            await world.camera.controls.fitToSphere(sphere, true);
            boxer.list.clear();
          } catch (err) {
            // Silently fail - use default camera position
          }

          worldRef.current = world;
          modelRef.current = model;
          setIsLoading(false);
          setModelLoadedId(fileId);
        });

        const highlighter = components.get(OBCF.Highlighter);
        highlighter.setup({
          world,
          selectMaterialDefinition: {
            color: new THREE.Color("#b73f74"),
            opacity: 1,
            transparent: false,
            renderedFaces: 0,
          },
        });
        highlighterRef.current = highlighter;

        (highlighter as any).styles.set('xray', {
          color: new THREE.Color("#b5decc"),
          opacity: 0.2,
          transparent: true,
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
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
          resizeObserverRef.current = null;
        }
        
        if (modelRef.current) {
          worldRef.current?.scene.three.remove(modelRef.current.object);
          modelRef.current.dispose();
          modelRef.current = null;
        }

        componentsRef.current?.dispose();
        
        revokeWorkerUrl();
        workerUrlRef.current = null;
        
        componentsRef.current = null;
        fragmentsRef.current = null;
        highlighterRef.current = null;
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
        await (ifcLoader as any).load(buffer, false, fileId, {
          processData: {
            progressCallback: (progress: number) => {
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

  // Listen to element clicks and auto-select material group
  useEffect(() => {
    if (!highlighterRef.current) return;
    if (!fragmentsRef.current) return;
    if (materialGroups.length === 0) return;

    const handleElementClick = async (modelIdMap: any) => {
      try {
        // Extract the first clicked element
        for (const [modelId, localIds] of Object.entries(modelIdMap)) {
          if ((localIds as Set<number>).size === 0) continue;

          const model = fragmentsRef.current?.list.get(modelId);
          if (!model) continue;

          // Get the first clicked element's data (must pass array of IDs)
          const firstLocalId = [...(localIds as Set<number>)][0];
          const itemsData = await model.getItemsData([firstLocalId]);
          if (!itemsData || itemsData.length === 0) continue;

          const itemData = itemsData[0] as any;

          // Extract GUID from element data (fragment data stores it as _guid.value)
          const clickedGuid = itemData._guid?.value || itemData.GlobalId || itemData.globalId || itemData.Guid;
          if (!clickedGuid) continue;

          // O(1) lookup using pre-built map
          const materialGroup = guidToMaterialMap.get(clickedGuid);

          if (materialGroup && onElementClicked) {
            onElementClicked(materialGroup);
          }
          break;
        }
      } catch (err) {
        // Silently fail - click highlighting still works
      }
    };

    // Register highlight listener
    highlighterRef.current.events.select.onHighlight.add(handleElementClick);

    // Cleanup: Remove listener when dependencies change
    return () => {
      try {
        if (highlighterRef.current) {
          highlighterRef.current.events.select.onHighlight.remove(handleElementClick);
        }
      } catch (err) {
        // Silently fail - may already be removed
      }
    };
  }, [guidToMaterialMap, onElementClicked, fragmentsRef]);

  useEffect(() => {
    const highlightMaterial = async () => {
      if (!highlighterRef.current || !modelRef.current) {
        return;
      }
       
      const highlighter = highlighterRef.current;
      
      highlighter.clear('select');
      highlighter.clear('xray');
      
      // Handle xray mode with no selection - show all elements at 15%
      if (!selectedMaterial && highlightMode === 'xray') {
        try {
          const allIds = await modelRef.current.getLocalIds();
          const modelId = modelRef.current.modelId;
          
          if (!modelId || allIds.length === 0) {
            return;
          }
          
          const allIdMap: any = {};
          allIdMap[modelId] = new Set(allIds);
          await highlighter.highlightByID('xray', allIdMap, true);
        } catch (err) {
          // Silently fail
        }
        return;
      }
      
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

        const selectedIdMap: any = {};
        selectedIdMap[modelId] = new Set(selectedIds);

        const allIdMap: any = {};
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
  }, [selectedMaterial, materialGroups, highlightMode, modelLoadedId]);

  const handleReset = useCallback(async () => {
    if (!fileId || !componentsRef.current || !fragmentsRef.current || !worldRef.current) {
      return;
    }

    // Clear highlights
    if (highlighterRef.current) {
      highlighterRef.current.clear('select');
      highlighterRef.current.clear('xray');
    }

    // Notify parent to clear selection
    if (onClearSelection) {
      onClearSelection();
    }

    // Reset highlight mode to default
    if (onReset) {
      onReset();
    }

    // Dispose current model
    if (modelRef.current) {
      worldRef.current.scene.three.remove(modelRef.current.object);
      modelRef.current.dispose();
      modelRef.current = null;
    }

    // Reset state
    fileIdRef.current = null;
    setModelLoadedId(null);
    setIsLoading(true);
    setConversionProgress(0);
    setError(null);

    // Reload from IFC
    try {
      const response = await fetch(`/api/upload/${fileId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch IFC file');
      }

      const data = await response.arrayBuffer();
      const buffer = new Uint8Array(data);

      const ifcLoader = componentsRef.current.get(OBC.IfcLoader);
      await (ifcLoader as any).load(buffer, false, fileId, {
        processData: {
          progressCallback: (progress: number) => {
            setConversionProgress(Math.round(progress * 100));
          },
        },
      });
      // Note: Camera will be framed to fit model in onItemSet handler
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload model');
      setIsLoading(false);
    }
  }, [fileId, onClearSelection, onReset]);

  return (
    <div className="viewer-container">
      <div ref={containerRef} className="viewer-canvas-container" />
      
      {isLoading && (
        <div className="viewer-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <div>Loading Model... {conversionProgress}%</div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="viewer-overlay error">
          <div>{error}</div>
        </div>
      )}
      
      {!isLoading && modelRef.current && (
        <ViewerControls
          highlightMode={highlightMode}
          onHighlightModeChange={onHighlightModeChange || (() => {})}
          onReset={handleReset}
          disabled={false}
        />
      )}
    </div>
  );
}
