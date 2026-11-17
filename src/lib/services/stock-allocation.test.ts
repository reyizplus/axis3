/**
 * Stok tahsisi kurallari.
 *
 * Kilitlenen iki uretim hatasi:
 *  - Stok dolu olsa bile siparisin `"<dosya>.stl" icin stok tukendi` (409) ile
 *    dusmesi: `deduct_inventory_stock` cagrisina nozul kimligi gidiyordu, ama
 *    envanter satirlarinda `nozzle_size_id` NULL'dir ve SQL fonksiyonu tam
 *    eslesme ariyor (`NULL = <uuid>` → hicbir satir).
 *  - Ayni malzeme+renkten iki kalem iceren sepette ikinci kalemin patlamasi.
 */
import { describe, expect, it } from 'vitest';
import { claimStock, inventoryDeductionArgs, stockGroupKey } from './stock-allocation';

describe('inventoryDeductionArgs', () => {
  it('nozul kimligi gondermez (envanter satirlarinda nozzle_size_id NULL)', () => {
    const args = inventoryDeductionArgs({
      materialId: 'mat-1',
      color: 'Siyah',
      quantity: 1,
      technology: 'FDM',
      // Kalemde nozul var; yine de stok dusme cagrisina girmemeli.
      nozzleSizeId: 'nozzle-1',
    } as never);

    expect(args.p_nozzle_size_id).toBeNull();
    expect(args.p_color).toBe('Siyah');
    expect(args.p_quantity).toBe(1);
  });

  it('siparis kimliklerini yalnizca verildiginde ekler (eski imza uyumu)', () => {
    const base = inventoryDeductionArgs({
      materialId: 'mat-1',
      color: 'Gri',
      quantity: 2,
      technology: 'FDM',
    });
    expect('p_order_id' in base).toBe(false);

    const withOrder = inventoryDeductionArgs(
      { materialId: 'mat-1', color: 'Gri', quantity: 2, technology: 'FDM' },
      { orderId: 'ord-1', orderItemId: 'item-1' }
    );
    expect(withOrder.p_order_id).toBe('ord-1');
    expect(withOrder.p_order_item_id).toBe('item-1');
  });

  it('SLA kalemlerinde de nozul gondermez', () => {
    const args = inventoryDeductionArgs(
      { materialId: 'resin-1', color: null, quantity: 1, technology: 'SLA' },
      { orderId: 'ord-2' }
    );
    expect(args.p_nozzle_size_id).toBeNull();
    expect(args.p_technology).toBe('SLA');
    expect(args.p_order_item_id).toBeNull();
  });
});

describe('claimStock', () => {
  it('ayni gruptan gelen kalemlere stogu sirayla paylastirir', () => {
    const claims = new Map<string, number>();
    const key = stockGroupKey('mat-1', 'siyah', true);

    expect(claimStock(claims, key, 1, 1)).toBe(true); // ilk kalem stogu alir
    expect(claimStock(claims, key, 1, 1)).toBe(false); // ikinci kalem on siparise duser
    expect(claims.get(key)).toBe(1);
  });

  it('adet stoktan fazlaysa talebi yazmaz', () => {
    const claims = new Map<string, number>();
    const key = stockGroupKey('mat-1', 'gri', true);
    expect(claimStock(claims, key, 1, 2)).toBe(false);
    expect(claims.get(key)).toBeUndefined();
  });

  it('farkli renkler birbirinin stogunu yemez', () => {
    const claims = new Map<string, number>();
    expect(claimStock(claims, stockGroupKey('mat-1', 'siyah', true), 1, 1)).toBe(true);
    expect(claimStock(claims, stockGroupKey('mat-1', 'gri', true), 1, 1)).toBe(true);
  });

  it('renk satiri yoksa tum renkler ayni havuzu paylasir', () => {
    const claims = new Map<string, number>();
    // Ayni malzeme, farkli istenen renkler, ama renk icin envanter satiri yok.
    const key = stockGroupKey('mat-1', 'mavi', false);
    expect(key).toBe(stockGroupKey('mat-1', 'beyaz', false));
    expect(claimStock(claims, key, 1, 1)).toBe(true);
    expect(claimStock(claims, stockGroupKey('mat-1', 'beyaz', false), 1, 1)).toBe(false);
  });
});

describe('stockGroupKey', () => {
  it('renk satiri varsa renk bazli, yoksa malzeme bazli anahtar uretir', () => {
    expect(stockGroupKey('m', 'siyah', true)).toBe('m|siyah');
    expect(stockGroupKey('m', 'siyah', false)).toBe('m|*');
    expect(stockGroupKey('m', null, true)).toBe('m|*');
  });
});
