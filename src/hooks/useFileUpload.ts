/**
 * useFileUpload Hook
 * Axis3 - STL Upload System
 *
 * Custom hook for handling file uploads with progress tracking
 */

'use client';

import { useState, useCallback } from 'react';
import { useDropzone, DropzoneOptions, FileRejection } from 'react-dropzone';
import { uploadSTLFile } from '@/lib/upload/uploader';
import { validateSTLFile } from '@/lib/upload/validator';
import {
  UploadResult
} from '@/lib/upload/types';

interface UseFileUploadOptions {
  maxFiles?: number;
  maxSizeMB?: number;
  onUploadComplete?: (result: UploadResult, file: File) => void;
  onUploadError?: (error: string) => void;
  autoUpload?: boolean;
}

interface UseFileUploadReturn {
  // State
  file: File | null;
  uploadProgress: number;
  isUploading: boolean;
  isValidating: boolean;
  uploadResult: UploadResult | null;
  validationError: string | null;
  
  // Methods
  uploadFile: (file: File) => Promise<void>;
  clearFile: () => void;
  resetUpload: () => void;
  
  // Dropzone
  getRootProps: ReturnType<typeof useDropzone>['getRootProps'];
  getInputProps: ReturnType<typeof useDropzone>['getInputProps'];
  isDragActive: boolean;
  isDragAccept: boolean;
  isDragReject: boolean;
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    maxFiles = 1,
    maxSizeMB = 50,
    onUploadComplete,
    onUploadError,
    autoUpload = true,
  } = options;

  // State
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * Upload file to server
   */
  const uploadFile = useCallback(async (fileToUpload: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setValidationError(null);
      setUploadResult(null);

      // Simulate progress (since Supabase doesn't provide real-time progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
  
      // Upload file
      const result = await uploadSTLFile(fileToUpload);
  
      // Clear progress interval
      clearInterval(progressInterval);
      setUploadProgress(100);
  
      // Handle result
      setUploadResult(result);
  
      if (result.success) {
        onUploadComplete?.(result, fileToUpload);
      } else {
        setValidationError(result.error || 'Yükleme başarısız');
        onUploadError?.(result.error || 'Yükleme başarısız');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      setValidationError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete, onUploadError]);

  /**
   * Handle file drop
   */
  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    // Clear previous errors
    setValidationError(null);
    setUploadResult(null);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      const error = rejection.errors[0];
      
      if (error.code === 'file-too-large') {
        setValidationError(`Dosya boyutu ${maxSizeMB}MB'dan küçük olmalıdır`);
      } else if (error.code === 'file-invalid-type') {
        setValidationError('Sadece .stl uzantılı dosyalar yüklenebilir');
      } else {
        setValidationError(error.message);
      }
      return;
    }

    // Handle accepted files
    if (acceptedFiles.length === 0) {
      return;
    }

    const selectedFile = acceptedFiles[0];
    
    // Validate file
    setIsValidating(true);
    const validation = validateSTLFile(selectedFile);
    setIsValidating(false);

    if (!validation.valid) {
      setValidationError(validation.error || 'Dosya geçersiz');
      return;
    }

    // Set file
    setFile(selectedFile);

    // Auto upload if enabled
    if (autoUpload) {
      await uploadFile(selectedFile);
    }
  }, [maxSizeMB, autoUpload, uploadFile]);

  /**
   * Dropzone configuration
   */
  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    accept: {
      'model/stl': ['.stl'],
      'application/sla': ['.stl'],
      'application/vnd.ms-pki.stl': ['.stl'],
      'application/octet-stream': ['.stl'],
    },
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: false,
    disabled: isUploading,
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone(dropzoneOptions);

  /**
   * Clear selected file
   */
  const clearFile = useCallback(() => {
    setFile(null);
    setUploadProgress(0);
    setValidationError(null);
    setUploadResult(null);
  }, []);

  /**
   * Reset upload state
   */
  const resetUpload = useCallback(() => {
    setFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setIsValidating(false);
    setUploadResult(null);
    setValidationError(null);
  }, []);

  return {
    // State
    file,
    uploadProgress,
    isUploading,
    isValidating,
    uploadResult,
    validationError,
    
    // Methods
    uploadFile,
    clearFile,
    resetUpload,
    
    // Dropzone
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  };
}
