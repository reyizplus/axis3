/**
 * Cart Types
 * Axis3 - Shopping Cart Type Definitions
 */

export interface PriceBreakdown {
  materialCost: number;
  machineAmortizationCost: number;
  electricityCost: number;
  laborCost: number;
  riskPremium: number;
  serviceFee: number;
  profitMargin: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalBeforeVat: number;
  total: number;
  pricePerUnit: number;
  quantityDiscount?: number;
  preorderDiscount?: number;
  detail?: {
    material: { filamentGrams: number; supportGrams: number; wastePercentage: number };
    machineAmortization: { correctedPrintTimeHours: number; hourlyRate: number };
    electricity: { printTimeHours: number; rate: number };
    labor: { filePrepMinutes: number; supportRemovalMinutes: number; postProcessingMinutes: number; totalMinutes: number; hourlyRate: number };
    riskPremium: { baseTotal: number; premiumPercentage: number };
    profitMargin: { baseTotal: number; multiplier: number };
    correctionBreakdown: { warmUpMinutes: number; calibrationMinutes: number; bedPrepMinutes: number; deadTimePerPartMinutes: number };
  };
}

export interface CartItem {
  id: string; // Unique cart item ID
  fileId: string;
  fileName: string;
  volumeCm3: number;
  materialId: string;
  materialName: string;
  printSettingId: string;
  printSettingName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  estimatedTime: number; // Print time in hours per unit
  technology?: 'FDM' | 'SLA';
  color?: string; // Print color (optional, default: 'Natural')
  nozzleSizeId?: string;
  nozzleSizeMm?: number;
  isPreorder?: boolean;
  preorderDiscountPercent?: number | null;
  estimatedRestockDays?: number;
  customLayerHeight?: number;
  customInfillPercentage?: number;
  customTimeMultiplier?: number;
  customLayerThickness?: number;
  customExposureTime?: number;
  priceBreakdown?: PriceBreakdown; // Detailed cost breakdown (for admin)
  deliveryDays?: number; // Estimated delivery days
  addedAt: string; // ISO timestamp
}

export interface Cart {
  userId?: string; // User ID for cart isolation (prevents cross-user data leakage)
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
  updatedAt: string;
  version?: number; // Version stamp for cross-tab conflict resolution
}
