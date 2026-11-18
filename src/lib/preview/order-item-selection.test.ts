import { describe, expect, it } from 'vitest';

import {
  sliceSelectionFromOrderItem,
  type OrderItemSliceFields,
} from './order-item-selection';
import {
  resolveSliceSelection,
  type SliceSelectionInput,
} from '@/lib/pricing/server/resolve-slice-selection';
import { profileHash, type SliceProfileV1 } from '@/lib/pricing/server/slicer-profile';

const PLA = {
  id: 'mat-pla',
  name: 'PLA',
  technology: 'FDM',
  density: 1.24,
  is_active: true,
};

const HIGH_QUALITY = {
  id: 'ps-hq',
  name: 'Yüksek Kalite',
  technology: 'FDM',
  layer_height: 0.1,
  infill_percentage: 30,
  print_speed: 40,
  is_active: true,
};

function createFakeClient(rows: Record<string, unknown>) {
  return {
    from(table: string) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
      };
      return builder;
    },
  };
}

async function hash(input: SliceSelectionInput): Promise<string | null> {
  const result = await resolveSliceSelection(
    createFakeClient({ materials: PLA, print_settings: HIGH_QUALITY }),
    input
  );
  return result.profile ? profileHash(result.profile as SliceProfileV1) : null;
}

/** `PreviewWorkspace`'in seçimden ürettiği istek (bkz. PreviewWorkspace.tsx). */
function previewInput(selection: NonNullable<ReturnType<typeof sliceSelectionFromOrderItem>>) {
  return {
    fileId: selection.fileId,
    materialId: selection.materialId,
    printSettingId: selection.printSettingId,
    nozzleSizeMm: selection.nozzleSizeMm,
    supportEnabled: selection.supportEnabled,
    custom:
      selection.printSettingId === 'custom'
        ? {
            layerHeight: selection.customLayerHeight,
            infillPercentage: selection.customInfill,
            speedMultiplier: selection.customSpeed,
          }
        : null,
  };
}

describe('sliceSelectionFromOrderItem', () => {
  it('özel modda "custom" gönderir ve zaman çarpanını hıza çevirir', () => {
    const item: OrderItemSliceFields = {
      file_id: 'file-1',
      material_id: 'mat-pla',
      print_setting_id: null,
      nozzle_size_mm: 0.4,
      support_enabled: false,
      custom_layer_height: 0.15,
      custom_infill_percentage: 40,
      // 0.5 → iki kat hızlı
      custom_time_multiplier: 0.5,
      material_technology: 'FDM',
    };

    expect(sliceSelectionFromOrderItem(item)).toEqual({
      fileId: 'file-1',
      materialId: 'mat-pla',
      printSettingId: 'custom',
      nozzleSizeMm: 0.4,
      supportEnabled: false,
      customLayerHeight: 0.15,
      customInfill: 40,
      customSpeed: 2,
      technology: 'FDM',
    });
  });

  it('kalite seçimini aynen geçirir', () => {
    const selection = sliceSelectionFromOrderItem({
      file_id: 'file-1',
      material_id: 'mat-pla',
      print_setting_id: 'ps-hq',
      material_technology: 'FDM',
    });

    expect(selection?.printSettingId).toBe('ps-hq');
  });

  it('destek alanı eski kayıtlarda yoksa açık kabul eder', () => {
    expect(
      sliceSelectionFromOrderItem({ file_id: 'file-1', material_id: 'mat-pla' })?.supportEnabled
    ).toBe(true);
  });

  it('dosya veya malzeme yoksa önizleme istemez', () => {
    expect(sliceSelectionFromOrderItem({ material_id: 'mat-pla' })).toBeNull();
    expect(sliceSelectionFromOrderItem({ file_id: 'file-1' })).toBeNull();
  });
});

describe('sipariş detayı önizlemesi ↔ sipariş fiyatı paritesi', () => {
  it('özel modda aynı profil hash’ini üretir', async () => {
    // Sipariş oluşturulurken kullanılan girdi (order-creation-service).
    const orderInput: SliceSelectionInput = {
      materialId: 'mat-pla',
      printSettingId: 'custom',
      nozzleSizeMm: 0.4,
      supportEnabled: true,
      custom: { layerHeight: 0.15, infillPercentage: 40, speedMultiplier: 2 },
    };

    const selection = sliceSelectionFromOrderItem({
      file_id: 'file-1',
      material_id: 'mat-pla',
      print_setting_id: null,
      nozzle_size_mm: 0.4,
      support_enabled: true,
      custom_layer_height: 0.15,
      custom_infill_percentage: 40,
      custom_time_multiplier: 0.5,
      material_technology: 'FDM',
    });
    expect(selection).not.toBeNull();

    expect(await hash(previewInput(selection!))).toBe(await hash(orderInput));
  });

  it('kalite seçiminde aynı profil hash’ini üretir', async () => {
    const orderInput: SliceSelectionInput = {
      materialId: 'mat-pla',
      printSettingId: 'ps-hq',
      nozzleSizeMm: 0.4,
      supportEnabled: true,
    };

    const selection = sliceSelectionFromOrderItem({
      file_id: 'file-1',
      material_id: 'mat-pla',
      print_setting_id: 'ps-hq',
      nozzle_size_mm: 0.4,
      support_enabled: true,
      material_technology: 'FDM',
    });
    expect(selection).not.toBeNull();

    expect(await hash(previewInput(selection!))).toBe(await hash(orderInput));
  });
});
