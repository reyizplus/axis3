'use client';

/**
 * ModelViewer — sade 3D önizleme.
 *
 * Bilinçli olarak yalnızca:
 * - düz gri arkaplan,
 * - ışıksız (unlit) model malzemesi,
 * - yörünge kontrolleri (döndür / kaydır / yakınlaştır)
 * içerir. Tabla, ızgara, eksenler, ışıklar, ortam haritası ve gölge yoktur.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, ZoomIn, ZoomOut, Camera, Maximize2, Minimize2 } from 'lucide-react';
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

/** Düz gri arkaplan. */
const BACKGROUND_COLOR = 0x9a9a9a;

const COLOR_MAP: Record<string, number> = {
  'Natural': 0xF5F5DC, 'White': 0xFFFFFF, 'Black': 0x1A1A1A,
  'Red': 0xFF0000, 'Blue': 0x2563EB, 'Green': 0x16A34A,
  'Yellow': 0xEAB308, 'Orange': 0xEA580C, 'Purple': 0x9333EA, 'Gray': 0x6B7280,
};

function materialColorFor(color: string): number {
  return COLOR_MAP[color] ?? COLOR_MAP['Natural'];
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
  const animationFrameRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScreenshotting, setIsScreenshotting] = useState(false);

  // Sahneyi kur: ışık, tabla, ızgara, ortam haritası YOK.
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND_COLOR);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight, 0.1, 100000
    );
    camera.position.set(120, 100, 120);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 100000;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2.0;
    controlsRef.current = controls;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width < 1 || height < 1) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      controls.dispose();
      renderer.dispose();
    };
  }, [autoRotate]);

  // Modeli yükle.
  useEffect(() => {
    if (!file && !url) return;
    if (!sceneRef.current || !cameraRef.current) return;

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const disposeMesh = () => {
      const mesh = meshRef.current;
      if (mesh && sceneRef.current) {
        sceneRef.current.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        meshRef.current = null;
      }
    };

    disposeMesh();

    const loader = new STLLoader();

    const loadGeometry = (geometry: THREE.BufferGeometry) => {
      if (isCancelled) return;
      const currentScene = sceneRef.current;
      if (!currentScene) {
        setError('Sahne başlatılamadı');
        setIsLoading(false);
        return;
      }

      geometry.computeVertexNormals();
      geometry.center();
      geometry.computeBoundingBox();

      // Işıksız malzeme: modelin rengi seçilen renk, gölge/highlight yok.
      const material = new THREE.MeshBasicMaterial({
        color: materialColorFor(color),
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;

      const rotatedBox = new THREE.Box3().setFromObject(mesh);
      const rotatedSize = new THREE.Vector3();
      rotatedBox.getSize(rotatedSize);
      mesh.position.y = rotatedSize.y / 2;

      meshRef.current = mesh;
      currentScene.add(mesh);

      // Kamerayı modele sığdır.
      if (cameraRef.current && controlsRef.current) {
        const target = new THREE.Vector3(0, rotatedSize.y / 2, 0);
        const maxDim = Math.max(rotatedSize.x, rotatedSize.y, rotatedSize.z);
        const distance = Math.max(maxDim * 2.2, 10);
        const direction = new THREE.Vector3(1.2, 0.9, 1.2).normalize();
        cameraRef.current.position.copy(direction.multiplyScalar(distance).add(target));
        controlsRef.current.target.copy(target);
        controlsRef.current.minDistance = Math.max(maxDim * 0.2, 1);
        controlsRef.current.maxDistance = Math.max(maxDim * 10, 100);
        controlsRef.current.update();
      }

      setIsLoading(false);
      onLoad?.(geometry);
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (isCancelled) return;
        try {
          loadGeometry(loader.parse(event.target?.result as ArrayBuffer));
        } catch (err) {
          const parseError = err instanceof Error ? err : new Error('Model okunamadı');
          setError(parseError.message);
          setIsLoading(false);
          onError?.(parseError);
        }
      };
      reader.onerror = () => {
        if (isCancelled) return;
        setError('Dosya okunamadı');
        setIsLoading(false);
        onError?.(new Error('Failed to read file'));
      };
      reader.readAsArrayBuffer(file);
    } else if (url) {
      loader.load(url, loadGeometry, undefined, (err) => {
        if (isCancelled) return;
        const loadError = err instanceof Error ? err : new Error('Model yüklenemedi');
        setError(loadError.message);
        setIsLoading(false);
        onError?.(loadError);
      });
    }

    return () => { isCancelled = true; };
  }, [file, url, onLoad, onError, color]);

  // Renk değişince malzeme rengini güncelle.
  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh && mesh.material) {
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(materialColorFor(color));
    }
  }, [color]);

  const resetCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current || !meshRef.current) return;
    const box = new THREE.Box3().setFromObject(meshRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;
    const direction = new THREE.Vector3(1.2, 0.9, 1.2).normalize();
    cameraRef.current.position.copy(direction.multiplyScalar(distance).add(center));
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  }, []);

  const zoomIn = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const offset = cameraRef.current.position.clone().sub(controlsRef.current.target);
    cameraRef.current.position.copy(
      controlsRef.current.target.clone().add(offset.multiplyScalar(0.8))
    );
  };

  const zoomOut = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const offset = cameraRef.current.position.clone().sub(controlsRef.current.target);
    cameraRef.current.position.copy(
      controlsRef.current.target.clone().add(offset.multiplyScalar(1.2))
    );
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
    <Card className={cn('relative overflow-hidden border-0 shadow-none', className)}>
      <div ref={containerRef} className="relative w-full h-full min-h-[400px] bg-[#9a9a9a]">
        <canvas ref={canvasRef} className="block w-full h-full max-w-full" style={{ maxWidth: '100%' }} />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#9a9a9a]/80">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <p className="text-sm text-white/80">Model yükleniyor...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#9a9a9a]/80">
            <div className="text-center space-y-2 p-4">
              <p className="text-sm font-medium text-white">Hata</p>
              <p className="text-xs text-white/80">{error}</p>
            </div>
          </div>
        )}

        {showControls && !isLoading && !error && (
          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resetCamera} title="Kamerayı sıfırla">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomIn} title="Yakınlaştır">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={zoomOut} title="Uzaklaştır">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={takeScreenshot} disabled={isScreenshotting} title="Ekran görüntüsü al">
              <Camera className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={toggleFullscreen} title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}>
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
