'use client';

/**
 * ModelViewer — sade 3D önizleme.
 *
 * Bilinçli olarak yalnızca:
 * - yarı mat model malzemesi (detay/highlight okunur),
 * - sabit arka plan (koyu tema tamamen siyah, açık tema tamamen beyaz),
 * - **çapraz (3/4) ve hafif geriden** kamera ve yörünge kontrolleri
 * içerir. Gölge, tabla, ızgara ve eksen yoktur.
 *
 * Model rengi kullanıcının seçtiği renktir; renk adları Türkçe/İngilizce ve
 * `#rrggbb` olarak çözülür. Arka plan modelden bağımsızdır: siyah zeminde her
 * renk, beyaz zeminde de koyu renkler ayrışır.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, ZoomIn, ZoomOut, Camera, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hexToInt, resolveColorHex } from '@/lib/utils/color';
import { useIsDarkMode } from '@/hooks/use-is-dark';

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

/**
 * Tema arka planı: koyu temada tamamen siyah, açık temada tamamen beyaz.
 * Ara ton yok; modelin kendisi ışıkla ayrışır.
 */
function backgroundFor(isDark: boolean): number {
  return isDark ? 0x000000 : 0xffffff;
}

/** Çapraz (3/4) görünüm yönü: ön-sağ-üst. STL'ler Z-up kabul edilir. */
const CAMERA_DIRECTION = new THREE.Vector3(1, -1.25, 0.8).normalize();

/**
 * Kamerayı modelin çaprazına yerleştirir (hafif geriden, ön-sağ-üst).
 *
 * STL dosyaları Z-up'tır; `up` ekseni +Z. Yatay sığdırma için X/Y'den büyük
 * olanı kullanılır, böylece çapraz bakışta model çerçeveden taşmaz.
 */
function frameDiagonalView(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  box: THREE.Box3
): void {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const aspect = camera.aspect && Number.isFinite(camera.aspect) ? camera.aspect : 1;
  const halfFov = (camera.fov * Math.PI) / 360;
  const horizontal = Math.max(size.x, size.y);
  const distanceByWidth = horizontal / 2 / (Math.tan(halfFov) * aspect);
  const distanceByHeight = size.z / 2 / Math.tan(halfFov);
  // 1.55: model çerçeveyi doldurmaz, kenarlarda nefes payı kalır.
  const distance = Math.max(distanceByWidth, distanceByHeight) * 1.55 + 1;

  camera.up.set(0, 0, 1);
  camera.position.copy(center).addScaledVector(CAMERA_DIRECTION, distance);
  controls.target.copy(center);
  controls.update();
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

  const isDark = useIsDarkMode();
  const modelHex = resolveColorHex(color);
  const background = backgroundFor(isDark);

  // Sahne: ışık, tabla, ızgara YOK.
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    // Arka plan temaya bağlı; renk değişiminde aşağıdaki effect günceller.
    scene.background = new THREE.Color(background);
    // Sahne yeniden kurulursa (yalnızca `autoRotate` değişiminde) yüklü model
    // yeni sahneye taşınır.
    if (meshRef.current) scene.add(meshRef.current);

    const camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight, 0.1, 100000
    );
    camera.up.set(0, 0, 1);
    camera.position.set(0, -200, 0);
    cameraRef.current = camera;

    // Aydınlatma: model tamamen mat görünmesin diye ana ışık + dolgu + tepe
    // ışığı. Gölge, tabla ve ızgara yok; yalnızca yüzey detayı okunur.
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(1.1, -1.6, 1.9);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.9);
    fillLight.position.set(-1.4, -0.9, 0.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
    rimLight.position.set(-0.3, 1.4, 0.7);
    scene.add(rimLight);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
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
    // `background` yalnızca sahne kurulurken okunur; değişimini ayrı effect uygular.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRotate]);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  // Tema / model rengi değişince arka planı güncelle.
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.background = new THREE.Color(background);
  }, [background]);

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

      // Yarı mat yüzey: düşük pürüzlülük detayı (çıkıntı/oyuk) highlight ile
      // gösterir; tamamen mat (basic) malzemede model tek düz leke gibi kalıyordu.
      const material = new THREE.MeshStandardMaterial({
        color: hexToInt(resolveColorHex(color)),
        roughness: 0.45,
        metalness: 0.08,
      });

      const mesh = new THREE.Mesh(geometry, material);
      meshRef.current = mesh;
      currentScene.add(mesh);

      // Çapraz görünüm + modele sığdırma.
      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.aspect =
          (containerRef.current?.clientWidth ?? 1) /
          Math.max(1, containerRef.current?.clientHeight ?? 1);
        cameraRef.current.updateProjectionMatrix();

        const box = new THREE.Box3().setFromObject(mesh);
        frameDiagonalView(cameraRef.current, controlsRef.current, box);

        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 1);
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
    // `color` bilinçli olarak dışarıda: renk değişimi modeli yeniden indirmez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, url, onLoad, onError]);

  // Renk değişince malzeme rengini güncelle.
  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh && mesh.material) {
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(hexToInt(modelHex));
    }
  }, [modelHex]);

  const resetCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current || !meshRef.current) return;
    const box = new THREE.Box3().setFromObject(meshRef.current);
    frameDiagonalView(cameraRef.current, controlsRef.current, box);
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
      <div
        ref={containerRef}
        className="relative w-full h-full min-h-[240px]"
        style={{ backgroundColor: `#${background.toString(16).padStart(6, '0')}` }}
      >
        <canvas ref={canvasRef} className="block w-full h-full max-w-full" style={{ maxWidth: '100%' }} />

        {isLoading && (
          <div className={cn(
            'absolute inset-0 flex items-center justify-center backdrop-blur-[1px]',
            isDark ? 'bg-black/80' : 'bg-white/80'
          )}>
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className={cn('h-8 w-8 animate-spin', isDark ? 'text-white' : 'text-slate-600')} />
              <p className={cn('text-sm', isDark ? 'text-white/80' : 'text-slate-600')}>
                Model yükleniyor...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className={cn(
            'absolute inset-0 flex items-center justify-center',
            isDark ? 'bg-black/80' : 'bg-white/80'
          )}>
            <div className="text-center space-y-2 p-4">
              <p className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-slate-700')}>Hata</p>
              <p className={cn('text-xs', isDark ? 'text-white/80' : 'text-slate-600')}>{error}</p>
            </div>
          </div>
        )}

        {showControls && !isLoading && !error && (
          <div className={cn(
            'absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex items-center gap-1 rounded-lg p-1 backdrop-blur-sm',
            isDark ? 'bg-black/55 text-slate-200' : 'bg-white/85 text-slate-600 shadow-sm'
          )}>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resetCamera} title="Görünümü sıfırla">
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
