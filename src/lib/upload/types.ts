/**
 * Upload Module Type Definitions
 * Axis3 - STL Upload System
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: FileValidationErrorCode;
}

export enum FileValidationErrorCode {
  INVALID_EXTENSION = 'INVALID_EXTENSION',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_MIME_TYPE = 'INVALID_MIME_TYPE',
  FILE_EMPTY = 'FILE_EMPTY',
  INVALID_FILE = 'INVALID_FILE',
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  storagePath?: string;
  publicUrl?: string;
  error?: string;
}

export interface FileUploadOptions {
  maxSizeMB?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadedFileMetadata {
  id: string;
  userId: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  publicUrl?: string;
  createdAt: Date;
}
