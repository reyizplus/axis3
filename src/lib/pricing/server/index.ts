/**
 * Pricing Server Module - Server-only exports
 *
 * These modules use Node.js built-in modules (fs, child_process, crypto)
 * and must only be imported in server components or API routes.
 *
 * Not: Eski `CuraSlicer` sınıfı ve "simulated slicing" yolu kaldırıldı.
 * Dilimleme artık ayrı `slicer` servisinde (PrusaSlicer) çalışır; uygulama
 * tarafı yalnızca `sliceModel()` istemcisini kullanır.
 */

export { GCodeAnalyzer, gcodeAnalyzer } from './gcode-analyzer';
export {
  SLICE_PROFILE_VERSION,
  MATERIAL_TEMPERATURES,
  buildSlicerProfile,
  profileHash,
  stableStringify,
} from './slicer-profile';
export type { SliceProfileInput, SliceProfileV1 } from './slicer-profile';
export { getCachedAnalysis, saveAnalysis } from './analysis-cache';
export type { CachedAnalysis } from './analysis-cache';
export {
  SlicerRejectedError,
  SlicerTimeoutError,
  SlicerUnavailableError,
  slicerHealth,
  sliceModel,
} from './slicer-client';
export type { SliceStats } from './slicer-client';
export {
  DEFAULT_INFILL_PERCENTAGE,
  DEFAULT_LAYER_HEIGHT_MM,
  DEFAULT_NOZZLE_MM,
  DEFAULT_PRINT_SPEED_MM_S,
  resolveSliceSelection,
  SliceSelectionError,
  speedMultiplierFromTimeMultiplier,
} from './resolve-slice-selection';
export type { ResolvedSliceSelection, SliceSelectionInput } from './resolve-slice-selection';
