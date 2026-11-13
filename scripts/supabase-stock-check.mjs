#!/usr/bin/env node
/**
 * Supabase stok/yetki doğrulama betiği
 * ------------------------------------------------------------------
 * Migration 092/093/094 uygulandıktan sonra uzak veritabanını salt-okunur
 * biçimde kontrol eder:
 *   - stock_movements defteri ve order_item_id kolonu
 *   - order_items / store_order_items.stock_restored
 *   - filament_buffer_multiplier ayarı
 *   - is_stock_manager() ve 7 argümanlı stok RPC imzaları
 *   - anon rolünün stok fonksiyonlarını ÇAĞIRAMADIĞI
 *
 * Tek yazma denemesi yoktur: restore çağrısı p_quantity = 0 ile yapılır ve
 * fonksiyon bu durumda hiçbir satıra dokunmadan döner.
 *
 * Kullanım:
 *   npm run check:stock
 */

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const appUrl = (process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, '');

if (!url || !serviceKey || !anonKey) {
  console.error(
    'Eksik ortam değişkeni: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
  process.exit(1);
}

let failures = 0;

function pass(name, detail = '') {
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  failures += 1;
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function rest(path, key = serviceKey) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

const NOOP_RESTORE_ARGS = {
  p_material_id: null,
  p_color: null,
  p_quantity: 0,
  p_nozzle_size_id: null,
  p_technology: 'FDM',
  p_order_id: null,
  p_order_item_id: null,
};

async function callRestore(key) {
  const res = await fetch(`${url}/rest/v1/rpc/restore_inventory_stock`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(NOOP_RESTORE_ARGS),
  });
  return { status: res.status, text: await res.text() };
}

async function main() {
  console.log('\nSupabase stok/yetki kontrolü');
  console.log('─'.repeat(56));

  // 1. Ledger table + columns
  {
    const { status, body } = await rest(
      'stock_movements?select=id,order_id,order_item_id,item_type,item_id,quantity_delta,restored_quantity&limit=1'
    );
    if (status === 200) pass('stock_movements tablosu ve kolonları');
    else fail('stock_movements tablosu', `status=${status} ${JSON.stringify(body).slice(0, 160)}`);
  }

  // 2. Per-item restore flags
  for (const table of ['order_items', 'store_order_items']) {
    const { status, body } = await rest(`${table}?select=id,stock_restored&limit=1`);
    if (status === 200) pass(`${table}.stock_restored kolonu`);
    else fail(`${table}.stock_restored kolonu`, `status=${status} ${JSON.stringify(body).slice(0, 160)}`);
  }

  // 3. Pricing buffer setting
  {
    const { status, body } = await rest(
      'global_settings?select=key,value&key=eq.filament_buffer_multiplier'
    );
    if (status === 200 && Array.isArray(body) && body.length === 1) {
      pass('filament_buffer_multiplier ayarı', JSON.stringify(body[0].value));
    } else {
      fail('filament_buffer_multiplier ayarı', `status=${status} rows=${Array.isArray(body) ? body.length : 'n/a'}`);
    }
  }

  // 4. Helper must be TRUE for service_role and never NULL
  {
    const { status, body } = await rest('rpc/is_stock_manager');
    if (status === 200 && body === true) pass('is_stock_manager() servis rolünde true');
    else fail('is_stock_manager() servis rolü', `status=${status} body=${JSON.stringify(body)}`);
  }

  // 5. New 7-argument signature exists (no-op call)
  {
    const { status, text } = await callRestore(serviceKey);
    if (status === 200) pass('restore_inventory_stock 7 argümanlı imza', text.slice(0, 100));
    else fail('restore_inventory_stock 7 argümanlı imza', `status=${status} ${text.slice(0, 160)}`);
  }

  // 6. anon must NOT be able to execute stock functions
  {
    const { status, text } = await callRestore(anonKey);
    if (status >= 400) pass('anon stok fonksiyonuna erişemiyor', `status=${status}`);
    else fail('GÜVENLİK: anon stok fonksiyonunu çağırabiliyor!', `status=${status} ${text.slice(0, 120)}`);
  }

  // 7. Running app health (optional, only if reachable)
  {
    try {
      const res = await fetch(`${appUrl}/api/health`);
      const text = await res.text();
      if (res.status === 200) pass('Uygulama /api/health', text.slice(0, 100));
      else fail('Uygulama /api/health', `status=${res.status}`);
    } catch {
      console.log('SKIP  Uygulama /api/health (erişilemedi)');
    }
  }

  console.log('─'.repeat(56));
  console.log(failures === 0 ? '✔ TÜM KONTROLLER GEÇTİ\n' : `✖ ${failures} KONTROL BAŞARISIZ\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Kontrol çöktü:', err);
  process.exit(1);
});
