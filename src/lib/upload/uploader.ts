/**
 * File Upload Module
 * Axis3 - STL Upload System
 * 
 * Handles file upload to Supabase Storage with progress tracking
 */

import { createClient } from '@/lib/supabase/client';
import { validateSTLFile } from './validator';
import { UploadResult } from './types';
import { quotaService } from '@/lib/services/quota-service';

/**
 * Upload STL file to Supabase Storage
 * @param file - File to upload
 * @param options - Upload options
 * @returns Promise<UploadResult>
 */
export async function uploadSTLFile(
  file: File
): Promise<UploadResult> {
  try {
    // 1. Validate file
    const validation = validateSTLFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // 2. Get Supabase client
    const supabase = createClient();

    // 3. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'Kullanıcı oturumu bulunamadı',
      };
    }

    // 4. Check upload quota (admins bypass quota)
    const { data: isAdmin } = await (supabase as any).rpc('is_admin');
    if (!isAdmin) {
      const canUpload = await quotaService.canUpload(user.id);
      if (!canUpload) {
        return {
          success: false,
          error: 'Yükleme kotanız doldu. Dosya yüklemek için kota satın alın veya mevcut dosyalarınızı silin.',
        };
      }
    }

    // 5. Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${timestamp}-${randomStr}.${fileExtension}`;
    
    // 6. Create storage path: {userId}/{filename}
    const storagePath = `${user.id}/${uniqueFilename}`;

    // 7. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('stl-files')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return {
        success: false,
        error: `Yükleme hatası: ${uploadError.message}`,
      };
    }

    // 8. Get public URL (even though bucket is private, we need the path)
    const { data: urlData } = supabase.storage
      .from('stl-files')
      .getPublicUrl(storagePath);

    // 9. Create file record in database
    const { data: fileRecord, error: dbError } = await (supabase as any)
      .from('files')
      .insert({
        user_id: user.id,
        filename: uniqueFilename,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: storagePath,
        analysis_status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      
      // Cleanup: Delete uploaded file if database insert fails
      await supabase.storage.from('stl-files').remove([storagePath]);
      
      return {
        success: false,
        error: `Veritabanı hatası: ${dbError.message}`,
      };
    }

    // 10. Return success
    return {
      success: true,
      fileId: fileRecord.id,
      storagePath: uploadData.path,
      publicUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    };
  }
}

/**
 * Delete STL file from storage and database
 * @param fileId - File ID to delete
 * @returns Promise<boolean>
 */
export async function deleteSTLFile(fileId: string): Promise<boolean> {
  try {
    const supabase = createClient();

    // 1. Get file record
    const { data: file, error: fetchError } = await (supabase as any)
      .from('files')
      .select('storage_path')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) {
      console.error('File not found:', fetchError);
      return false;
    }

    // 2. Delete from storage
    const { error: storageError } = await supabase.storage
      .from('stl-files')
      .remove([file.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      return false;
    }

    // 3. Delete from database
    const { error: dbError } = await (supabase as any)
      .from('files')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected delete error:', error);
    return false;
  }
}

/**
 * Get signed URL for private file access
 * @param storagePath - Storage path of the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Promise<string | null>
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from('stl-files')
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Unexpected signed URL error:', error);
    return null;
  }
}

/**
 * Download file from storage
 * @param storagePath - Storage path of the file
 * @returns Promise<Blob | null>
 */
export async function downloadSTLFile(storagePath: string): Promise<Blob | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from('stl-files')
      .download(storagePath);

    if (error) {
      console.error('Download error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected download error:', error);
    return null;
  }
}
