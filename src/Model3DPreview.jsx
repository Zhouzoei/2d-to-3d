import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const Model3DPreview = ({ modelUrl, loading }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const animationMixerRef = useRef(null);

  // 初始化 Three.js 场景
  useEffect(() => {
    // 修复 ESLint 警告：提前缓存 ref 值
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

    // 动画循环
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (animationMixerRef.current) {
        animationMixerRef.current.update(0.016);
      }
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
      
      if (animationMixerRef.current) {
        animationMixerRef.current.stopAllAction();
      }
      
      // 修复 ESLint 警告：使用提前缓存的 container 变量，而不是直接用 containerRef.current
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

  // 加载 GLB 模型
  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return;
    const scene = sceneRef.current;
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }
    if (animationMixerRef.current) {
      animationMixerRef.current.stopAllAction();
      animationMixerRef.current = null;
    }
    
    const loader = new GLTFLoader();
    loader.load(
      modelUrl, 
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        scene.add(model);
        modelRef.current = model;
        
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          animationMixerRef.current = mixer;
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();
        }
        
        const box = new THREE.Box3().setFromObject(model);
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
        
        console.log('3D模型加载成功！尺寸:', size);
      },
      undefined,
      (error) => {
        console.error('GLB模型加载失败:', error);
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
