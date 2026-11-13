#!/usr/bin/env node
/**
 * Dilimleyici (sidecar) canlı doğrulama betiği
 * ------------------------------------------------------------------
 * `npm run check:slicing`
 *
 * Kapsam:
 *   1. /health ayakta mı
 *   2. Kanonik 20 mm küp gerçekten dilimleniyor mu
 *   3. Dönen gram / süre / katman sayısı beklenen aralıkta mı
 *   4. Dilimleme süresi kabul edilebilir mi (p95 hedefi < 20 s)
 *
 * Bu betik veritabanına YAZMAZ; yalnızca dilimleyiciyi çağırır.
 * Container içinde çalıştırılır: `docker exec axis3-app node scripts/slicing-check.mjs`
 */

const url = (process.env.SLICER_URL || 'http://localhost:8000').replace(/\/+$/, '');
const token = (process.env.SLICER_TOKEN || '').trim();

let failures = 0;

function pass(name, detail = '') {
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  failures += 1;
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

/** 20 mm kenarlı küp, ikili STL (12 üçgen). */
function buildCubeStl(sizeMm = 20) {
  const h = sizeMm / 2;
  const v = [
    [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
    [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
  ];
  const faces = [
    [0, 2, 1], [0, 3, 2],
    [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4],
    [1, 2, 6], [1, 6, 5],
    [2, 3, 7], [2, 7, 6],
    [3, 0, 4], [3, 4, 7],
  ];
  const buf = Buffer.alloc(84 + faces.length * 50);
  buf.write('axis3-check-cube', 0);
  buf.writeUInt32LE(faces.length, 80);
  let offset = 84;
  for (const face of faces) {
    offset += 12; // normal (0,0,0)
    for (const index of face) {
      buf.writeFloatLE(v[index][0], offset); offset += 4;
      buf.writeFloatLE(v[index][1], offset); offset += 4;
      buf.writeFloatLE(v[index][2], offset); offset += 4;
    }
    buf.writeUInt16LE(0, offset); offset += 2;
  }
  return buf;
}

const PROFILE = {
  v: 1,
  engine: 'prusaslicer-2.5.0',
  layerHeight: 0.2,
  infillPercentage: 20,
  printSpeed: 60,
  nozzleMm: 0.4,
  filamentDiameter: 1.75,
  materialType: 'PLA',
  materialDensity: 1.24,
  nozzleTemp: 210,
  bedTemp: 60,
  supportEnabled: false,
};

function headers() {
  return token ? { 'x-slicer-token': token } : {};
}

async function checkHealth() {
  const started = Date.now();
  try {
    const response = await fetch(`${url}/health`, {
      headers: headers(),
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.ok) {
      fail('/health', `status=${response.status} body=${JSON.stringify(body)}`);
      return;
    }
    pass('/health', `${body.engine ?? 'bilinmiyor'} · ${Date.now() - started} ms`);
  } catch (error) {
    fail('/health', error instanceof Error ? error.message : String(error));
  }
}

async function checkSlice() {
  const stl = buildCubeStl(20);
  const form = new FormData();
  form.append('model', new Blob([stl], { type: 'application/octet-stream' }), 'cube-20mm.stl');
  form.append('profile', JSON.stringify(PROFILE));

  const started = Date.now();
  let payload;
  try {
    const response = await fetch(`${url}/slice`, {
      method: 'POST',
      headers: headers(),
      body: form,
      signal: AbortSignal.timeout(220_000),
    });
    const text = await response.text();
    if (!response.ok) {
      fail('POST /slice', `status=${response.status} ${text.slice(0, 300)}`);
      return;
    }
    payload = JSON.parse(text);
  } catch (error) {
    fail('POST /slice', error instanceof Error ? error.message : String(error));
    return;
  }

  const elapsed = Date.now() - started;

  // 20 mm küp, 0.2 mm, %20, PLA: pratikte 4.2–4.8 g / 1000–1300 s aralığında.
  if (typeof payload.grams === 'number' && payload.grams >= 4.2 && payload.grams <= 4.8) {
    pass('gram', `${payload.grams} g`);
  } else {
    fail('gram', `beklenen 4.2–4.8, gelen ${payload.grams}`);
  }

  if (
    typeof payload.printSeconds === 'number' &&
    payload.printSeconds >= 1000 &&
    payload.printSeconds <= 1300
  ) {
    pass('baskı süresi', `${payload.printSeconds} s (${(payload.printSeconds / 3600).toFixed(2)} saat)`);
  } else {
    fail('baskı süresi', `beklenen 1000–1300, gelen ${payload.printSeconds}`);
  }

  if (payload.layerCount === 100) {
    pass('katman sayısı', '100');
  } else {
    fail('katman sayısı', `beklenen 100, gelen ${payload.layerCount}`);
  }

  if (elapsed < 20_000) {
    pass('dilimleme gecikmesi', `${elapsed} ms`);
  } else {
    fail('dilimleme gecikmesi', `${elapsed} ms > 20 s`);
  }
}

async function main() {
  console.log('\nDilimleyici (PrusaSlicer sidecar) kontrolü');
  console.log('─'.repeat(56));
  console.log(`Hedef: ${url}`);

  await checkHealth();
  await checkSlice();

  console.log('─'.repeat(56));
  console.log(failures === 0 ? '✔ TÜM KONTROLLER GEÇTİ\n' : `✖ ${failures} KONTROL BAŞARISIZ\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Kontrol çöktü:', error);
  process.exit(1);
});
