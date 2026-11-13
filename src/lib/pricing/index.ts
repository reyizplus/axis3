/**
 * Pricing Module v2 - Public API (Client-safe)
 * 
 * These exports are safe for client-side use.
 * Server-only modules (slicer, gcode-analyzer) are in ./server/
 * and must only be imported in API routes / server components.
 */

export { PricingEngine, pricingEngine } from './engine';
export { CorrectionFactor, correctionFactor } from './correction-factor';
export { computeQuote, estimateConsumption, PricingError } from './core';
export type { QuoteInput, QuoteResult, ConsumptionEstimate } from './core';

export type {
  PricingInput,
  PricingResult,
  PriceBreakdown,
  MaterialCost,
  MachineAmortizationCost,
  ElectricityCost,
  LaborCost,
  RiskPremium,
  ProfitMarginCost,
  CorrectionCoefficients,
  CorrectedTimeResult,
  SlicerProfile,
  SlicerResult,
  GCodeAnalysisResult,
} from './types';
