'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut,
  Loader2, RotateCw, Camera, Download, Grid3X3, Box, Orbit,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelViewerProps {
  file?: File;
  url?: string;
  className?: string;
  showControls?: boolean;
  autoRotate?: boolean;
  color?: string;
  onLoad?: (geometry: THREE.BufferGeometry) => void;
  onError?: (error: Error) => void;
}

const COLOR_MAP: Record<string, number> = {
  'Natural': 0xF5F5DC, 'White': 0xFFFFFF, 'Black': 0x1A1A1A,
  'Red': 0xFF0000, 'Blue': 0x2563EB, 'Green': 0x16A34A,
  'Yellow': 0xEAB308, 'Orange': 0xEA580C, 'Purple': 0x9333EA, 'Gray': 0x6B7280,
};

function createProceduralEnvMap(): THREE.CubeTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#2a2a3a');
  gradient.addColorStop(0.5, '#1a1a2a');
  gradient.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const data = canvas;
  const texture = new THREE.CubeTexture([data, data, data, data, data, data]);
  texture.needsUpdate = true;
  return texture;
}

export function ModelViewer({
  file, url, className, showControls = true,
  autoRotate = false, color = 'Natural', onLoad, onError,
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const wireframeRef = useRef<THREE.LineSegments | null>(null);
  const buildPlateRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const envMapRef = useRef<THREE.CubeTexture | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buildVolume, setBuildVolume] = useState({ x: 220, y: 220, z: 250 });
  const [showBuildVolume, setShowBuildVolume] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  const buildVolumeRef = useRef<THREE.LineSegments | null>(null);

  useEffect(() => {
    const fetchBuildVolume = async () => {
      try {
        const response = await fetch('/api/settings/build-volume');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const { max_x, max_y, max_z } = result.data;
            setBuildVolume({ x: max_x * 10, y: max_y * 10, z: max_z * 10 });
          }
        }
      } catch (err) {
        console.error('Build volume fetch error:', err);
      }
    };
    fetchBuildVolume();
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    const envMap = createProceduralEnvMap();
    envMapRef.current = envMap;
    scene.environment = envMap;
    scene.backgroundIntensity = 0.3;

    const camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight, 0.1, 10000
    );
    camera.position.set(buildVolume.x * 1.5, buildVolume.z * 0.8, buildVolume.y * 1.5);
    camera.lookAt(0, buildVolume.z / 2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    scene.add(hemiLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight1.position.set(buildVolume.x, buildVolume.z * 2, buildVolume.y);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 1024;
    directionalLight1.shadow.mapSize.height = 1024;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x8888ff, 0.3);
    directionalLight2.position.set(-buildVolume.x, buildVolume.z * 0.5, -buildVolume.y);
    scene.add(directionalLight2);

    const buildPlateGroup = new THREE.Group();
    buildPlateRef.current = buildPlateGroup;
    scene.add(buildPlateGroup);

    // Glass-like build plate
    const plateGeometry = new THREE.BoxGeometry(buildVolume.x, 2, buildVolume.y);
    const plateMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a2a,
      metalness: 0.1,
      roughness: 0.3,
      transparent: true,
      opacity: 0.6,
      clearcoat: 0.2,
      envMapIntensity: 0.5,
    });
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.position.y = -1;
    plate.receiveShadow = true;
    buildPlateGroup.add(plate);

    // Subtle floor glow ring
    const glowGeometry = new THREE.RingGeometry(
      Math.min(buildVolume.x, buildVolume.y) * 0.4,
      Math.min(buildVolume.x, buildVolume.y) * 0.5, 32
    );
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x4444ff, transparent: true, opacity: 0.05, side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.5;
    buildPlateGroup.add(glow);

    const gridHelper = new THREE.GridHelper(
      Math.max(buildVolume.x, buildVolume.y), 20, 0x666666, 0x444444
    );
    gridHelper.position.y = 0.1;
    buildPlateGroup.add(gridHelper);

    // Build volume wireframe
    const boxGeometry = new THREE.BoxGeometry(buildVolume.x, buildVolume.z, buildVolume.y);
    const boxEdges = new THREE.EdgesGeometry(boxGeometry);
    const boxLines = new THREE.LineSegments(
      boxEdges,
      new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5 })
    );
    boxLines.position.y = buildVolume.z / 2;
    buildVolumeRef.current = boxLines;
    buildPlateGroup.add(boxLines);

    // Coordinate axes
    const axesGroup = new THREE.Group();
    const axisLength = Math.min(buildVolume.x, buildVolume.y, buildVolume.z) * 0.3;

    const createAxis = (color: number, rot: [number, number, number], pos: [number, number, number], arrowPos: [number, number, number]) => {
      const mat = new THREE.MeshBasicMaterial({ color });
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, axisLength, 8), mat);
      cyl.rotation.set(rot[0], rot[1], rot[2]);
      cyl.position.set(pos[0], pos[1], pos[2]);
      axesGroup.add(cyl);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 8), mat);
      cone.rotation.set(rot[0], rot[1], rot[2]);
      cone.position.set(arrowPos[0], arrowPos[1], arrowPos[2]);
      axesGroup.add(cone);
    };
    createAxis(0xff0000, [0, 0, -Math.PI / 2], [axisLength / 2, 0, 0], [axisLength + 3, 0, 0]);
    createAxis(0x00ff00, [0, 0, 0], [0, axisLength / 2, 0], [0, axisLength + 3, 0]);
    createAxis(0x0000ff, [Math.PI / 2, 0, 0], [0, 0, axisLength / 2], [0, 0, axisLength + 3]);

    axesGroup.position.set(-buildVolume.x / 2, 0.5, -buildVolume.y / 2);
    buildPlateGroup.add(axesGroup);

    // Dimension labels (Canvas2D sprites)
    const createLabel = (text: string, position: THREE.Vector3, color = '#ffffff') => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 512; canvas.height = 96;
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.font = 'Bold 44px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 8;
      ctx.fillText(text, 256, 48);
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.7 });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(position);
      sprite.scale.set(40, 7.5, 1);
      return sprite;
    };

    buildPlateGroup.add(createLabel(`${buildVolume.x}mm`, new THREE.Vector3(0, -10, buildVolume.y / 2 + 25)));
    buildPlateGroup.add(createLabel(`${buildVolume.y}mm`, new THREE.Vector3(buildVolume.x / 2 + 25, -10, 0)));
    buildPlateGroup.add(createLabel(`${buildVolume.z}mm`, new THREE.Vector3(-buildVolume.x / 2 - 25, buildVolume.z / 2, buildVolume.y / 2 + 25), '#00ff88'));

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 50;
    controls.maxDistance = Math.max(buildVolume.x, buildVolume.y, buildVolume.z) * 5;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2.0;
    controls.target.set(0, buildVolume.z / 2, 0);
    controlsRef.current = controls;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width < 100 || height < 100) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) requestAnimationFrame(handleResize);
      }
    });
    resizeObserver.observe(container);

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', () => {
      handleResize();
      setTimeout(handleResize, 100);
    });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (controlsRef.current) controlsRef.current.dispose();
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, [autoRotate, buildVolume]);

  // Build volume visibility
  useEffect(() => {
    if (buildVolumeRef.current) buildVolumeRef.current.visible = showBuildVolume;
  }, [showBuildVolume]);

  // Wireframe toggle
  useEffect(() => {
    if (!meshRef.current || !sceneRef.current) return;
    if (showWireframe) {
      const geo = new THREE.EdgesGeometry(meshRef.current.geometry);
      const mat = new THREE.LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.4 });
      const wire = new THREE.LineSegments(geo, mat);
      wire.position.copy(meshRef.current.position);
      wire.rotation.copy(meshRef.current.rotation);
      wire.scale.copy(meshRef.current.scale);
      wireframeRef.current = wire;
      sceneRef.current.add(wire);
    } else {
      if (wireframeRef.current && sceneRef.current) {
        sceneRef.current.remove(wireframeRef.current);
        wireframeRef.current.geometry.dispose();
        (wireframeRef.current.material as THREE.Material).dispose();
        wireframeRef.current = null;
      }
    }
    return () => {
      if (wireframeRef.current && sceneRef.current) {
        sceneRef.current.remove(wireframeRef.current);
        wireframeRef.current.geometry.dispose();
        (wireframeRef.current.material as THREE.Material).dispose();
        wireframeRef.current = null;
      }
    };
  }, [showWireframe]);

  // Load STL
  useEffect(() => {
    if (!file && !url) return;
    if (!sceneRef.current || !cameraRef.current) return;

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const loader = new STLLoader();

    if (meshRef.current && sceneRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      if (Array.isArray(meshRef.current.material)) {
        meshRef.current.material.forEach(m => m.dispose());
      } else {
        meshRef.current.material.dispose();
      }
      meshRef.current = null;
    }
    if (wireframeRef.current && sceneRef.current) {
      sceneRef.current.remove(wireframeRef.current);
      wireframeRef.current.geometry.dispose();
      (wireframeRef.current.material as THREE.Material).dispose();
      wireframeRef.current = null;
    }

    const loadGeometry = (geometry: THREE.BufferGeometry) => {
      if (isCancelled) return;
      const currentScene = sceneRef.current;
      if (!currentScene) { setError('Scene not initialized'); setIsLoading(false); return; }

      geometry.computeVertexNormals();
      geometry.center();
      geometry.computeBoundingBox();

      const bbox = geometry.boundingBox!;
      const size = new THREE.Vector3();
      bbox.getSize(size);

      const materialColor = COLOR_MAP[color] || COLOR_MAP['Natural'];
      const material = new THREE.MeshPhysicalMaterial({
        color: materialColor,
        metalness: 0.05,
        roughness: 0.4,
        envMap: envMapRef.current || undefined,
        envMapIntensity: 0.6,
        clearcoat: 0.1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.rotation.x = -Math.PI / 2;

      const rotatedBox = new THREE.Box3().setFromObject(mesh);
      const rotatedSize = new THREE.Vector3();
      rotatedBox.getSize(rotatedSize);
      mesh.position.y = rotatedSize.y / 2;

      meshRef.current = mesh;
      currentScene.add(mesh);

      // Auto-fit camera with smooth transition
      if (cameraRef.current && controlsRef.current) {
        const target = new THREE.Vector3(0, rotatedSize.y / 2, 0);
        const maxDim = Math.max(rotatedSize.x, rotatedSize.y, rotatedSize.z);
        const distance = Math.max(maxDim * 2.5, 100);
        cameraRef.current.position.set(distance * 0.7, distance * 0.7, distance * 0.7);
        controlsRef.current.target.copy(target);
        controlsRef.current.update();
      }

      if (showWireframe) {
        const geo = new THREE.EdgesGeometry(geometry);
        const mat = new THREE.LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.4 });
        const wire = new THREE.LineSegments(geo, mat);
        wire.position.copy(mesh.position);
        wire.rotation.copy(mesh.rotation);
        wire.scale.copy(mesh.scale);
        wireframeRef.current = wire;
        currentScene.add(wire);
      }

      if (!isCancelled) {
        setIsLoading(false);
        onLoad?.(geometry);
      }
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!isCancelled) {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const geometry = loader.parse(arrayBuffer);
          loadGeometry(geometry);
        }
      };
      reader.onerror = () => {
        if (!isCancelled) {
          setError('Failed to read file'); setIsLoading(false);
          onError?.(new Error('Failed to read file'));
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (url) {
      loader.load(url, loadGeometry, undefined, (err) => {
        if (!isCancelled) {
          const error = err instanceof Error ? err : new Error('Failed to load model');
          setError(error.message); setIsLoading(false);
          onError?.(error);
        }
      });
    }

    return () => { isCancelled = true; };
  }, [file, url, onLoad, onError, buildVolume, color, showWireframe]);

  // Update material color
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      const materialColor = COLOR_MAP[color] || COLOR_MAP['Natural'];
      (meshRef.current.material as THREE.MeshPhysicalMaterial).color.setHex(materialColor);
    }
  }, [color]);

  const animateCamera = useCallback((targetPos: THREE.Vector3, targetLookAt: THREE.Vector3, duration = 400) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const startPos = cameraRef.current.position.clone();
    const startTarget = controlsRef.current.target.clone();
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      cameraRef.current!.position.lerpVectors(startPos, targetPos, ease);
      controlsRef.current!.target.lerpVectors(startTarget, targetLookAt, ease);
      controlsRef.current!.update();
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  const resetCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current || !meshRef.current) return;
    const box = new THREE.Box3().setFromObject(meshRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;
    const direction = new THREE.Vector3(1.5, 0.8, 1.5).normalize();
    const targetPos = direction.multiplyScalar(distance).add(center);
    animateCamera(targetPos, center);
  }, [animateCamera]);

  const zoomIn = () => {
    if (!cameraRef.current) return;
    cameraRef.current.position.multiplyScalar(0.8);
  };
  const zoomOut = () => {
    if (!cameraRef.current) return;
    cameraRef.current.position.multiplyScalar(1.2);
  };

  const rotateModel = (axis: 'x' | 'y' | 'z', snap = true) => {
    if (!meshRef.current) return;
    const angle = snap ? Math.PI / 2 : Math.PI / 12;
    meshRef.current.rotation[axis] += angle;
    const box = new THREE.Box3().setFromObject(meshRef.current);
    const minY = box.min.y;
    meshRef.current.position.y -= minY;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const takeScreenshot = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    setIsScreenshotting(true);
    try {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const link = document.createElement('a');
      link.download = 'model-preview.png';
      link.href = rendererRef.current.domElement.toDataURL('image/png');
      link.click();
    } catch { /* ignore */ } finally { setIsScreenshotting(false); }
  };

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div ref={containerRef} className="relative w-full h-full min-h-[400px]">
        <canvas ref={canvasRef} className="block w-full h-full max-w-full" style={{ maxWidth: '100%' }} />

        {/* Loading */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Model yükleniyor...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-2 p-4">
              <p className="text-sm font-medium text-destructive">Hata</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {/* Toolbar - top right */}
        {showControls && !isLoading && !error && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-1">
            {/* Mobile: compact dropdown for rotation */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="secondary" className="h-8 w-8 bg-background/80 backdrop-blur-sm">
                    <RotateCw className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs">Eksen Döndürme</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(['X', 'Y', 'Z'] as const).map(axis => (
                    <div key={axis}>
                      <DropdownMenuItem onClick={() => rotateModel(axis.toLowerCase() as 'x' | 'y' | 'z')} className="text-xs">
                        <span className={`text-${axis === 'X' ? 'red' : axis === 'Y' ? 'green' : 'blue'}-500 mr-2 font-bold`}>{axis}</span>
                        90° Döndür
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => rotateModel(axis.toLowerCase() as 'x' | 'y' | 'z', false)} className="text-xs text-muted-foreground">
                        <span className={`text-${axis === 'X' ? 'red' : axis === 'Y' ? 'green' : 'blue'}-500 mr-2 font-bold`}>{axis}</span>
                        15° Döndür
                      </DropdownMenuItem>
                      {axis !== 'Z' && <DropdownMenuSeparator />}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop: rotation panel */}
            <div className="hidden sm:flex flex-col gap-1">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-1.5 space-y-1">
                <div className="text-[10px] font-medium text-center text-muted-foreground">Döndür</div>
                {([
                  { label: 'X', color: 'text-red-500' },
                  { label: 'Y', color: 'text-green-500' },
                  { label: 'Z', color: 'text-blue-500' },
                ] as const).map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-0.5">
                    <span className={`text-xs font-bold ${color} w-3.5 text-center`}>{label}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => rotateModel(label.toLowerCase() as 'x' | 'y' | 'z')} title={`${label} ekseninde 90° döndür`}>
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => rotateModel(label.toLowerCase() as 'x' | 'y' | 'z', false)} title={`${label} ekseninde 15° döndür`}>
                      <RotateCw className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom toolbar */}
        {showControls && !isLoading && !error && (
          <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 flex items-center justify-between">
            {/* Camera instructions - desktop only */}
            <div className="hidden lg:block text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded-md px-2 py-1">
              Sol tık: Döndür | Sağ tık: Kaydır | Tekerlek: Yakınlaştır
            </div>

            {/* Toolbar buttons */}
            <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 ml-auto">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resetCamera} title="Kamerayı sıfırla">
                <Orbit className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomIn} title="Yakınlaştır">
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomOut} title="Uzaklaştır">
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-border mx-0.5" />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowBuildVolume(!showBuildVolume)} title={showBuildVolume ? 'Yazıcı sınırlarını gizle' : 'Yazıcı sınırlarını göster'}>
                <Box className={cn('h-3.5 w-3.5', showBuildVolume && 'text-primary')} />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowWireframe(!showWireframe)} title={showWireframe ? 'Wireframe gizle' : 'Wireframe göster'}>
                <Grid3X3 className={cn('h-3.5 w-3.5', showWireframe && 'text-primary')} />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={takeScreenshot} disabled={isScreenshotting} title="Ekran görüntüsü al">
                <Camera className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-border mx-0.5" />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={toggleFullscreen} title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}>
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
