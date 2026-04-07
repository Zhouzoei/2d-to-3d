import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

const Model3DPreview = ({ modelUrl, loading }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);

  // 初始化 Three.js 场景
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    // 相机
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(2, 1.5, 2.5);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 轨道控制
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
    
    const backLight = new THREE.DirectionalLight(0x88aaff, 0.5);
    backLight.position.set(-2, 2, -3);
    scene.add(backLight);
    
    const fillLight = new THREE.PointLight(0xffaa66, 0.3);
    fillLight.position.set(1, 1, 2);
    scene.add(fillLight);
    
    // 辅助网格地面
    const gridHelper = new THREE.GridHelper(5, 20, 0xcccccc, 0xe0e0e0);
    gridHelper.position.y = -0.8;
    scene.add(gridHelper);

    // 添加辅助轴线（可选，方便调试）
    // const axesHelper = new THREE.AxesHelper(2);
    // scene.add(axesHelper);

    // 动画循环
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

    // 窗口大小适配
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

  // 加载 OBJ 模型（支持 MTL 材质）
  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return;
    
    const scene = sceneRef.current;
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    
    // 移除旧模型
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }
    
    // 获取 OBJ 文件的基础路径（用于查找同目录下的 MTL 文件）
    const basePath = modelUrl.substring(0, modelUrl.lastIndexOf('/') + 1);
    const objFileName = modelUrl.substring(modelUrl.lastIndexOf('/') + 1);
    const mtlUrl = basePath + objFileName.replace('.obj', '.mtl');
    
    const objLoader = new OBJLoader();
    
    // 先尝试加载 MTL 材质
    const mtlLoader = new MTLLoader();
    
    mtlLoader.load(
      mtlUrl,
      (materials) => {
        materials.preload();
        objLoader.setMaterials(materials);
        loadObj(objLoader, scene, controls, camera);
      },
      undefined,
      (error) => {
        // MTL 文件不存在或加载失败，直接加载 OBJ（使用默认材质）
        console.warn('MTL 材质加载失败，使用默认材质:', error);
        loadObj(objLoader, scene, controls, camera);
      }
    );
    
    function loadObj(loader, scene, controls, camera) {
      loader.load(
        modelUrl,
        (obj) => {
          // 启用阴影
          obj.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              // 如果没有材质，给一个默认的材质
              if (!child.material) {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x88aaff,
                  roughness: 0.5,
                  metalness: 0.1
                });
              }
            }
          });
          
          scene.add(obj);
          modelRef.current = obj;
          
          // 调整相机视角以适应模型
          const box = new THREE.Box3().setFromObject(obj);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const distance = maxDim * 1.5;
          
          camera.position.set(distance, distance * 0.8, distance);
          camera.lookAt(center);
          if (controls) {
            controls.target.copy(center);
            controls.update();
          }
          
          console.log('OBJ 模型加载成功！尺寸:', size, '中心点:', center);
        },
        (xhr) => {
          // 加载进度
          console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
          console.error('OBJ 模型加载失败:', error);
        }
      );
    }
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
      <div 
        ref={containerRef} 
        className="model-preview-container"
        style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: '12px', 
          overflow: 'hidden',
          backgroundColor: '#f8f9fa',
          cursor: 'grab'
        }}
      />
    );
  }
  
  return (
    <div className="preview-placeholder">
      <p>No 3D model loaded</p>
    </div>
  );
};

export default Model3DPreview;