/**
 * Storage Service - Provider Abstraction Layer
 * Axis3 - Independence Architecture
 * 
 * Purpose: Abstract storage operations to enable easy provider switching
 * Current: Supabase Storage
 * Future: MinIO, AWS S3, or custom solution
 */

import { createClient } from '@/lib/supabase/client';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface StorageProvider {
  upload(bucket: string, path: string, file: File): Promise<StorageUploadResult>;
  download(bucket: string, path: string): Promise<Blob>;
  delete(bucket: string, path: string): Promise<void>;
  getPublicUrl(bucket: string, path: string): string;
  getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<string>;
  list(bucket: string, path?: string): Promise<StorageFile[]>;
}

export interface StorageUploadResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

export interface StorageFile {
  name: string;
  id: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// SUPABASE PROVIDER (Current Implementation)
// =====================================================

class SupabaseStorageProvider implements StorageProvider {
  private supabase = createClient();

  async upload(bucket: string, path: string, file: File): Promise<StorageUploadResult> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      const url = this.getPublicUrl(bucket, data.path);

      return {
        success: true,
        path: data.path,
        url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  async download(bucket: string, path: string): Promise<Blob> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path);

    if (error || !data) {
      throw new Error(error?.message || 'Download failed');
    }

    return data;
  }

  async delete(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new Error(error.message);
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  async list(bucket: string, path: string = ''): Promise<StorageFile[]> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list(path);

    if (error || !data) {
      throw new Error(error?.message || 'List failed');
    }

    return data.map(file => ({
      name: file.name,
      id: file.id || '',
      size: file.metadata?.size || 0,
      createdAt: new Date(file.created_at || Date.now()),
      updatedAt: new Date(file.updated_at || Date.now()),
    }));
  }
}

// =====================================================
// MINIO PROVIDER (Future Implementation - Not Currently Used)
// =====================================================
// NOTE: This provider is not implemented and not used in the current system.
// Supabase Storage is the active provider. Uncomment and implement when needed.

/* DISABLED - Future Feature
class MinIOStorageProvider implements StorageProvider {
  async upload(bucket: string, path: string, file: File): Promise<StorageUploadResult> {
    // TODO: Implement MinIO upload
    throw new Error('MinIO provider not implemented yet');
  }

  async download(bucket: string, path: string): Promise<Blob> {
    // TODO: Implement MinIO download
    throw new Error('MinIO provider not implemented yet');
  }

  async delete(bucket: string, path: string): Promise<void> {
    // TODO: Implement MinIO delete
    throw new Error('MinIO provider not implemented yet');
  }

  getPublicUrl(bucket: string, path: string): string {
    // TODO: Implement MinIO public URL
    throw new Error('MinIO provider not implemented yet');
  }

  async getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<string> {
    // TODO: Implement MinIO signed URL
    throw new Error('MinIO provider not implemented yet');
  }

  async list(bucket: string, path?: string): Promise<StorageFile[]> {
    // TODO: Implement MinIO list
    throw new Error('MinIO provider not implemented yet');
  }
}
*/

// =====================================================
// STORAGE SERVICE (Singleton)
// =====================================================

class StorageService {
  private static instance: StorageService;
  private provider: StorageProvider;

  private constructor() {
    // Initialize with Supabase provider
    // To switch to MinIO: this.provider = new MinIOStorageProvider();
    this.provider = new SupabaseStorageProvider();
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Switch provider at runtime (for testing or migration)
  setProvider(provider: StorageProvider) {
    this.provider = provider;
  }

  async uploadFile(bucket: string, path: string, file: File): Promise<StorageUploadResult> {
    return this.provider.upload(bucket, path, file);
  }

  async downloadFile(bucket: string, path: string): Promise<Blob> {
    return this.provider.download(bucket, path);
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    return this.provider.delete(bucket, path);
  }

  getFileUrl(bucket: string, path: string): string {
    return this.provider.getPublicUrl(bucket, path);
  }

  async getSignedFileUrl(bucket: string, path: string, expiresIn?: number): Promise<string> {
    return this.provider.getSignedUrl(bucket, path, expiresIn);
  }

  async listFiles(bucket: string, path?: string): Promise<StorageFile[]> {
    return this.provider.list(bucket, path);
  }
}

// =====================================================
// EXPORTS
// =====================================================

export const storageService = StorageService.getInstance();

// Export for testing or custom implementations
export { SupabaseStorageProvider, StorageService };
// Note: MinIOStorageProvider is disabled (see line 145)
