// Three.js 3D Viewer Component
// Loads GLB model, handles material highlighting and X-ray mode

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader, OrbitControls } from 'three-stdlib';
import { MaterialGroup } from '../types';
import { getGLB, getGLBElementIds } from '../services/api';

interface ViewerProps {
  fileId: string;
  modelKey: number;
  selectedMaterial: string | null;
  materialGroups: MaterialGroup[];
  highlightMode: 'normal' | 'xray';
}

interface ExpressIdMapping {
  meshToExpressId: Record<string, number>;
  expressIdToMesh: Record<number, number[]>;
}

const highlightMaterial = new THREE.MeshStandardMaterial({
  color: 0xFFFF00,
});

export function Viewer({ 
  fileId,
  modelKey,
  selectedMaterial, 
  materialGroups,
  highlightMode,
}: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const mappingRef = useRef<ExpressIdMapping | null>(null);
  const frameRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const originalMaterialsRef = useRef<Map<string, THREE.Material>>(new Map());

  useEffect(() => {
    if (!containerRef.current || !fileId) return;

    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1a2e');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50, 
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      originalMaterialsRef.current.clear();
    });

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(10, 20, 10);
    scene.add(ambient, directional);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controlsRef.current = controls;

    const gltfLoader = new GLTFLoader();

    async function loadModel() {
      originalMaterialsRef.current.clear();
      setError(null);
      setIsLoading(true);

      try {
        const glbBlob = await getGLB(fileId);
        const glbUrl = URL.createObjectURL(glbBlob);

        const gltf = await gltfLoader.loadAsync(glbUrl);
        const model = gltf.scene;
        modelRef.current = model;
        scene.add(model);

        const mapping = await getGLBElementIds(fileId);
        mappingRef.current = mapping;

        let meshCount = 0;
        model.traverse((child: any) => {
          if (child.isMesh) {
            originalMaterialsRef.current.set(child.uuid, child.material);
            child.material = child.material.clone();

            const expressId = mapping.meshToExpressId[meshCount];
            if (expressId !== undefined) {
              child.userData.expressId = expressId;
            }
            meshCount++;
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.position.set(
          center.x + maxDim,
          center.y + maxDim,
          center.z + maxDim
        );
        controls.target.copy(center);
        controls.update();

        URL.revokeObjectURL(glbUrl);
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load 3D model';
        setError(errorMessage);
        setIsLoading(false);
      }
    }

    loadModel();

    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    }
    window.addEventListener('resize', handleResize);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);

      renderer.dispose();
      renderer.forceContextLoss();

      scene.traverse((object: any) => {
        if (object.isMesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat: any) => mat.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
      scene.clear();

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [fileId, modelKey]);

  useEffect(() => {
    if (!modelRef.current || !mappingRef.current) return;

    const group = materialGroups.find(g => g.materialGroup === selectedMaterial);
    const targetIds = new Set<number>(group?.elementIds || []);

    modelRef.current.traverse((child: any) => {
      if (!child.isMesh) return;

      const expressId = child.userData.expressId;
      const isTarget = expressId && targetIds.has(Number(expressId));

      if (selectedMaterial && targetIds.size > 0) {
        if (isTarget) {
          child.material = highlightMaterial;
        } else if (highlightMode === 'xray') {
          const original = originalMaterialsRef.current.get(child.uuid);
          if (original && !(original as any).disposed) {
            child.material = original.clone();
            child.material.opacity = 0.1;
            child.material.transparent = true;
          }
        } else {
          const original = originalMaterialsRef.current.get(child.uuid);
          if (original && !(original as any).disposed) {
            child.material = original.clone();
            child.material.opacity = 1;
            child.material.transparent = false;
          }
        }
      } else {
        const original = originalMaterialsRef.current.get(child.uuid);
        if (original && !(original as any).disposed) {
          child.material = original.clone();
          child.material.opacity = 1;
          child.material.transparent = false;
        }
      }
    });
  }, [selectedMaterial, highlightMode, materialGroups, modelKey]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(26, 26, 46, 0.8)',
          color: '#ffffff',
          fontSize: '18px',
          zIndex: 10,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid #ffffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}></div>
            Loading 3D model...
          </div>
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(200, 50, 50, 0.9)',
          color: '#ffffff',
          fontSize: '16px',
          zIndex: 20,
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <p style={{ margin: '0 0 16px 0', fontWeight: 600 }}>Error Loading 3D Model</p>
            <p style={{ margin: '0 0 20px 0', opacity: 0.9 }}>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#c83232',
                backgroundColor: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
