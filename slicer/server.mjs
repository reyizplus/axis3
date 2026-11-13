/**
 * Axis3 dilimleyici sidecar servisi — PrusaSlicer 2.5.0 (Debian headless).
 *
 * Yalnızca iç ağa açıktır (compose `expose`, host portu yok). Next.js uygulaması
 * multipart olarak STL + profil JSON'u gönderir, servis gerçek G-Code üretip
 * başlıktan gram / süre / katman sayısını döner.
 *
 *   GET  /health → { ok, engine, queueDepth, busy }
 *   POST /slice  → { ok, grams, printSeconds, layerCount, filamentMm, durationMs, engine }
 *
 * Hiçbir adımda uydurma sayı üretilmez; ölçülemeyen değer hata olarak döner.
 */
import { spawn } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Busboy from 'busboy';

import { parseGcodeSummary } from './gcode-summary.mjs';

const ENGINE = 'prusaslicer-2.5.0';
const PORT = readPositiveInt('PORT', 8000);

/** Aynı anda çalışabilecek dilimleme sayısı (CPU koruması). */
const MAX_CONCURRENCY = readPositiveInt('SLICER_MAX_CONCURRENCY', 2);

/** Tek dilimleme için üst süre; aşılırsa çocuk süreç SIGKILL ile öldürülür. */
const SLICE_TIMEOUT_MS = readPositiveInt('SLICER_TIMEOUT_MS', 180000);

/** Bekleyen istek üst sınırı; aşılırsa 503 + Retry-After döner. */
const MAX_QUEUE_DEPTH = 20;

/** Kabul edilen en büyük STL boyutu (100 MB). */
const MAX_MODEL_BYTES = readPositiveInt('SLICER_MAX_MODEL_BYTES', 104857600);

/** Paylaşılan gizli anahtar; boşsa kimlik doğrulama kapalıdır (yalnızca yerel geliştirme). */
const TOKEN = process.env.SLICER_TOKEN ?? '';

/** Çalışan ve bekleyen dilimleme sayacı (in-process semafor). */
let activeSlices = 0;
const waitingResolvers = [];

function readPositiveInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;

  return Math.floor(value);
}

/* -------------------------------------------------------------------------- */
/* Semafor                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Sıra beklemek için izin ister. Kuyruk doluysa `null` döner (çağıran 503 verir).
 * Başarılı olduğunda serbest bırakma fonksiyonu döner.
 *
 * @returns {Promise<null | (() => void)>}
 */
function acquireSlot() {
  if (activeSlices < MAX_CONCURRENCY) {
    activeSlices += 1;
    return Promise.resolve(releaseSlot);
  }

  if (waitingResolvers.length >= MAX_QUEUE_DEPTH) return Promise.resolve(null);

  return new Promise((resolve) => {
    waitingResolvers.push(resolve);
  });
}

/** Yuvayı bırakır; sırada bekleyen varsa yuvayı ona devreder (aktif sayı değişmez). */
function releaseSlot() {
  const next = waitingResolvers.shift();
  if (next) {
    next(releaseSlot);
    return;
  }

  activeSlices = Math.max(0, activeSlices - 1);
}

/* -------------------------------------------------------------------------- */
/* Profil doğrulama                                                            */
/* -------------------------------------------------------------------------- */

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Profil nesnesini doğrular. Sayısal alanlar sonlu, fiziksel sınırlar pozitif
 * olmalıdır; aksi halde PrusaSlicer sessizce varsayılana düşer ve fiyat sapar.
 *
 * @param {unknown} profile
 * @returns {string[]} hata mesajları (boş = geçerli)
 */
function validateProfile(profile) {
  if (profile === null || typeof profile !== 'object' || Array.isArray(profile)) {
    return ['profil bir JSON nesnesi olmalı'];
  }

  const errors = [];

  const requirePositive = (key) => {
    const value = profile[key];
    if (!isFiniteNumber(value)) {
      errors.push(`${key} sonlu bir sayı olmalı`);
      return;
    }
    if (value <= 0) errors.push(`${key} 0'dan büyük olmalı`);
  };

  requirePositive('layerHeight');
  requirePositive('printSpeed');
  requirePositive('nozzleMm');
  requirePositive('materialDensity');
  requirePositive('nozzleTemp');
  requirePositive('bedTemp');

  if (!isFiniteNumber(profile.infillPercentage)) {
    errors.push('infillPercentage sonlu bir sayı olmalı');
  } else if (profile.infillPercentage < 0 || profile.infillPercentage > 100) {
    errors.push('infillPercentage 0..100 aralığında olmalı');
  }

  return errors;
}

/* -------------------------------------------------------------------------- */
/* PrusaSlicer argümanları                                                     */
/* -------------------------------------------------------------------------- */

/** Kayan nokta çıktısını okunabilir tutar (0.30000000000000004 gibi artefaktlar olmaz). */
function formatNumber(value) {
  return String(Math.round(value * 1000) / 1000);
}

/**
 * Profil → PrusaSlicer CLI argümanları. Kabuk kullanılmaz, dizi doğrudan spawn'a gider.
 *
 * @param {Record<string, any>} profile
 * @param {string} modelPath
 * @param {string} outPath
 * @returns {string[]}
 */
function buildArgs(profile, modelPath, outPath) {
  const printSpeed = profile.printSpeed;

  const args = [
    '--export-gcode',
    '--layer-height',
    formatNumber(profile.layerHeight),
    '--fill-density',
    `${formatNumber(profile.infillPercentage)}%`,
    '--fill-pattern',
    'grid',
    '--perimeter-speed',
    formatNumber(printSpeed),
    '--infill-speed',
    formatNumber(printSpeed),
    '--solid-infill-speed',
    formatNumber(printSpeed),
    '--external-perimeter-speed',
    formatNumber(printSpeed * 0.5),
    '--nozzle-diameter',
    formatNumber(profile.nozzleMm),
    '--filament-diameter',
    '1.75',
    '--filament-density',
    formatNumber(profile.materialDensity),
    '--temperature',
    formatNumber(profile.nozzleTemp),
    '--bed-temperature',
    formatNumber(profile.bedTemp),
    // 220 x 220 mm yatak; model merkezde kalsın diye köşe koordinatları verilir.
    '--bed-shape',
    '0x0,220x0,220x220,0x220',
    '--skirts',
    '0',
    '--gcode-flavor',
    'marlin2',
  ];

  if (profile.supportEnabled === true) {
    args.push('--support-material', '--support-material-angle', '50');
  }

  args.push('--output', outPath, modelPath);

  return args;
}

/* -------------------------------------------------------------------------- */
/* Çocuk süreç                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * PrusaSlicer'ı çalıştırır; süre aşımında SIGKILL gönderir.
 *
 * @param {string[]} args
 * @param {number} timeoutMs
 * @returns {Promise<{ code: number | null, stderr: string, timedOut: boolean, spawnFailed: boolean }>}
 */
function runPrusaSlicer(args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn('prusa-slicer', args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    });

    let stderr = '';
    let timedOut = false;
    let spawnFailed = false;
    let settled = false;
    let timer = null;

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(payload);
    };

    timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      // Teşhis için yalnızca başı tutulur; yanıt ilk 500 karakteri kullanır.
      if (stderr.length < 8000) stderr += chunk;
    });

    child.on('error', (error) => {
      spawnFailed = true;
      finish({ code: null, stderr: `${stderr}${error.message}`, timedOut, spawnFailed });
    });

    child.on('close', (code, signal) => {
      finish({
        code,
        stderr: stderr || (signal ? `PrusaSlicer ${signal} ile sonlandı` : ''),
        timedOut,
        spawnFailed,
      });
    });
  });
}

/* -------------------------------------------------------------------------- */
/* HTTP yardımcıları                                                           */
/* -------------------------------------------------------------------------- */

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);

  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function tokenMatches(provided) {
  if (TOKEN === '') return true;
  if (typeof provided !== 'string' || provided === '') return false;

  const expected = Buffer.from(TOKEN, 'utf8');
  const actual = Buffer.from(provided, 'utf8');
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
}

class BadRequestError extends Error {}

/**
 * `POST /slice` gövdesini (multipart/form-data) okur.
 * Alanlar: `model` (STL dosyası), `profile` (JSON string).
 *
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<{ model: Buffer, filename: string, profile: unknown }>}
 */
function readMultipart(req) {
  return new Promise((resolve, reject) => {
    let busboy;

    try {
      busboy = Busboy({
        headers: req.headers,
        limits: { files: 1, fields: 10, fileSize: MAX_MODEL_BYTES },
      });
    } catch {
      reject(new BadRequestError('multipart/form-data gövdesi okunamadı'));
      return;
    }

    let model = null;
    let filename = 'model.stl';
    let profileRaw = null;
    let fileTooLarge = false;
    let failed = false;

    const fail = (error) => {
      if (failed) return;
      failed = true;
      reject(error);
    };

    busboy.on('file', (name, file, info) => {
      if (name !== 'model') {
        file.resume();
        return;
      }

      const chunks = [];

      file.on('limit', () => {
        fileTooLarge = true;
      });
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => {
        if (fileTooLarge) return;
        model = Buffer.concat(chunks);
        filename = info?.filename || filename;
      });
      file.on('error', fail);
    });

    busboy.on('field', (name, value) => {
      if (name === 'profile') profileRaw = value;
    });

    busboy.on('error', () => fail(new BadRequestError('multipart gövdesi bozuk')));

    busboy.on('close', () => {
      if (failed) return;

      if (fileTooLarge) {
        fail(new BadRequestError(`model dosyası çok büyük (üst sınır ${MAX_MODEL_BYTES} bayt)`));
        return;
      }
      if (!model || model.length === 0) {
        fail(new BadRequestError('model alanı (STL dosyası) zorunlu'));
        return;
      }
      if (typeof profileRaw !== 'string' || profileRaw.trim() === '') {
        fail(new BadRequestError('profile alanı (JSON) zorunlu'));
        return;
      }

      let profile;
      try {
        profile = JSON.parse(profileRaw);
      } catch {
        fail(new BadRequestError('profile geçerli bir JSON değil'));
        return;
      }

      resolve({ model, filename, profile });
    });

    req.on('aborted', () => fail(new BadRequestError('istek iptal edildi')));
    req.pipe(busboy);
  });
}

/* -------------------------------------------------------------------------- */
/* /slice                                                                      */
/* -------------------------------------------------------------------------- */

async function handleSlice(req, res) {
  if (!tokenMatches(req.headers['x-slicer-token'])) {
    req.resume();
    sendJson(res, 401, {
      ok: false,
      error: 'unauthorized',
      message: 'Geçersiz dilimleyici belirteci',
    });
    return;
  }

  let payload;
  try {
    payload = await readMultipart(req);
  } catch (error) {
    if (error instanceof BadRequestError) {
      sendJson(res, 400, { ok: false, error: 'invalid_request', message: error.message });
      return;
    }

    console.error('[slicer] gövde okunamadı:', error);
    sendJson(res, 400, {
      ok: false,
      error: 'invalid_request',
      message: 'İstek gövdesi okunamadı',
    });
    return;
  }

  const profileErrors = validateProfile(payload.profile);
  if (profileErrors.length > 0) {
    sendJson(res, 400, {
      ok: false,
      error: 'invalid_profile',
      message: 'Dilimleme profili geçersiz',
      details: profileErrors,
    });
    return;
  }

  const release = await acquireSlot();
  if (!release) {
    sendJson(
      res,
      503,
      {
        ok: false,
        error: 'queue_full',
        message: 'Dilimleyici kuyruğu dolu, lütfen tekrar deneyin',
      },
      { 'retry-after': '2' },
    );
    return;
  }

  const startedAt = Date.now();
  let workDir = null;

  try {
    workDir = await mkdtemp(join(tmpdir(), 'axis3-slicer-'));
    const modelPath = join(workDir, 'model.stl');
    const outPath = join(workDir, 'output.gcode');

    await writeFile(modelPath, payload.model);

    const result = await runPrusaSlicer(
      buildArgs(payload.profile, modelPath, outPath),
      SLICE_TIMEOUT_MS,
    );

    if (result.timedOut) {
      sendJson(res, 504, {
        ok: false,
        error: 'slice_timeout',
        message: `Dilimleme ${SLICE_TIMEOUT_MS} ms içinde tamamlanmadı`,
      });
      return;
    }

    if (result.spawnFailed) {
      console.error('[slicer] PrusaSlicer başlatılamadı:', result.stderr);
      sendJson(res, 500, {
        ok: false,
        error: 'engine_unavailable',
        message: 'PrusaSlicer başlatılamadı',
      });
      return;
    }

    if (result.code !== 0) {
      sendJson(res, 422, {
        ok: false,
        error: 'slice_failed',
        message: 'PrusaSlicer dilimlemeyi tamamlayamadı',
        stderr: result.stderr.trim().slice(0, 500),
      });
      return;
    }

    const gcode = await readFile(outPath, 'utf8');
    const summary = parseGcodeSummary(gcode);

    if (!summary || summary.grams === null || summary.printSeconds === null) {
      sendJson(res, 422, {
        ok: false,
        error: 'gcode_unparsable',
        message: 'G-Code başlığından gram veya süre okunamadı',
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      grams: summary.grams,
      printSeconds: summary.printSeconds,
      layerCount: summary.layerCount,
      filamentMm: summary.filamentMm,
      durationMs: Date.now() - startedAt,
      engine: ENGINE,
    });
  } catch (error) {
    console.error('[slicer] dilimleme hatası:', error);
    sendJson(res, 500, {
      ok: false,
      error: 'internal_error',
      message: 'Dilimleme sırasında beklenmeyen hata',
    });
  } finally {
    if (workDir) {
      // Geçici STL ve G-Code her durumda silinir.
      await rm(workDir, { recursive: true, force: true }).catch((error) => {
        console.error('[slicer] geçici dizin silinemedi:', error);
      });
    }
    release();
  }
}

/* -------------------------------------------------------------------------- */
/* Sunucu                                                                      */
/* -------------------------------------------------------------------------- */

const server = createServer((req, res) => {
  const pathname = (req.url ?? '/').split('?')[0];

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      engine: ENGINE,
      queueDepth: waitingResolvers.length,
      busy: activeSlices,
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/slice') {
    handleSlice(req, res).catch((error) => {
      console.error('[slicer] işlenmeyen hata:', error);
      if (!res.headersSent) {
        sendJson(res, 500, { ok: false, error: 'internal_error' });
      }
    });
    return;
  }

  req.resume();
  sendJson(res, 404, { ok: false, error: 'not_found', message: 'Bilinmeyen uç nokta' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `[slicer] ${ENGINE} hazır — port=${PORT} eşzamanlılık=${MAX_CONCURRENCY} zaman aşımı=${SLICE_TIMEOUT_MS}ms`,
  );
});

function shutdown(signal) {
  console.log(`[slicer] ${signal} alındı, kapatılıyor`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
