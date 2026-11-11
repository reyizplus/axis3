/**
 * File Validation Module
 * Axis3 - STL Upload System
 * 
 * Security Layer: Validates files before upload
 * Constraints: 50MB max, .stl extension only
 */

import { FileValidationResult, FileValidationErrorCode } from './types';

// Constants
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 52,428,800 bytes
const ALLOWED_EXTENSIONS = ['.stl'];
const ALLOWED_MIME_TYPES = [
  'model/stl',
  'application/sla',
  'application/vnd.ms-pki.stl',
  'application/octet-stream', // STL files sometimes detected as this
];

/**
 * Validate STL file before upload
 * @param file - File object to validate
 * @returns FileValidationResult
 */
export function validateSTLFile(file: File): FileValidationResult {
  // 1. Check if file exists
  if (!file) {
    return {
      valid: false,
      error: 'Dosya seçilmedi',
      errorCode: FileValidationErrorCode.INVALID_FILE,
    };
  }

  // 2. Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'Dosya boş olamaz',
      errorCode: FileValidationErrorCode.FILE_EMPTY,
    };
  }

  // 3. Check file size (50MB limit)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Dosya boyutu ${MAX_FILE_SIZE_MB}MB'dan küçük olmalıdır (Mevcut: ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      errorCode: FileValidationErrorCode.FILE_TOO_LARGE,
    };
  }

  // 4. Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Sadece .stl uzantılı dosyalar yüklenebilir',
      errorCode: FileValidationErrorCode.INVALID_EXTENSION,
    };
  }

  // 5. Check MIME type
  const hasValidMimeType = ALLOWED_MIME_TYPES.includes(file.type) || file.type === '';
  
  if (!hasValidMimeType && file.type !== '') {
    return {
      valid: false,
      error: `Geçersiz dosya tipi: ${file.type}`,
      errorCode: FileValidationErrorCode.INVALID_MIME_TYPE,
    };
  }

  // All checks passed
  return {
    valid: true,
  };
}

/**
 * Validate multiple files
 * @param files - Array of files to validate
 * @returns Array of validation results
 */
export function validateSTLFiles(files: File[]): FileValidationResult[] {
  return files.map(file => validateSTLFile(file));
}

/**
 * Check if file is STL by magic number (binary STL detection)
 * Binary STL files start with 80 bytes of header
 * @param file - File to check
 * @returns Promise<boolean>
 */
export async function isValidSTLBinary(file: File): Promise<boolean> {
  try {
    // Read first 84 bytes (80 header + 4 triangle count)
    const buffer = await file.slice(0, 84).arrayBuffer();
    const view = new DataView(buffer);
    
    // Check if file is large enough
    if (buffer.byteLength < 84) {
      return false;
    }
    
    // Read triangle count (bytes 80-83, little-endian)
    const triangleCount = view.getUint32(80, true);
    
    // Calculate expected file size
    // 80 (header) + 4 (count) + triangleCount * 50 (each triangle)
    const expectedSize = 84 + triangleCount * 50;
    
    // Allow 1% tolerance for file size
    const tolerance = expectedSize * 0.01;
    const sizeDiff = Math.abs(file.size - expectedSize);
    
    return sizeDiff <= tolerance;
  } catch (error) {
    console.error('Binary STL validation error:', error);
    return false;
  }
}

/**
 * Check if file is ASCII STL
 * ASCII STL files start with "solid"
 * @param file - File to check
 * @returns Promise<boolean>
 */
export async function isValidSTLAscii(file: File): Promise<boolean> {
  try {
    // Read first 100 bytes
    const buffer = await file.slice(0, 100).arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    
    // ASCII STL starts with "solid"
    return text.trim().toLowerCase().startsWith('solid');
  } catch (error) {
    console.error('ASCII STL validation error:', error);
    return false;
  }
}

/**
 * Deep validation: Check if file is actually a valid STL
 * @param file - File to validate
 * @returns Promise<FileValidationResult>
 */
export async function deepValidateSTL(file: File): Promise<FileValidationResult> {
  // First, run basic validation
  const basicValidation = validateSTLFile(file);
  if (!basicValidation.valid) {
    return basicValidation;
  }

  // Check if it's a valid binary or ASCII STL
  const isBinary = await isValidSTLBinary(file);
  const isAscii = await isValidSTLAscii(file);

  if (!isBinary && !isAscii) {
    return {
      valid: false,
      error: 'Dosya geçerli bir STL dosyası değil',
      errorCode: FileValidationErrorCode.INVALID_FILE,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Get human-readable file size
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validate STL dimensions against printer build volume
 * @param dimensions - STL dimensions in cm
 * @param maxBuildVolume - Printer max build volume from global_settings
 * @returns Validation result with detailed error message
 */
export interface DimensionValidationResult {
  valid: boolean;
  error?: string;
  exceededDimensions?: {
    x?: number;
    y?: number;
    z?: number;
  };
}

export function validateDimensions(
  dimensions: { x: number; y: number; z: number },
  maxBuildVolume: { x: number; y: number; z: number }
): DimensionValidationResult {
  const exceeded: { x?: number; y?: number; z?: number } = {};
  let hasExceeded = false;

  // Check each dimension
  if (dimensions.x > maxBuildVolume.x) {
    exceeded.x = dimensions.x;
    hasExceeded = true;
  }
  if (dimensions.y > maxBuildVolume.y) {
    exceeded.y = dimensions.y;
    hasExceeded = true;
  }
  if (dimensions.z > maxBuildVolume.z) {
    exceeded.z = dimensions.z;
    hasExceeded = true;
  }

  if (!hasExceeded) {
    return { valid: true };
  }

  // Build detailed error message
  const exceededParts: string[] = [];
  if (exceeded.x) {
    exceededParts.push(`X: ${exceeded.x.toFixed(1)}cm (max ${maxBuildVolume.x}cm)`);
  }
  if (exceeded.y) {
    exceededParts.push(`Y: ${exceeded.y.toFixed(1)}cm (max ${maxBuildVolume.y}cm)`);
  }
  if (exceeded.z) {
    exceededParts.push(`Z: ${exceeded.z.toFixed(1)}cm (max ${maxBuildVolume.z}cm)`);
  }

  return {
    valid: false,
    error: `Model boyutları yazıcı limitlerini aşıyor:\n${exceededParts.join('\n')}`,
    exceededDimensions: exceeded,
  };
}

/**
 * Export constants for use in components
 */
export const VALIDATION_CONSTANTS = {
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} as const;
