/**
 * Axis3 Pricing v2 - TypeScript Type Definitions
 * 
 * 4 Sütunlu Fiyatlandırma Modeli:
 * 1. Materyal Maliyeti (gram + %10 fire)
 * 2. Makine Amortismanı (süre × saatlik ücret)
 * 3. İşçilik (hazırlık + destek + son işlem)
 * 4. Risk Primi (%15-20 güvenlik marjı)
 */

// =====================================================
// CURA ENGINE / SLICER TYPES
// =====================================================

export interface SlicerProfile {
  layerHeight: number;
  infillPercentage: number;
  infillPattern: string;
  printSpeed: number;
  nozzleDiameter: number;
  filamentDiameter: number;
  materialType: string;
  bedTemperature: number;
  nozzleTemperature: number;
  supportEnabled: boolean;
  supportStructure: string;
  retractionEnabled: boolean;
  retractionSpeed: number;
  retractionDistance: number;
  fanSpeed: number;
}

export interface SlicerResult {
  success: boolean;
  gcodePath: string | null;
  error: string | null;
}

export type SlicingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// =====================================================
// G-CODE ANALYZER TYPES
// =====================================================

export interface GCodeAnalysisResult {
  success: boolean;
  filamentWeightGrams: number;
  supportWeightGrams: number;
  filamentLengthMm: number;
  actualPrintTimeSeconds: number;
  actualPrintTimeHours: number;
  totalLayerCount: number;
  minLayerHeightMm: number;
  maxLayerHeightMm: number;
  totalTravelDistanceMm: number;
  totalExtrusionDistanceMm: number;
  retractionCount: number;
  rawHeader: Record<string, unknown>;
  error: string | null;
}

// =====================================================
// CORRECTION FACTOR (ECF) TYPES
// =====================================================

export interface CorrectionCoefficients {
  warmUpMinutes: number;
  calibrationMinutes: number;
  bedPrepMinutes: number;
  deadTimePerPartMinutes: number;
}

export interface CorrectedTimeResult {
  rawPrintTimeHours: number;
  additionalTimeHours: number;
  totalCorrectedHours: number;
  breakdown: {
    warmUp: number;
    calibration: number;
    bedPrep: number;
    deadTime: number;
  };
}

// =====================================================
// PRICING ENGINE TYPES
// =====================================================

export interface PricingInput {
  fileId: string;
  volumeCm3: number;
  materialId: string;
  machineType: string;
  technology: 'FDM' | 'SLA';
  quantity: number;
  color?: string;
  nozzleSizeMm?: number;
  customProfile?: Partial<SlicerProfile>;
  useGCodeAnalysis: boolean;
  /**
   * Dilimleme profilinin hash'i. G-Code analizi YALNIZCA bu hash ile eşleşen
   * satırdan okunur. Verilmezse hacim tahminine düşülür — "dosyanın en son
   * analizi" asla kullanılmaz, aksi halde kalite değişiminde eski veriyle
   * fiyat verilir.
   */
  slicerProfileHash?: string;
  preorderDiscountPercent?: number | null;
  /** Material print speed modifier from DB (default 1.0) */
  printSpeedModifier?: number;
  /** Quality time multiplier from print_settings (default 1.0) */
  timeMultiplier?: number;
  /** Infill percentage from quality setting or custom mode (e.g. 20 for 20%) */
  infillPercentage?: number;
}

export interface MaterialCost {
  filamentGrams: number;
  supportGrams: number;
  totalGrams: number;
  wastePercentage: number;
  unitCostPerGram: number;
  subtotal: number;
}

export interface MachineAmortizationCost {
  correctedPrintTimeHours: number;
  hourlyRate: number;
  subtotal: number;
}

export interface LaborCost {
  filePrepMinutes: number;
  supportRemovalMinutes: number;
  postProcessingMinutes: number;
  totalMinutes: number;
  hourlyRate: number;
  subtotal: number;
}

export interface RiskPremium {
  baseTotal: number;
  premiumPercentage: number;
  subtotal: number;
}

export interface ElectricityCost {
  printTimeHours: number;
  rate: number;
  subtotal: number;
}

export interface ProfitMarginCost {
  baseTotal: number;
  multiplier: number;
  subtotal: number;
}

export interface PriceBreakdown {
  material: MaterialCost;
  machineAmortization: MachineAmortizationCost;
  electricity: ElectricityCost;
  labor: LaborCost;
  riskPremium: RiskPremium;
  serviceFee: number;
  profitMargin: ProfitMarginCost;
  subtotal: number;
  totalBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  totalWithVat: number;
  pricePerUnit: number;
  totalPrice: number;
  quantityDiscount?: number;
  preorderDiscount?: number;
  /** Break-even cost (material + machine + electricity + labor), whole line. */
  directCost?: number;
  /** True when a discount was reduced so the order cannot sell below cost. */
  discountCapped?: boolean;
}

export interface PricingResult {
  success: boolean;
  totalPrice: number;
  breakdown: PriceBreakdown;
  estimatedTime: {
    /** Per-unit print time before setup/dead time. */
    rawPrintTimeHours: number;
    /** Per-unit print time including dead time. */
    correctedTimeHours: number;
    /** Warm-up + calibration + bed prep, charged once per order. */
    orderSetupHours?: number;
    /** Whole line time including quantity and setup. */
    totalOrderHours?: number;
    correctionBreakdown: CorrectionCoefficients;
  };
  deliveryDays: number;
  /** Whether the numbers came from a real G-Code analysis or a volume estimate. */
  estimationSource?: 'gcode' | 'volume';
  /** Non-fatal configuration problems worth logging. */
  warnings?: string[];
  error: string | null;
}

// =====================================================
// DATABASE ROW TYPES (Supabase)
// =====================================================

export interface PricingCoefficientRow {
  id: string;
  key: string;
  label: string;
  value_minutes: number;
  description: string;
  is_active: boolean;
  updated_at: string;
  created_at: string;
}

export interface MachineAmortizationRow {
  id: string;
  machine_type: string;
  label: string;
  hourly_rate: number;
  purchase_cost: number;
  depreciation_months: number;
  monthly_maintenance: number;
  is_active: boolean;
  updated_at: string;
  created_at: string;
}

export interface RiskPremiumRow {
  id: string;
  technology: string;
  premium_percentage: number;
  description: string;
  is_active: boolean;
  updated_at: string;
  created_at: string;
}

export interface LaborTimeRow {
  id: string;
  task_type: string;
  label: string;
  base_minutes: number;
  per_complexity_minutes: number;
  description: string;
  is_active: boolean;
  updated_at: string;
  created_at: string;
}
