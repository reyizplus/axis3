/**
 * Order Creation Service (server-only)
 *
 * The checkout page used to compute prices in the browser and insert orders
 * with the public anon client. That meant a user could rewrite `total_amount`
 * in the request payload and pay an arbitrary amount.
 *
 * This service is now the single source of truth:
 * - every unit price is recomputed from DB data (materials, products, settings)
 * - the order total is recalculated server-side
 * - stock is deducted only AFTER the order is persisted, and rolled back if
 *   any deduction fails
 */

import { randomBytes, randomUUID } from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PricingEngine, isSlicingEnabled } from '@/lib/pricing';
import { normalizeVatRate } from '@/lib/pricing/core';
import type { PriceBreakdown as EngineBreakdown } from '@/lib/pricing/types';
import { calculateOrderTotals, hasPriceDrift } from '@/lib/services/order-totals';
import { isMissingFunctionError } from '@/lib/supabase/errors';
import { getCachedAnalysis, saveAnalysis } from '@/lib/pricing/server/analysis-cache';
import {
  resolveSliceSelection,
  speedMultiplierFromTimeMultiplier,
} from '@/lib/pricing/server/resolve-slice-selection';
import { profileHash, type SliceProfileV1 } from '@/lib/pricing/server/slicer-profile';
import { sliceModel } from '@/lib/pricing/server/slicer-client';

export interface OrderItemInput {
  fileId: string;
  materialId: string;
  quantity: number;
  color?: string | null;
  nozzleSizeId?: string | null;
  nozzleSizeMm?: number | null;
  printSettingId?: string | null;
  printSettingName?: string | null;
  isPreorder?: boolean;
  preorderDiscountPercent?: number | null;
  estimatedRestockDays?: number | null;
  customLayerHeight?: number | null;
  customInfillPercentage?: number | null;
  customTimeMultiplier?: number | null;
  customLayerThickness?: number | null;
  customExposureTime?: number | null;
}

export interface StoreItemInput {
  productId: string;
  quantity: number;
}

export interface ShippingAddressInput {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  street: string;
  buildingNo: string;
  apartmentNo?: string;
  zipCode?: string;
  notes?: string;
}

export interface CreateOrderInput {
  items: OrderItemInput[];
  storeItems: StoreItemInput[];
  address: ShippingAddressInput;
  paymentMethod: string;
  deliveryNotes?: string;
  /** Amount the user saw in the UI. Used only to detect a price drift, never to price the order. */
  expectedTotal?: number;
}

export interface CreatedOrder {
  id: string;
  orderNumber: string;
  subtotal: number;
  shipping: number;
  vat: number;
  total: number;
  itemCount: number;
}

export class OrderCreationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'OrderCreationError';
    this.status = status;
  }
}

const MAX_QUANTITY = 1000;

function round(value: number, precision = 2): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `AXS-${ts}-${rand}`;
}

function toLegacyBreakdown(b: EngineBreakdown) {
  return {
    materialCost: b.material.subtotal,
    machineAmortizationCost: b.machineAmortization.subtotal,
    electricityCost: b.electricity.subtotal,
    laborCost: b.labor.subtotal,
    riskPremium: b.riskPremium.subtotal,
    serviceFee: b.serviceFee,
    profitMargin: b.profitMargin.subtotal,
    subtotal: b.subtotal,
    vatRate: b.vatRate,
    vatAmount: b.vatAmount,
    totalBeforeVat: b.totalBeforeVat,
    total: b.totalWithVat,
    pricePerUnit: b.pricePerUnit,
    quantityDiscount: b.quantityDiscount,
    preorderDiscount: b.preorderDiscount,
    directCost: b.directCost,
    discountCapped: b.discountCapped,
  };
}

interface ResolvedItem {
  /** Pre-generated so the stock ledger can reference this exact line. */
  id: string;
  fileId: string;
  filename: string;
  materialId: string;
  materialName: string;
  technology: 'FDM' | 'SLA';
  quantity: number;
  volumeCm3: number;
  unitPrice: number;
  totalPrice: number;
  estimatedHours: number;
  totalEstimatedHours: number;
  color: string;
  nozzleSizeId: string | null;
  nozzleSizeMm: number | null;
  printSettingId: string | null;
  printSettingName: string | null;
  isPreorder: boolean;
  preorderDiscountPercent: number | null;
  estimatedRestockDays: number | null;
  customLayerHeight: number | null;
  customInfillPercentage: number | null;
  customTimeMultiplier: number | null;
  customLayerThickness: number | null;
  customExposureTime: number | null;
  priceBreakdown: ReturnType<typeof toLegacyBreakdown>;
}

interface ResolvedStoreItem {
  productId: string;
  name: string;
  slug: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

type Rollback =
  | { type: 'store'; productId: string; quantity: number }
  | { type: 'inventory'; orderItemId: string; materialId: string; color: string; quantity: number; nozzleSizeId: string | null; technology: 'FDM' | 'SLA' };

async function rollbackStock(
  supabase: ReturnType<typeof createServiceClient>,
  applied: Rollback[],
  orderId: string
): Promise<boolean> {
  let ok = true;

  for (const entry of applied.reverse()) {
    try {
      if (entry.type === 'store') {
        const { error } = await (supabase.rpc as any)('increment_store_product_stock', {
          p_product_id: entry.productId,
          p_quantity: entry.quantity,
        });
        if (error) throw error;
      } else {
        let { error } = await (supabase.rpc as any)('restore_inventory_stock', {
          p_material_id: entry.materialId,
          p_color: entry.color,
          p_quantity: entry.quantity,
          p_nozzle_size_id: entry.nozzleSizeId,
          p_technology: entry.technology,
          p_order_id: orderId,
          p_order_item_id: entry.orderItemId,
        });

        // Migration 093 not applied yet: retry with the legacy signature.
        if (error && isMissingFunctionError(error, 'restore_inventory_stock')) {
          ({ error } = await (supabase.rpc as any)('restore_inventory_stock', {
            p_material_id: entry.materialId,
            p_color: entry.color,
            p_quantity: entry.quantity,
            p_nozzle_size_id: entry.nozzleSizeId,
            p_technology: entry.technology,
          }));
        }

        if (error) throw error;
      }
    } catch (err) {
      // Never let a rollback failure hide the original error. Keep the order
      // row (and therefore the stock ledger) so the restore can be retried.
      ok = false;
      console.error('[OrderCreation] Stock rollback failed:', entry, err);
    }
  }

  return ok;
}

async function loadSettings(supabase: ReturnType<typeof createServiceClient>) {
  const { data } = await (supabase.from('global_settings') as any)
    .select('key, value')
    .in('key', [
      'vat_rate',
      'shipping_settings',
      'min_order_amount',
      'preorder_enabled',
      'default_preorder_discount_percent',
    ]);

  const map: Record<string, any> = {};
  for (const row of (data || []) as { key: string; value: any }[]) {
    map[row.key] = row.value;
  }

  const vatRate = typeof map.vat_rate?.value === 'number'
    ? normalizeVatRate(map.vat_rate.value)
    : 0.2;
  const shippingFee = Number(map.shipping_settings?.shippingFee ?? 0);
  const freeShippingMinAmount = Number(map.shipping_settings?.freeShippingMinAmount ?? 0);
  const minOrderAmount = Number(map.min_order_amount?.value ?? 0);
  const preorderEnabled = map.preorder_enabled?.value !== false;
  const defaultPreorderDiscount = Number(map.default_preorder_discount_percent?.value ?? 0);

  return {
    vatRate,
    shippingFee,
    freeShippingMinAmount,
    minOrderAmount,
    preorderEnabled,
    defaultPreorderDiscount,
  };
}

const CUSTOM_INFILL_MIN = 5;
const CUSTOM_INFILL_MAX = 100;
const CUSTOM_TIME_MULTIPLIER_MIN = 0.5;
const CUSTOM_TIME_MULTIPLIER_MAX = 2;

function normalizeColor(color: string | null | undefined): string {
  return String(color || '').trim().toLocaleLowerCase('tr-TR');
}

function assertRange(value: number, min: number, max: number, label: string) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new OrderCreationError(
      `${label} geçersiz. İzin verilen aralık: ${min} - ${max}.`,
      400
    );
  }
}

/**
 * Resolve the print quality server-side. When a `print_setting_id` is sent the
 * values come from the database; custom values are clamped to the same ranges
 * the UI offers. A client can never send an arbitrary time multiplier that
 * would collapse the price.
 */
async function resolvePrintSettings(
  supabase: ReturnType<typeof createServiceClient>,
  item: OrderItemInput,
  technology: 'FDM' | 'SLA'
): Promise<{ timeMultiplier: number; infillPercentage: number; printSettingId: string | null; printSettingName: string | null }> {
  const isCustom = !item.printSettingId || item.printSettingId === 'custom';

  if (isCustom) {
    const timeMultiplier = item.customTimeMultiplier ?? 1;
    assertRange(
      timeMultiplier,
      CUSTOM_TIME_MULTIPLIER_MIN,
      CUSTOM_TIME_MULTIPLIER_MAX,
      'Baskı hızı çarpanı'
    );

    const infillPercentage =
      technology === 'SLA' ? 100 : (item.customInfillPercentage ?? 20);
    if (technology !== 'SLA') {
      assertRange(infillPercentage, CUSTOM_INFILL_MIN, CUSTOM_INFILL_MAX, 'Doluluk oranı');
    }

    return {
      timeMultiplier,
      infillPercentage,
      printSettingId: null,
      printSettingName: item.printSettingName?.trim() || 'Özel',
    };
  }

  const { data: printSetting } = await (supabase.from('print_settings') as any)
    .select('id, name, technology, time_multiplier, infill_percentage, is_active')
    .eq('id', item.printSettingId)
    .maybeSingle();

  if (!printSetting || printSetting.is_active === false) {
    throw new OrderCreationError('Seçilen baskı kalitesi artık mevcut değil', 400);
  }
  if (printSetting.technology !== technology) {
    throw new OrderCreationError('Seçilen baskı kalitesi bu malzeme ile uyumlu değil', 400);
  }

  return {
    timeMultiplier: Number(printSetting.time_multiplier ?? 1),
    infillPercentage:
      technology === 'SLA' ? 100 : Number(printSetting.infill_percentage ?? 20),
    printSettingId: printSetting.id,
    printSettingName: printSetting.name ?? item.printSettingName ?? null,
  };
}

/**
 * Resolve preorder state from inventory. The discount is never taken from the
 * client; it comes from the inventory row, the material or the global default.
 */
async function resolvePreorder(
  supabase: ReturnType<typeof createServiceClient>,
  params: {
    material: {
      id: string;
      technology: 'FDM' | 'SLA';
      preorder_allowed?: boolean | null;
      preorder_discount_percent?: number | null;
    };
    color: string | null;
    quantity: number;
    preorderEnabled: boolean;
    defaultDiscount: number;
  }
): Promise<{ isPreorder: boolean; discountPercent: number | null; restockDays: number | null }> {
  const inventoryType = params.material.technology === 'SLA' ? 'resin' : 'filament';

  const { data: inventory } = await (supabase.from('inventory_items') as any)
    .select('color, quantity_on_hand, allow_preorder, preorder_discount_percent, estimated_restock_days')
    .eq('material_id', params.material.id)
    .eq('type', inventoryType)
    .eq('is_active', true);

  const rows = (inventory || []) as {
    color: string | null;
    quantity_on_hand: number;
    allow_preorder: boolean | null;
    preorder_discount_percent: number | null;
    estimated_restock_days: number | null;
  }[];

  const requestedColor = normalizeColor(params.color);
  const colorRows = requestedColor
    ? rows.filter((row) => normalizeColor(row.color) === requestedColor)
    : [];
  const hasColorRows = colorRows.length > 0;
  const relevantRows = hasColorRows ? colorRows : rows;

  const stock = relevantRows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.quantity_on_hand) || 0),
    0
  );

  if (stock >= params.quantity) {
    return { isPreorder: false, discountPercent: null, restockDays: null };
  }

  // Row discount > material discount > global default. `Number(null)` is 0,
  // so use an explicit finite-number check to avoid turning "not set" into 0.
  const firstFinite = (values: (number | null | undefined)[]): number | null => {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return null;
  };

  const discount =
    firstFinite(relevantRows.map((row) => row.preorder_discount_percent)) ??
    firstFinite([params.material.preorder_discount_percent]) ??
    params.defaultDiscount;

  const allowed =
    params.material.preorder_allowed === true ||
    relevantRows.some((row) => row.allow_preorder === true);

  if (!params.preorderEnabled || !allowed) {
    throw new OrderCreationError(
      `"${params.material.id}" için yeterli stok yok ve ön sipariş kapalı.`,
      409
    );
  }

  const restockDays = relevantRows
    .map((row) => Number(row.estimated_restock_days))
    .find((value) => Number.isFinite(value) && value > 0);

  return {
    isPreorder: true,
    discountPercent: Math.min(100, Math.max(0, Number.isFinite(discount) ? discount : 0)),
    restockDays: restockDays ? Math.floor(restockDays) : 14,
  };
}

/**
 * Sipariş fiyatı için gerçek dilimleme sonucunu garanti eder.
 *
 * Önbellekte (file_id, profile_hash) varsa hiçbir şey yapmaz. Yoksa STL'i
 * indirir, dilimler ve önbelleğe yazar. Başarısızlıkta sipariş oluşturulmaz:
 * tahmini fiyatla tahsilat yapmak bu işin çözmeye çalıştığı hatanın ta kendisi.
 */
async function ensureSlicedAnalysis(
  service: ReturnType<typeof createServiceClient>,
  params: {
    fileId: string;
    storagePath: string | null;
    filename: string | null;
    profile: SliceProfileV1;
    hash: string;
  }
): Promise<void> {
  const cached = await getCachedAnalysis(service as any, params.fileId, params.hash);
  if (cached) return;

  if (!params.storagePath) {
    throw new OrderCreationError('Model dosyası depoda bulunamadı', 409);
  }

  const { data, error } = await service.storage
    .from('stl-files')
    .download(params.storagePath);

  if (error || !data) {
    throw new OrderCreationError(
      'Fiyat doğrulanamadı (model dosyası okunamadı). Lütfen tekrar deneyin.',
      503
    );
  }

  let stats;
  try {
    stats = await sliceModel(
      Buffer.from(await data.arrayBuffer()),
      params.filename || `${params.fileId}.stl`,
      params.profile
    );
  } catch (error) {
    console.error('[orders] dilimleme başarısız', error);
    throw new OrderCreationError(
      'Fiyat doğrulanamadı, lütfen birkaç saniye sonra tekrar deneyin.',
      503
    );
  }

  await saveAnalysis(service as any, {
    fileId: params.fileId,
    profileHash: params.hash,
    profileJson: params.profile,
    stats,
  });
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const { items, storeItems } = input;

  if (!items.length && !storeItems.length) {
    throw new OrderCreationError('Sepetiniz boş', 400);
  }

  const authClient = await createClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    throw new OrderCreationError('Oturum süreniz dolmuş', 401);
  }

  const supabase = createServiceClient();
  const settings = await loadSettings(supabase);

  const resolvedItems: ResolvedItem[] = [];
  const resolvedStoreItems: ResolvedStoreItem[] = [];
  const engine = new PricingEngine(supabase);

  // ---------- 3D print items ----------
  for (const item of items) {
    const quantity = Math.floor(Number(item.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new OrderCreationError('Geçersiz ürün adedi', 400);
    }

    const { data: file } = await (supabase.from('files') as any)
      .select('id, filename, volume_cm3, user_id, deleted_at, storage_path')
      .eq('id', item.fileId)
      .maybeSingle();

    if (!file || file.deleted_at) {
      throw new OrderCreationError('Model dosyası bulunamadı', 404);
    }
    if (file.user_id !== user.id) {
      throw new OrderCreationError('Bu dosya hesabınıza ait değil', 403);
    }
    const volumeCm3 = Number(file.volume_cm3);
    if (!Number.isFinite(volumeCm3) || volumeCm3 <= 0) {
      throw new OrderCreationError('Model hacmi hesaplanmamış. Lütfen dosyayı yeniden yükleyin.', 400);
    }

    const { data: material } = await (supabase.from('materials') as any)
      .select('id, name, technology, is_active, preorder_allowed, preorder_discount_percent')
      .eq('id', item.materialId)
      .maybeSingle();

    if (!material || !material.is_active) {
      throw new OrderCreationError('Seçilen malzeme artık mevcut değil', 400);
    }

    const technology: 'FDM' | 'SLA' = material.technology === 'SLA' ? 'SLA' : 'FDM';
    const machineType = technology === 'SLA' ? 'SLA_STANDARD' : 'FDM_STANDARD';

    // Quality settings and custom values are resolved/validated server-side.
    const printSettings = await resolvePrintSettings(supabase, item, technology);

    // Dilimleme profili, önizlemedeki ile AYNI çözümleyiciden geçer. İki taraf
    // farklı varsayılan kullanırsa profil hash'i ayrışır, önbellek ıskalar ve
    // sunucu hacim tahminine düşerken müşteri gerçek dilimleme fiyatı görür.
    let sliceSelection;
    try {
      sliceSelection = await resolveSliceSelection(supabase, {
        materialId: material.id,
        printSettingId: item.printSettingId ?? null,
        nozzleSizeMm: item.nozzleSizeMm ?? null,
        custom: {
          layerHeight: item.customLayerHeight ?? null,
          infillPercentage: item.customInfillPercentage ?? null,
          // İstemci hız çarpanını `customTimeMultiplier = 1 / hız` olarak
          // gönderiyor; dilimleyici mm/s beklediği için geri çeviriyoruz.
          speedMultiplier: speedMultiplierFromTimeMultiplier(item.customTimeMultiplier),
          supportEnabled: true,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Dilimleme seçimleri geçersiz';
      throw new OrderCreationError(message, 400);
    }

    const slicerProfileHash = sliceSelection.profile
      ? profileHash(sliceSelection.profile)
      : undefined;

    // K1: dilimleme zorunlu. Varsayılan olarak AÇIK; yalnızca açıkça
    // PRICING_REQUIRE_SLICING=false verilirse tahmini fiyata izin verilir.
    const requireSlicing =
      isSlicingEnabled() && process.env.PRICING_REQUIRE_SLICING !== 'false';

    // FDM'de fiyatın tek kaynağı gerçek dilimlemedir, bu yüzden profil varsa
    // dilimleme her zaman yapılır. `requireSlicing=false` artık "tahmini fiyata
    // izin ver" anlamına gelmiyor (hacim fiyatı kaldırıldı); yalnızca aşağıdaki
    // sonuç doğrulamasını etkiler.
    if (slicerProfileHash && sliceSelection.profile) {
      await ensureSlicedAnalysis(supabase, {
        fileId: file.id,
        storagePath: (file as any).storage_path ?? null,
        filename: (file as any).filename ?? null,
        profile: sliceSelection.profile,
        hash: slicerProfileHash,
      });
    }

    const preorder = await resolvePreorder(supabase, {
      material: {
        id: material.id,
        technology,
        preorder_allowed: material.preorder_allowed,
        preorder_discount_percent: material.preorder_discount_percent,
      },
      color: item.color || null,
      quantity,
      preorderEnabled: settings.preorderEnabled,
      defaultDiscount: settings.defaultPreorderDiscount,
    });

    const result = await engine.calculatePrice({
      fileId: file.id,
      volumeCm3,
      materialId: material.id,
      machineType,
      technology,
      quantity,
      useGCodeAnalysis: true,
      color: item.color || 'Natural',
      nozzleSizeMm: item.nozzleSizeMm ?? undefined,
      timeMultiplier: printSettings.timeMultiplier,
      infillPercentage: printSettings.infillPercentage,
      slicerProfileHash,
      preorderDiscountPercent: preorder.isPreorder ? preorder.discountPercent : null,
    });

    if (!result.success) {
      throw new OrderCreationError(result.error || 'Fiyat hesaplanamadı', 422);
    }

    // Fiyat, müşterinin gördüğü profille doğrulanmadan sipariş oluşmamalı.
    if (slicerProfileHash && requireSlicing && result.estimationSource !== 'gcode') {
      throw new OrderCreationError(
        'Fiyat doğrulanamadı. Lütfen birkaç saniye sonra tekrar deneyin.',
        503
      );
    }

    const unitPrice = round(result.breakdown.pricePerUnit);
    const totalPrice = round(result.totalPrice);

    resolvedItems.push({
      id: randomUUID(),
      fileId: file.id,
      filename: file.filename,
      materialId: material.id,
      materialName: material.name,
      technology,
      quantity,
      volumeCm3,
      unitPrice,
      totalPrice,
      estimatedHours: result.estimatedTime.correctedTimeHours,
      totalEstimatedHours:
        result.estimatedTime.totalOrderHours ??
        result.estimatedTime.correctedTimeHours * quantity,
      color: item.color || 'Natural',
      nozzleSizeId: item.nozzleSizeId ?? null,
      nozzleSizeMm: item.nozzleSizeMm ?? null,
      printSettingId: printSettings.printSettingId,
      printSettingName: printSettings.printSettingName,
      isPreorder: preorder.isPreorder,
      preorderDiscountPercent: preorder.discountPercent,
      estimatedRestockDays: preorder.restockDays,
      customLayerHeight: item.customLayerHeight ?? null,
      customInfillPercentage:
        printSettings.printSettingId === null && technology !== 'SLA'
          ? printSettings.infillPercentage
          : null,
      customTimeMultiplier:
        printSettings.printSettingId === null ? printSettings.timeMultiplier : null,
      customLayerThickness: item.customLayerThickness ?? null,
      customExposureTime: item.customExposureTime ?? null,
      priceBreakdown: toLegacyBreakdown(result.breakdown),
    });
  }

  // ---------- Store items ----------
  for (const item of storeItems) {
    const quantity = Math.floor(Number(item.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new OrderCreationError('Geçersiz ürün adedi', 400);
    }

    const { data: product } = await (supabase.from('store_products') as any)
      .select('id, name, slug, sku, price, track_stock, allow_backorder, stock_quantity, is_active')
      .eq('id', item.productId)
      .maybeSingle();

    if (!product || !product.is_active) {
      throw new OrderCreationError('Mağaza ürünü artık mevcut değil', 400);
    }

    if (product.track_stock && !product.allow_backorder && Number(product.stock_quantity) < quantity) {
      throw new OrderCreationError(
        `"${product.name}" için yeterli stok yok (kalan: ${product.stock_quantity})`,
        409
      );
    }

    const unitPrice = round(Number(product.price));
    resolvedStoreItems.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku ?? null,
      quantity,
      unitPrice,
      totalPrice: round(unitPrice * quantity),
    });
  }

  // ---------- Totals (server-side) ----------
  const itemsSubtotal =
    resolvedItems.reduce((sum, i) => sum + i.totalPrice, 0) +
    resolvedStoreItems.reduce((sum, i) => sum + i.totalPrice, 0);

  const { subtotal, shipping, vat, total } = calculateOrderTotals({
    itemsSubtotal,
    vatRate: settings.vatRate,
    shippingFee: settings.shippingFee,
    freeShippingMinAmount: settings.freeShippingMinAmount,
  });

  if (settings.minOrderAmount > 0 && subtotal < settings.minOrderAmount) {
    throw new OrderCreationError(
      `Minimum sipariş tutarı ${settings.minOrderAmount.toFixed(2)} TL. Sepetinize ürün ekleyin.`,
      422
    );
  }

  // Detect a price drift between what the user saw and the server-computed
  // amount. The expected value is never used for pricing.
  if (hasPriceDrift(input.expectedTotal, total)) {
    throw new OrderCreationError(
      'Fiyatlar güncellendi. Lütfen sepetinizi kontrol edip tekrar deneyin.',
      409
    );
  }

  const orderNumber = generateOrderNumber();
  const addressData = {
    fullName: input.address.fullName.trim(),
    phone: input.address.phone.trim(),
    city: input.address.city.trim(),
    district: input.address.district.trim(),
    neighborhood: input.address.neighborhood.trim(),
    street: input.address.street.trim(),
    buildingNo: input.address.buildingNo.trim(),
    apartmentNo: (input.address.apartmentNo || '').trim(),
    zipCode: (input.address.zipCode || '').trim(),
    notes: (input.address.notes || '').trim(),
  };

  const { data: order, error: orderError } = await (supabase.from('orders') as any)
    .insert({
      user_id: user.id,
      order_number: orderNumber,
      status: 'pending',
      subtotal,
      tax_amount: vat,
      shipping_cost: shipping,
      total_amount: total,
      shipping_address: addressData,
      billing_address: addressData,
      customer_notes: input.deliveryNotes?.trim() || null,
      payment_method: input.paymentMethod,
      payment_status: 'pending',
    })
    .select('id, order_number')
    .single();

  if (orderError || !order) {
    console.error('[OrderCreation] Order insert failed:', orderError);
    throw new OrderCreationError('Sipariş oluşturulamadı', 500);
  }

  try {
    if (resolvedItems.length) {
      const { error: itemsError } = await (supabase.from('order_items') as any).insert(
        resolvedItems.map((item) => ({
          id: item.id,
          order_id: order.id,
          file_id: item.fileId,
          filename: item.filename,
          material_id: item.materialId,
          material_name: item.materialName,
          print_setting_id: item.printSettingId,
          print_setting_name: item.printSettingName,
          volume_cm3: item.volumeCm3,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.totalPrice,
          color: item.color,
          estimated_print_hours: round(item.totalEstimatedHours, 2),
          price_breakdown: item.priceBreakdown,
          is_preorder: item.isPreorder,
          preorder_discount_percent: item.preorderDiscountPercent,
          nozzle_size_id: item.nozzleSizeId,
          nozzle_size_mm: item.nozzleSizeMm,
          custom_layer_height: item.customLayerHeight,
          custom_infill_percentage: item.customInfillPercentage,
          custom_time_multiplier: item.customTimeMultiplier,
          custom_layer_thickness: item.customLayerThickness,
          custom_exposure_time: item.customExposureTime,
          estimated_restock_days: item.estimatedRestockDays,
        }))
      );

      if (itemsError) {
        throw new OrderCreationError(`3D baskı ürünleri kaydedilemedi: ${itemsError.message}`, 500);
      }
    }

    if (resolvedStoreItems.length) {
      const { error: storeError } = await (supabase.from('store_order_items') as any).insert(
        resolvedStoreItems.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          product_name: item.name,
          product_slug: item.slug,
          sku: item.sku,
          unit_price: item.unitPrice,
          quantity: item.quantity,
          subtotal: item.totalPrice,
        }))
      );

      if (storeError) {
        throw new OrderCreationError(`Mağaza ürünleri kaydedilemedi: ${storeError.message}`, 500);
      }
    }
  } catch (err) {
    await (supabase.from('orders') as any).delete().eq('id', order.id);
    throw err;
  }

  // ---------- Stock deduction (after persistence, with rollback) ----------
  const applied: Rollback[] = [];
  try {
    for (const item of resolvedStoreItems) {
      const { error } = await (supabase.rpc as any)('decrement_store_product_stock', {
        p_product_id: item.productId,
        p_quantity: item.quantity,
      });
      if (error) {
        throw new OrderCreationError(`"${item.name}" için stok düşürülemedi`, 409);
      }
      applied.push({ type: 'store', productId: item.productId, quantity: item.quantity });
    }

    for (const item of resolvedItems) {
      if (item.isPreorder) continue;

      let { data, error } = await (supabase.rpc as any)('deduct_inventory_stock', {
        p_material_id: item.materialId,
        p_color: item.color,
        p_quantity: item.quantity,
        p_nozzle_size_id: item.nozzleSizeId,
        p_technology: item.technology,
        p_order_id: order.id,
        p_order_item_id: item.id,
      });

      // Migration 093 not applied yet: retry with the legacy signature so
      // checkout keeps working (stock is then restored without a ledger).
      if (error && isMissingFunctionError(error, 'deduct_inventory_stock')) {
        ({ data, error } = await (supabase.rpc as any)('deduct_inventory_stock', {
          p_material_id: item.materialId,
          p_color: item.color,
          p_quantity: item.quantity,
          p_nozzle_size_id: item.nozzleSizeId,
          p_technology: item.technology,
        }));
      }

      if (error) {
        throw new OrderCreationError(`"${item.filename}" için malzeme stoğu düşürülemedi`, 409);
      }

      applied.push({
        type: 'inventory',
        orderItemId: item.id,
        materialId: item.materialId,
        color: item.color,
        quantity: item.quantity,
        nozzleSizeId: item.nozzleSizeId,
        technology: item.technology,
      });

      const short = Number((data as any)?.short ?? 0);
      if (short > 0) {
        // Stock ran out between the pre-check and the deduction (concurrent
        // order). Do not accept a partially reserved order.
        throw new OrderCreationError(
          `"${item.filename}" için stok tükendi. Lütfen tekrar deneyin.`,
          409
        );
      }
    }
  } catch (err) {
    const rollbackOk = await rollbackStock(supabase, applied, order.id);

    if (rollbackOk) {
      await (supabase.from('orders') as any).delete().eq('id', order.id);
    } else {
      // Keep the order and its stock ledger so the restore can be retried
      // instead of silently losing the reserved inventory.
      console.error('[OrderCreation] Rollback incomplete; keeping order for repair:', order.id);
      await (supabase.from('orders') as any)
        .update({
          status: 'cancelled',
          payment_status: 'failed',
          payment_error: 'Stok iadesi tamamlanamadı; manuel kontrol gerekli.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    }

    throw err;
  }

  const itemCount =
    resolvedItems.reduce((sum, i) => sum + i.quantity, 0) +
    resolvedStoreItems.reduce((sum, i) => sum + i.quantity, 0);

  return {
    id: order.id,
    orderNumber: order.order_number,
    subtotal,
    shipping,
    vat,
    total,
    itemCount,
  };
}
