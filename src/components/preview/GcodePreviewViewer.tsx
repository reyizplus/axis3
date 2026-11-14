'use client';

/**
 * G-Code Takım Yolu Görüntüleyici
 *
 * Bambu Studio / PrusaSlicer önizlemesinin web karşılığı: gerçek dilimleyici
 * çıktısındaki her çizgi bir G0/G1 hareketidir. Dış/iç duvarlar, dolgu, üst
 * yüzey, köprü, **destek gövdesi ve destek arayüzü** ayrı renklerde gösterilir.
 *
 * Görünürlük filtreleri ve renk modu **dışarıdan** verilir: düğmeler ve
 * listeler artık modelin üzerine açılan panelde değil, yan sütunda durur.
 * Sahnenin üstünde yalnızca kamera düğmesi ve katman kaydırıcısı kalır.
 *
 * Çizim tek bir `LineSegments` çağrısıdır. Konumlar Int16 normalize olarak
 * saklanır ve vertex shader'da gerçek mm'ye çözülür; katman/tür filtresi de
 * shader'da yapılır (CPU'da yeniden tampon üretilmez). 250 bin+ segment akıcı
 * kalır.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Camera, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toolpathColor } from '@/lib/utils/color';
import { useIsDarkMode } from '@/hooks/use-is-dark';
import { formatDuration, formatGrams, type ToolpathColorMode } from '@/lib/preview/display';
import type { GcodePreviewData } from '@/lib/preview/format';

interface GcodePreviewViewerProps {
  data: GcodePreviewData;
  /** Tür başına görünürlük; uzunluğu `data.meta.types` ile aynı olmalı. */
  visibleTypes: boolean[];
  colorMode: ToolpathColorMode;
  className?: string;
}

/** Tür sayısı shader'daki sabit dizi uzunluğuyla aynı olmalı. */
const MAX_TYPES = 16;

/** `#rrggbb` → [0..1] sRGB. Renk yönetimi bilinçli olarak kapalı. */
function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return [0.6, 0.6, 0.6];
  const value = Number.parseInt(match[1], 16);
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
  ];
}

/** Temaya göre sahne renkleri. Koyu tema siyah zemin, açık tema beyaz zemin. */
function stageColors(isDark: boolean) {
  return isDark
    ? {
        clear: 0x0a0e13,
        bed: 0x1b2632,
        gridMajor: 0x6d8aa8,
        gridMinor: 0x3c5166,
        border: 0x9db6cc,
      }
    : {
        clear: 0xf1f4f8,
        bed: 0xe3e9f0,
        gridMajor: 0x9aa8b8,
        gridMinor: 0xc2ccd8,
        border: 0x7c8b9c,
      };
}

const VERTEX_SHADER = /* glsl */ `
  attribute float aType;
  attribute float aLayer;
  attribute float aSpeed;

  uniform vec3 uMin;
  uniform vec3 uMax;
  uniform float uLayerMax;
  uniform float uTypeVisible[${MAX_TYPES}];
  uniform float uTypeCount;
  uniform sampler2D uPalette;
  uniform float uMaxSpeed;

  varying vec3 vTypeColor;
  varying float vSpeed;

  void main() {
    int typeIndex = int(aType + 0.5);

    // Görünürlük: katman aralığı ve tür filtresi. Gizli segmentleri ekran
    // dışına taşıyoruz; discard fragment maliyetinden kaçınır.
    float visible = 1.0;
    for (int i = 0; i < ${MAX_TYPES}; i++) {
      if (i == typeIndex) visible = uTypeVisible[i];
    }

    if (visible < 0.5 || aLayer > uLayerMax + 0.001) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vTypeColor = vec3(0.0);
      vSpeed = 0.0;
      return;
    }

    // Int16 normalize konum → gerçek mm.
    vec3 unit = position / 32767.0 * 0.5 + 0.5;
    vec3 world = uMin + unit * (uMax - uMin);

    vTypeColor = texture2D(uPalette, vec2((aType + 0.5) / uTypeCount, 0.5)).rgb;
    vSpeed = clamp(aSpeed / max(uMaxSpeed, 1.0), 0.0, 1.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uColorMode;
  uniform float uAlpha;

  varying vec3 vTypeColor;
  varying float vSpeed;

  vec3 speedGradient(float t) {
    vec3 slow = vec3(0.23, 0.51, 0.96);
    vec3 mid = vec3(0.13, 0.77, 0.37);
    vec3 fast = vec3(0.97, 0.45, 0.09);
    vec3 veryFast = vec3(0.94, 0.27, 0.27);

    if (t < 0.5) return mix(slow, mid, t / 0.5);
    if (t < 0.8) return mix(mid, fast, (t - 0.5) / 0.3);
    return mix(fast, veryFast, (t - 0.8) / 0.2);
  }

  void main() {
    vec3 speedColor = speedGradient(vSpeed);
    vec3 color = mix(vTypeColor, speedColor, uColorMode);
    gl_FragColor = vec4(color, uAlpha);
  }
`;

export function GcodePreviewViewer({
  data,
  visibleTypes,
  colorMode,
  className,
}: GcodePreviewViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const paletteRef = useRef<THREE.DataTexture | null>(null);
  const bedRef = useRef<THREE.Mesh | null>(null);
  const borderRef = useRef<THREE.LineLoop | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const bedSpecRef = useRef<{ size: number; divisions: number; x: number; y: number } | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef = useRef<(() => void) | null>(null);

  const isDark = useIsDarkMode();

  const totalLayers = data.meta.layers.length;
  /** Oynatma döngüsü katman değerini render beklemeden okur. */
  const layerRef = useRef(totalLayers);

  const [layer, setLayer] = useState(totalLayers);
  const [playing, setPlaying] = useState(false);

  const dimensions = useMemo(() => {
    const { min, max } = data.meta.printBounds;
    return [max[0] - min[0], max[1] - min[1], max[2] - min[2]] as const;
  }, [data]);

  const maxSpeed = useMemo(() => {
    let max = 0;
    for (let i = 0; i < data.speeds.length; i += 1) {
      const value = data.speeds[i] / 10;
      if (value > max) max = value;
    }
    return Math.max(1, max);
  }, [data]);

  const currentLayer = layer >= 1 ? data.meta.layers[Math.min(totalLayers - 1, layer - 1)] : null;

  /* ---------------------------------------------------------------------- */
  /* Sahne                                                                   */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const typeCount = Math.min(MAX_TYPES, data.meta.types.length);
    const { positions, types, layers, speeds, meta } = data;
    const segmentCount = meta.segmentCount;
    const vertexCount = segmentCount * 2;

    const typeAttr = new Float32Array(vertexCount);
    const layerAttr = new Float32Array(vertexCount);
    const speedAttr = new Float32Array(vertexCount);

    for (let i = 0; i < segmentCount; i += 1) {
      const t = types[i];
      const l = layers[i];
      const s = speeds[i] / 10;
      typeAttr[i * 2] = t;
      typeAttr[i * 2 + 1] = t;
      layerAttr[i * 2] = l;
      layerAttr[i * 2 + 1] = l;
      speedAttr[i * 2] = s;
      speedAttr[i * 2 + 1] = s;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aType', new THREE.BufferAttribute(typeAttr, 1));
    geometry.setAttribute('aLayer', new THREE.BufferAttribute(layerAttr, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speedAttr, 1));

    const palette = new Uint8Array(MAX_TYPES * 4);
    for (let i = 0; i < typeCount; i += 1) {
      const [r, g, b] = hexToRgb(meta.types[i].color);
      palette[i * 4] = Math.round(r * 255);
      palette[i * 4 + 1] = Math.round(g * 255);
      palette[i * 4 + 2] = Math.round(b * 255);
      palette[i * 4 + 3] = 255;
    }
    for (let i = typeCount; i < MAX_TYPES; i += 1) {
      palette[i * 4 + 3] = 255;
    }

    const paletteTexture = new THREE.DataTexture(palette, MAX_TYPES, 1, THREE.RGBAFormat);
    paletteTexture.magFilter = THREE.NearestFilter;
    paletteTexture.minFilter = THREE.NearestFilter;
    paletteTexture.needsUpdate = true;
    paletteRef.current = paletteTexture;

    const visibility = new Float32Array(MAX_TYPES);
    for (let i = 0; i < MAX_TYPES; i += 1) {
      visibility[i] = i < typeCount && visibleTypes[i] ? 1 : 0;
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uMin: { value: new THREE.Vector3(...meta.bounds.min) },
        uMax: { value: new THREE.Vector3(...meta.bounds.max) },
        uLayerMax: { value: totalLayers - 1 },
        uTypeVisible: { value: visibility },
        uTypeCount: { value: typeCount },
        uPalette: { value: paletteTexture },
        uMaxSpeed: { value: 1 },
        uColorMode: { value: colorMode === 'speed' ? 1 : 0 },
        uAlpha: { value: 1 },
      },
    });

    materialRef.current = material;

    const segments = new THREE.LineSegments(geometry, material);
    segments.frustumCulled = false;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const bounds = meta.printBounds;
    const center = new THREE.Vector3(
      (bounds.min[0] + bounds.max[0]) / 2,
      (bounds.min[1] + bounds.max[1]) / 2,
      (bounds.min[2] + bounds.max[2]) / 2
    );
    const width = Math.max(1, bounds.max[0] - bounds.min[0]);
    const depth = Math.max(1, bounds.max[1] - bounds.min[1]);
    const height = Math.max(1, bounds.max[2] - bounds.min[2]);
    const diagonal = Math.hypot(width, depth, height);

    scene.add(segments);

    // Tabla: her iki temada da ayrışan bir yüzey + ızgara.
    const bedSize = Math.max(220, width * 1.4, depth * 1.4);
    const divisions = Math.max(10, Math.round(bedSize / 20));
    bedSpecRef.current = { size: bedSize, divisions, x: center.x, y: center.y };

    const colors = stageColors(isDark);

    const bedSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(bedSize, bedSize),
      new THREE.MeshBasicMaterial({ color: colors.bed })
    );
    // Izgaranın altında kalmasın diye çok hafif aşağıda; çizgiler yüzeyde.
    bedSurface.position.set(center.x, center.y, -0.08);
    scene.add(bedSurface);
    bedRef.current = bedSurface;

    const grid = new THREE.GridHelper(bedSize, divisions, colors.gridMajor, colors.gridMinor);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(center.x, center.y, 0);
    scene.add(grid);
    gridRef.current = grid;

    // Tabla kenarı: belirgin bir çerçeve, ölçek hissi için.
    const plate = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(center.x - bedSize / 2, center.y - bedSize / 2, 0),
        new THREE.Vector3(center.x + bedSize / 2, center.y - bedSize / 2, 0),
        new THREE.Vector3(center.x + bedSize / 2, center.y + bedSize / 2, 0),
        new THREE.Vector3(center.x - bedSize / 2, center.y + bedSize / 2, 0),
      ]),
      new THREE.LineBasicMaterial({ color: colors.border })
    );
    scene.add(plate);
    borderRef.current = plate;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setClearColor(colors.clear, 1);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(42, 1, Math.max(0.1, diagonal / 500), diagonal * 20);
    camera.up.set(0, 0, 1);
    camera.position.set(center.x, center.y - diagonal * 1.25, center.z + diagonal * 0.95);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(center);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = Math.max(5, diagonal * 0.05);
    controls.maxDistance = diagonal * 8;
    controls.update();
    controlsRef.current = controls;

    const resetView = () => {
      camera.position.set(center.x, center.y - diagonal * 1.25, center.z + diagonal * 0.95);
      controls.target.copy(center);
      controls.update();
    };
    frameRef.current = resetView;

    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      paletteTexture.dispose();
      plate.geometry.dispose();
      (plate.material as THREE.Material).dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      bedSurface.geometry.dispose();
      (bedSurface.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
      materialRef.current = null;
      paletteRef.current = null;
      bedRef.current = null;
      borderRef.current = null;
      gridRef.current = null;
      controlsRef.current = null;
      cameraRef.current = null;
      frameRef.current = null;
      sceneRef.current = null;
    };
    // Veri değişirse sahne tamamen yeniden kurulur. Tema değişimi sahneyi
    // yeniden kurmaz (kamera korunur); renkler aşağıdaki effect ile güncellenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, totalLayers]);

  /* ---------------------------------------------------------------------- */
  /* Tema → sahne renkleri                                                   */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    if (!scene || !renderer) return;

    const colors = stageColors(isDark);
    renderer.setClearColor(colors.clear, 1);

    const bedMaterial = bedRef.current?.material as THREE.MeshBasicMaterial | undefined;
    if (bedMaterial) bedMaterial.color.setHex(colors.bed);

    const borderMaterial = borderRef.current?.material as THREE.LineBasicMaterial | undefined;
    if (borderMaterial) borderMaterial.color.setHex(colors.border);

    // Izgara rengi sınıf içinde sabit; yeniden üretilir.
    const spec = bedSpecRef.current;
    if (gridRef.current && spec) {
      scene.remove(gridRef.current);
      gridRef.current.geometry.dispose();
      (gridRef.current.material as THREE.Material).dispose();
      const grid = new THREE.GridHelper(spec.size, spec.divisions, colors.gridMajor, colors.gridMinor);
      grid.rotation.x = Math.PI / 2;
      grid.position.set(spec.x, spec.y, 0);
      scene.add(grid);
      gridRef.current = grid;
    }

    // Palet: açık temada çizgiler beyaz zeminde kaybolmasın diye koyulaştırılır.
    const paletteTexture = paletteRef.current;
    if (paletteTexture) {
      const pixels = paletteTexture.image.data;
      data.meta.types.forEach((type, index) => {
        const [r, g, b] = hexToRgb(toolpathColor(type.color, isDark));
        pixels[index * 4] = Math.round(r * 255);
        pixels[index * 4 + 1] = Math.round(g * 255);
        pixels[index * 4 + 2] = Math.round(b * 255);
      });
      paletteTexture.needsUpdate = true;
    }
  }, [isDark, data]);

  /* ---------------------------------------------------------------------- */
  /* Kontroller → shader                                                     */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;

    material.uniforms.uLayerMax.value = layer - 1;
    material.uniforms.uColorMode.value = colorMode === 'speed' ? 1 : 0;
    material.uniforms.uMaxSpeed.value = maxSpeed;

    const flags = material.uniforms.uTypeVisible.value as Float32Array;
    for (let i = 0; i < MAX_TYPES; i += 1) {
      flags[i] = visibleTypes[i] ? 1 : 0;
    }
  }, [layer, colorMode, visibleTypes, maxSpeed]);

  /* ---------------------------------------------------------------------- */
  /* Oynatma                                                                 */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    layerRef.current = layer;
  }, [layer]);

  useEffect(() => {
    if (!playing) return;
    const step = Math.max(1, Math.round(totalLayers / 320));
    const timer = window.setInterval(() => {
      const next = Math.min(totalLayers, layerRef.current + step);
      layerRef.current = next;
      setLayer(next);
      // Son katmana ulaşınca oynatma kendiliğinden durur; ayrı bir
      // "katman değişti" effect'i gerekmez.
      if (next >= totalLayers) setPlaying(false);
    }, 90);
    return () => window.clearInterval(timer);
  }, [playing, totalLayers]);

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl',
        isDark ? 'bg-[#0a0e13]' : 'bg-[#f1f4f8]',
        className
      )}
    >
      <div ref={mountRef} className="relative min-h-0 flex-1" />

      {/* Üst sağ: yalnızca kamera sıfırlama. Tür/ayar panelleri yan sütunda. */}
      <button
        type="button"
        onClick={() => frameRef.current?.()}
        className={cn(
          'absolute right-2 top-2 rounded-md border p-1.5 backdrop-blur-sm transition-colors',
          isDark
            ? 'border-white/10 bg-black/55 text-slate-200 hover:bg-white/10'
            : 'border-slate-300/70 bg-white/85 text-slate-600 shadow-sm hover:bg-white'
        )}
        title="Görünümü sıfırla"
      >
        <Camera className="h-3.5 w-3.5" />
      </button>

      {/* Alt: katman kaydırıcısı */}
      <div
        className={cn(
          'border-t px-2.5 py-2 backdrop-blur-sm',
          isDark ? 'border-white/10 bg-black/60' : 'border-slate-200 bg-white/85'
        )}
      >
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn('h-7 w-7 shrink-0 p-0', isDark ? 'text-slate-200 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-200/70')}
            onClick={() => {
              if (layer >= totalLayers) setLayer(1);
              setPlaying((value) => !value);
            }}
            title={playing ? 'Duraklat' : 'Katmanları oynat'}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn('h-7 w-7 shrink-0 p-0', isDark ? 'text-slate-200 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-200/70')}
            onClick={() => setLayer((value) => Math.max(1, value - 1))}
            title="Önceki katman"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <input
            type="range"
            min={1}
            max={Math.max(1, totalLayers)}
            value={layer}
            onChange={(event) => {
              setPlaying(false);
              setLayer(Number(event.target.value));
            }}
            className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full accent-primary"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${
                ((layer - 1) / Math.max(1, totalLayers - 1)) * 100
              }%, ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.15)'} ${
                ((layer - 1) / Math.max(1, totalLayers - 1)) * 100
              }%, ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.15)'} 100%)`,
            }}
          />

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn('h-7 w-7 shrink-0 p-0', isDark ? 'text-slate-200 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-200/70')}
            onClick={() => setLayer((value) => Math.min(totalLayers, value + 1))}
            title="Sonraki katman"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          <div className={cn('shrink-0 text-[10px] tabular-nums', isDark ? 'text-slate-300' : 'text-slate-600')}>
            <span className={cn('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
              {layer}/{totalLayers}
            </span>
            {currentLayer && (
              <span className={cn('ml-1.5', isDark ? 'text-slate-400' : 'text-slate-500')}>
                Z {currentLayer.z.toFixed(2)} · {formatDuration(currentLayer.seconds)} ·{' '}
                {formatGrams(currentLayer.grams)}
                {currentLayer.supportGrams > 0 && ` (${currentLayer.supportGrams.toFixed(2)} g destek)`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ölçü bilgisi: yalnızca ekran okuyucular ve hızlı referans için. */}
      <span className="sr-only">
        {dimensions[0].toFixed(1)} × {dimensions[1].toFixed(1)} × {dimensions[2].toFixed(1)} mm,
        en yüksek hız {Math.round(maxSpeed)} mm/s
      </span>
    </div>
  );
}
