import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

const DISPLAY_MODES = {
  TEXTURED: 'textured',
  WHITE: 'white',
  WIREFRAME: 'wireframe'
};

const Model3DPreview = ({ modelUrl, loading }) => {
  const isMock = typeof modelUrl === 'string' && modelUrl.startsWith('data:image/');

  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);

  const [displayMode, setDisplayMode] = useState(DISPLAY_MODES.TEXTURED);
  const originalMaterialsRef = useRef(new Map());

  const switchDisplayMode = (mode) => {
    if (!modelRef.current) return;
    setDisplayMode(mode);

    modelRef.current.traverse((child) => {
      if (child.isMesh) {
        switch (mode) {
          case DISPLAY_MODES.TEXTURED:
            if (originalMaterialsRef.current.has(child.uuid)) {
              child.material = originalMaterialsRef.current.get(child.uuid);
            }
            break;
          case DISPLAY_MODES.WHITE:
            if (!originalMaterialsRef.current.has(child.uuid)) {
              originalMaterialsRef.current.set(child.uuid, child.material.clone());
            }
            child.material = new THREE.MeshStandardMaterial({
              color: 0xcccccc, roughness: 0.5, metalness: 0.1
            });
            break;
          case DISPLAY_MODES.WIREFRAME:
            if (!originalMaterialsRef.current.has(child.uuid)) {
              originalMaterialsRef.current.set(child.uuid, child.material.clone());
            }
            child.material = new THREE.MeshBasicMaterial({
              color: 0x00aaff, wireframe: true
            });
            break;
          default:
            break;
        }
      }
    });
  };

  useEffect(() => {
    if (isMock) return;
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xDCE5F0);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(2, 1.5, 2.5);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0x404060);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(2, 5, 3);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0x4488ff, 0.3);
    fillLight.position.set(1, 1, 2);
    scene.add(fillLight);

    const gridHelper = new THREE.GridHelper(5, 20, 0x888888, 0xaaaaaa);
    gridHelper.position.y = -0.8;
    scene.add(gridHelper);

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (container && rendererRef.current) {
        container.removeChild(rendererRef.current.domElement);
      }
      if (rendererRef.current) rendererRef.current.dispose();
      if (controlsRef.current) controlsRef.current.dispose();
    };
  }, [isMock]);

  useEffect(() => {
    if (!modelUrl || !sceneRef.current || isMock) return;

    const scene = sceneRef.current;
    const controls = controlsRef.current;
    const camera = cameraRef.current;

    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }
    originalMaterialsRef.current.clear();

    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();
    const basePath = modelUrl.substring(0, modelUrl.lastIndexOf('/') + 1);
    const objFileName = modelUrl.substring(modelUrl.lastIndexOf('/') + 1);
    const mtlUrl = basePath + objFileName.replace('.obj', '.mtl');

    const loadObj = (loader, materials = null) => {
      if (materials) loader.setMaterials(materials);

      loader.load(modelUrl, (obj) => {
        obj.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              originalMaterialsRef.current.set(child.uuid, child.material.clone());
            } else {
              child.material = new THREE.MeshStandardMaterial({ color: 0x88aaff });
              originalMaterialsRef.current.set(child.uuid, child.material.clone());
            }
          }
        });

        scene.add(obj);
        modelRef.current = obj;

        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 1.8;

        camera.position.set(distance * 0.8, distance * 0.6, distance);
        camera.lookAt(center);
        if (controls) {
          controls.target.copy(center);
          controls.update();
        }
      }, undefined, (error) => console.error('OBJ加载失败:', error));
    };

    mtlLoader.load(mtlUrl, (materials) => {
      materials.preload();
      loadObj(objLoader, materials);
    }, undefined, () => loadObj(objLoader));

  }, [modelUrl, isMock]);

  if (isMock) {
    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <img
          src={modelUrl}
          alt="3D Preview"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div className="mode-toolbar" style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 10 }}>
        {[DISPLAY_MODES.TEXTURED, DISPLAY_MODES.WHITE, DISPLAY_MODES.WIREFRAME].map(mode => (
          <button
            key={mode}
            className={`mode-btn-text ${displayMode === mode ? 'active' : ''}`}
            onClick={() => switchDisplayMode(mode)}
          >
            {mode === DISPLAY_MODES.TEXTURED ? '材质' : mode === DISPLAY_MODES.WHITE ? '白模' : '线框'}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Model3DPreview;
