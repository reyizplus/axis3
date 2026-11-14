'use client';

/**
 * G-Code Takım Yolu Görüntüleyici
 *
 * Bambu Studio / PrusaSlicer önizlemesinin web karşılığı: gerçek dilimleyici
 * çıktısındaki her çizgi bir G0/G1 hareketidir. Dış/iç duvarlar, dolgu, üst
 * yüzey, köprü, **destek gövdesi ve destek arayüzü** ayrı renklerde gösterilir;
 * katman kaydırıcısı, oynatma, tür filtreleri, hız renklendirmesi ve dilimleme
 * ayarları paneli vardır.
 *
 * Çizim tek bir `LineSegments` çağrısıdır. Konumlar Int16 normalize olarak
 * saklanır ve vertex shader'da gerçek mm'ye çözülür; katman/tür filtresi de
 * shader'da yapılır (CPU'da yeniden tampon üretilmez). 250 bin+ segment akıcı
 * kalır.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  Pause,
  Play,
  Settings2,
  Timer,
  Weight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GcodePreviewData } from '@/lib/preview/format';

interface GcodePreviewViewerProps {
  data: GcodePreviewData;
  className?: string;
}

/** Tür sayısı shader'daki sabit dizi uzunluğuyla aynı olmalı. */
const MAX_TYPES = 16;

const CONFIG_LABELS: Record<string, string> = {
  layer_height: 'Katman yüksekliği',
  first_layer_height: 'İlk katman',
  perimeters: 'Duvar sayısı',
  top_solid_layers: 'Üst katı katman',
  bottom_solid_layers: 'Alt katı katman',
  fill_density: 'Doluluk',
  fill_pattern: 'Dolgu deseni',
  nozzle_diameter: 'Nozul çapı',
  filament_type: 'Filament',
  filament_density: 'Yoğunluk',
  temperature: 'Nozul sıcaklığı',
  first_layer_temperature: 'İlk katman sıcaklığı',
  bed_temperature: 'Tabla sıcaklığı',
  first_layer_bed_temperature: 'İlk katman tabla',
  perimeter_speed: 'Duvar hızı',
  external_perimeter_speed: 'Dış duvar hızı',
  infill_speed: 'Dolgu hızı',
  solid_infill_speed: 'Katı dolgu hızı',
  travel_speed: 'Seyahat hızı',
  max_volumetric_speed: 'Maks. hacimsel hız',
  support_material: 'Destek',
  support_material_angle: 'Destek açısı',
  support_material_threshold: 'Destek eşiği',
  printer_model: 'Yazıcı',
  printer_variant: 'Varyant',
};

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) return `${hours} sa ${minutes} dk`;
  if (minutes > 0) return `${minutes} dk ${secs} sn`;
  return `${secs} sn`;
}

function formatGrams(value: number): string {
  return `${value.toFixed(2)} g`;
}

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

export function GcodePreviewViewer({ data, className }: GcodePreviewViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef = useRef<(() => void) | null>(null);

  const totalLayers = data.meta.layers.length;
  /** Oynatma döngüsü katman değerini render beklemeden okur. */
  const layerRef = useRef(totalLayers);

  const [visibleTypes, setVisibleTypes] = useState<boolean[]>(() =>
    data.meta.types.map((type) => type.visible)
  );
  const [colorMode, setColorMode] = useState<'type' | 'speed'>('type');
  const [layer, setLayer] = useState(totalLayers);
  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState<'types' | 'config' | null>('types');

  const maxSpeed = useMemo(() => {
    let max = 0;
    for (let i = 0; i < data.speeds.length; i += 1) {
      const value = data.speeds[i] / 10;
      if (value > max) max = value;
    }
    return Math.max(1, max);
  }, [data]);

  const currentLayer = layer >= 1 ? data.meta.layers[Math.min(totalLayers - 1, layer - 1)] : null;

  const dimensions = useMemo(() => {
    const { min, max } = data.meta.printBounds;
    return [max[0] - min[0], max[1] - min[1], max[2] - min[2]] as const;
  }, [data]);

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

    const visibility = new Float32Array(MAX_TYPES);
    for (let i = 0; i < MAX_TYPES; i += 1) {
      visibility[i] = i < typeCount && meta.types[i].visible ? 1 : 0;
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
        uMaxSpeed: { value: maxSpeed },
        uColorMode: { value: 0 },
        uAlpha: { value: 1 },
      },
    });

    materialRef.current = material;

    const segments = new THREE.LineSegments(geometry, material);
    segments.frustumCulled = false;

    const scene = new THREE.Scene();
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

    // Tabla: koyu arka plandan ayrışan bir yüzey + ızgara. Izgara çizgileri
    // koyu kalırsa tabla kaybolur; bu yüzden yüzey ve çizgiler bilinçli olarak
    // arka plandan daha açık tonlarda.
    const bedSize = Math.max(220, width * 1.4, depth * 1.4);
    const divisions = Math.max(10, Math.round(bedSize / 20));

    const bedSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(bedSize, bedSize),
      new THREE.MeshBasicMaterial({ color: 0x1f2f40 })
    );
    // Izgaranın altında kalmasın diye çok hafif aşağıda; çizgiler yüzeyde.
    bedSurface.position.set(center.x, center.y, -0.08);
    scene.add(bedSurface);

    const grid = new THREE.GridHelper(bedSize, divisions, 0x7fa0c0, 0x44607c);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(center.x, center.y, 0);
    scene.add(grid);

    // Tabla kenarı: belirgin bir çerçeve, ölçek hissi için.
    const plate = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(center.x - bedSize / 2, center.y - bedSize / 2, 0),
        new THREE.Vector3(center.x + bedSize / 2, center.y - bedSize / 2, 0),
        new THREE.Vector3(center.x + bedSize / 2, center.y + bedSize / 2, 0),
        new THREE.Vector3(center.x - bedSize / 2, center.y + bedSize / 2, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0xaec8e0 })
    );
    scene.add(plate);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setClearColor(0x0e1723, 1);

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
      controlsRef.current = null;
      cameraRef.current = null;
      frameRef.current = null;
    };
    // Veri değişirse sahne tamamen yeniden kurulur.
  }, [data, maxSpeed, totalLayers]);

  /* ---------------------------------------------------------------------- */
  /* Kontroller → shader                                                     */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;

    material.uniforms.uLayerMax.value = layer - 1;
    material.uniforms.uColorMode.value = colorMode === 'speed' ? 1 : 0;

    const flags = material.uniforms.uTypeVisible.value as Float32Array;
    for (let i = 0; i < MAX_TYPES; i += 1) {
      flags[i] = visibleTypes[i] ? 1 : 0;
    }
  }, [layer, colorMode, visibleTypes]);

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

  const toggleType = useCallback((index: number) => {
    setVisibleTypes((previous) => previous.map((value, i) => (i === index ? !value : value)));
  }, []);

  const allVisible = visibleTypes.every(Boolean);
  const toggleAll = () => {
    const next = !allVisible;
    setVisibleTypes((previous) => previous.map(() => next));
  };

  const supportIndex = data.meta.types.findIndex((type) => type.id === 'support');
  const supportInterfaceIndex = data.meta.types.findIndex(
    (type) => type.id === 'support_interface'
  );
  const supportVisible =
    (supportIndex < 0 || visibleTypes[supportIndex]) &&
    (supportInterfaceIndex < 0 || visibleTypes[supportInterfaceIndex]);

  const toggleSupport = () => {
    const next = !supportVisible;
    setVisibleTypes((previous) =>
      previous.map((value, i) =>
        i === supportIndex || i === supportInterfaceIndex ? next : value
      )
    );
  };

  const travelIndex = data.meta.types.findIndex((type) => type.id === 'travel');
  const travelVisible = travelIndex >= 0 ? visibleTypes[travelIndex] : false;
  const toggleTravel = () => {
    if (travelIndex < 0) return;
    toggleType(travelIndex);
  };

  const stats = data.meta.stats;
  const configEntries = Object.entries(data.meta.config).filter(([key]) => key in CONFIG_LABELS);

  return (
    <div className={cn('relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl bg-[#0e1723]', className)}>
      <div ref={mountRef} className="relative min-h-0 flex-1" />

      {/* Sol üst: baskı istatistikleri */}
      <div className="pointer-events-none absolute left-2 top-2 max-w-[240px] space-y-1.5 rounded-lg border border-white/10 bg-black/55 p-2.5 text-[11px] text-slate-200 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          <Layers className="h-3 w-3" /> Dilimleyici önizlemesi
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Weight className="h-3 w-3 text-sky-400" />
            <span className="font-semibold text-white">{formatGrams(stats.grams)}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3 w-3 text-emerald-400" />
            <span className="font-semibold text-white">{formatDuration(stats.printSeconds)}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-slate-400">
          <span>{stats.layerCount} nesne katmanı</span>
          <span>{stats.supportGrams > 0 ? formatGrams(stats.supportGrams) + ' destek' : 'destek yok'}</span>
          <span>{(stats.filamentMm / 1000).toFixed(2)} m filaman</span>
          <span>
            {dimensions[0].toFixed(1)} × {dimensions[1].toFixed(1)} × {dimensions[2].toFixed(1)} mm
          </span>
          {data.meta.droppedSegments > 0 && (
            <span className="text-amber-400">
              {data.meta.droppedSegments} segment kırpıldı
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-500">
          {data.meta.segmentCount > 0 &&
            `${data.meta.segmentCount.toLocaleString('tr-TR')} hareket`}
        </div>
      </div>

      {/* Sağ üst: hızlı kontroller */}
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className="flex overflow-hidden rounded-md border border-white/10 bg-black/55 text-[10px] backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setColorMode('type')}
              className={cn(
                'px-2 py-1 transition-colors',
                colorMode === 'type' ? 'bg-primary/80 text-white' : 'text-slate-300 hover:bg-white/10'
              )}
            >
              Tür
            </button>
            <button
              type="button"
              onClick={() => setColorMode('speed')}
              className={cn(
                'px-2 py-1 transition-colors',
                colorMode === 'speed' ? 'bg-primary/80 text-white' : 'text-slate-300 hover:bg-white/10'
              )}
            >
              Hız
            </button>
          </div>
          <button
            type="button"
            onClick={() => frameRef.current?.()}
            className="rounded-md border border-white/10 bg-black/55 p-1.5 text-slate-200 backdrop-blur-sm transition-colors hover:bg-white/10"
            title="Görünümü sıfırla"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === 'types' ? null : 'types')}
            className={cn(
              'rounded-md border border-white/10 p-1.5 backdrop-blur-sm transition-colors',
              panel === 'types' ? 'bg-primary/80 text-white' : 'bg-black/55 text-slate-200 hover:bg-white/10'
            )}
            title="Takım yolu türleri"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === 'config' ? null : 'config')}
            className={cn(
              'rounded-md border border-white/10 p-1.5 backdrop-blur-sm transition-colors',
              panel === 'config' ? 'bg-primary/80 text-white' : 'bg-black/55 text-slate-200 hover:bg-white/10'
            )}
            title="Dilimleme ayarları"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {colorMode === 'speed' && (
          <div className="w-40 rounded-md border border-white/10 bg-black/55 p-1.5 text-[9px] text-slate-300 backdrop-blur-sm">
            <div className="h-1.5 w-full rounded-full bg-[linear-gradient(90deg,#3b82f6,#22c55e,#f97316,#ef4444)]" />
            <div className="mt-0.5 flex justify-between text-slate-400">
              <span>yavaş</span>
              <span>{Math.round(maxSpeed)} mm/s</span>
            </div>
          </div>
        )}

        {/* Tür / ayar paneli */}
        {panel && (
          <div className="max-h-[55vh] w-64 overflow-y-auto rounded-lg border border-white/10 bg-black/70 p-2.5 text-[11px] text-slate-200 backdrop-blur-md">
            {panel === 'types' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Takım yolları
                  </span>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {allVisible ? 'Tümünü gizle' : 'Tümünü göster'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={toggleSupport}
                    className={cn(
                      'rounded border px-1.5 py-0.5 text-[10px] transition-colors',
                      supportVisible
                        ? 'border-cyan-400/40 bg-cyan-500/20 text-cyan-200'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    )}
                  >
                    Destek yapıları
                  </button>
                  <button
                    type="button"
                    onClick={toggleTravel}
                    className={cn(
                      'rounded border px-1.5 py-0.5 text-[10px] transition-colors',
                      travelVisible
                        ? 'border-slate-400/40 bg-slate-500/20 text-slate-200'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    )}
                  >
                    Seyahat
                  </button>
                </div>

                <div className="space-y-1">
                  {data.meta.types.map((type, index) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleType(index)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-white/10',
                        visibleTypes[index] ? 'opacity-100' : 'opacity-45'
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="min-w-0 flex-1 truncate">{type.label}</span>
                      <span className="shrink-0 tabular-nums text-slate-400">
                        {type.grams > 0 ? `${type.grams.toFixed(2)} g` : '—'}
                      </span>
                      <span className="w-14 shrink-0 text-right tabular-nums text-slate-500">
                        {type.seconds > 0 ? formatDuration(type.seconds) : ''}
                      </span>
                      {visibleTypes[index] ? (
                        <Eye className="h-3 w-3 shrink-0 text-slate-400" />
                      ) : (
                        <EyeOff className="h-3 w-3 shrink-0 text-slate-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Dilimleme ayarları
                </div>
                {configEntries.length === 0 && (
                  <p className="text-slate-400">Bu G-Code ayar bloğu içermiyor.</p>
                )}
                {configEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="text-slate-400">{CONFIG_LABELS[key] ?? key}</span>
                    <span className="max-w-[110px] truncate text-right font-medium text-slate-100">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alt: katman kaydırıcısı */}
      <div className="border-t border-white/10 bg-black/60 px-2.5 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 shrink-0 p-0 text-slate-200 hover:bg-white/10 hover:text-white"
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
            className="h-7 w-7 shrink-0 p-0 text-slate-200 hover:bg-white/10 hover:text-white"
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
            className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-primary"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${
                ((layer - 1) / Math.max(1, totalLayers - 1)) * 100
              }%, rgba(255,255,255,0.15) ${
                ((layer - 1) / Math.max(1, totalLayers - 1)) * 100
              }%, rgba(255,255,255,0.15) 100%)`,
            }}
          />

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 shrink-0 p-0 text-slate-200 hover:bg-white/10 hover:text-white"
            onClick={() => setLayer((value) => Math.min(totalLayers, value + 1))}
            title="Sonraki katman"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          <div className="shrink-0 text-[10px] tabular-nums text-slate-300">
            <span className="font-semibold text-white">
              {layer}/{totalLayers}
            </span>
            {currentLayer && (
              <span className="ml-1.5 text-slate-400">
                Z {currentLayer.z.toFixed(2)} · {formatDuration(currentLayer.seconds)} ·{' '}
                {formatGrams(currentLayer.grams)}
                {currentLayer.supportGrams > 0 && ` (${currentLayer.supportGrams.toFixed(2)} g destek)`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
