import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

// 显示模式枚举
const DISPLAY_MODES = {
  TEXTURED: 'textured',
  WHITE: 'white',
  WIREFRAME: 'wireframe'
};

const Model3DPreview = ({ modelUrl, loading }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  
  const [displayMode, setDisplayMode] = useState(DISPLAY_MODES.TEXTURED);
  const originalMaterialsRef = useRef(new Map());

  // 初始化 Three.js 场景
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
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
    controls.autoRotate = false;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    // 灯光系统
    const ambientLight = new THREE.AmbientLight(0x404060);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(2, 5, 3);
    mainLight.castShadow = true;
    mainLight.receiveShadow = true;
    scene.add(mainLight);
    
    const backLight = new THREE.DirectionalLight(0xffaa66, 0.5);
    backLight.position.set(-2, 2, -3);
    scene.add(backLight);
    
    const fillLight = new THREE.PointLight(0x4488ff, 0.3);
    fillLight.position.set(1, 1, 2);
    scene.add(fillLight);
    
    const rimLight = new THREE.PointLight(0xffaa66, 0.2);
    rimLight.position.set(0, -2, 0);
    scene.add(rimLight);
    
    const gridHelper = new THREE.GridHelper(8, 30, 0x888888, 0x444444);
    gridHelper.position.y = -0.9;
    scene.add(gridHelper);
    
    const groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.DoubleSide, transparent: true, opacity: 0.15 })
    );
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.85;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
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
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, []);

  // 切换显示模式
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
              color: 0xcccccc,
              roughness: 0.5,
              metalness: 0.1
            });
            break;
            
          case DISPLAY_MODES.WIREFRAME:
            if (!originalMaterialsRef.current.has(child.uuid)) {
              originalMaterialsRef.current.set(child.uuid, child.material.clone());
            }
            child.material = new THREE.MeshBasicMaterial({
              color: 0x00aaff,
              wireframe: true
            });
            break;
            
          default:
            break;
        }
      }
    });
  };

  // 加载 OBJ 模型
  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return;
    
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
      if (materials) {
        loader.setMaterials(materials);
      }
      
      loader.load(
        modelUrl,
        (obj) => {
          obj.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              if (child.material) {
                originalMaterialsRef.current.set(child.uuid, child.material.clone());
              } else {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x88aaff,
                  roughness: 0.5,
                  metalness: 0.1
                });
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
          
          console.log('OBJ 模型加载成功！尺寸:', size);
        },
        (xhr) => {
          console.log('加载进度:', (xhr.loaded / xhr.total * 100).toFixed(2) + '%');
        },
        (error) => {
          console.error('OBJ 模型加载失败:', error);
        }
      );
    };
    
    mtlLoader.load(
      mtlUrl,
      (materials) => {
        materials.preload();
        loadObj(objLoader, materials);
      },
      undefined,
      (error) => {
        console.warn('MTL 材质加载失败，使用默认材质:', error);
        loadObj(objLoader);
      }
    );
  }, [modelUrl]);

  if (loading) {
    return (
      <div className="preview-placeholder loading">
        <div className="spinner"></div>
        <p>Loading 3D model...</p>
      </div>
    );
  }
  
  if (modelUrl) {
    return (
      <div className="model-preview-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* 显示模式切换按钮 - 内部 */}
        <div className="display-mode-controls" style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          display: 'flex',
          gap: '8px',
          background: 'rgba(0,0,0,0.7)',
          padding: '8px 12px',
          borderRadius: '8px',
          backdropFilter: 'blur(8px)'
        }}>
          <button
            onClick={() => switchDisplayMode(DISPLAY_MODES.TEXTURED)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: displayMode === DISPLAY_MODES.TEXTURED ? '#3b82f6' : '#374151',
              color: 'white',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            贴图
          </button>
          <button
            onClick={() => switchDisplayMode(DISPLAY_MODES.WHITE)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: displayMode === DISPLAY_MODES.WHITE ? '#3b82f6' : '#374151',
              color: 'white',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            白膜
          </button>
          <button
            onClick={() => switchDisplayMode(DISPLAY_MODES.WIREFRAME)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: displayMode === DISPLAY_MODES.WIREFRAME ? '#3b82f6' : '#374151',
              color: 'white',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            线框
          </button>
        </div>
        
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          zIndex: 10,
          background: 'rgba(0,0,0,0.5)',
          padding: '4px 8px',
          borderRadius: '4px',
          color: '#aaa',
          fontSize: '11px'
        }}>
          鼠标拖拽旋转 | 右键平移 | 滚轮缩放
        </div>
        
        <div 
          ref={containerRef} 
          className="model-preview-container"
          style={{ 
            width: '100%', 
            height: '100%', 
            borderRadius: '12px', 
            overflow: 'hidden',
            backgroundColor: '#1a1a2e',
            cursor: 'grab'
          }}
        />
      </div>
    );
  }
  
  return (
    <div className="preview-placeholder">
      <p>No 3D model loaded</p>
    </div>
  );
};

export default Model3DPreview;