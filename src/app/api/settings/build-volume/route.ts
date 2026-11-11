/**
 * Build Volume Settings API
 * Returns printer build volume from admin settings
 */

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // No auth check - this endpoint is public (read-only)
    // Users need to see build volume limits when uploading files
    
    // Fetch printer_max_build_volume setting
    const { data, error } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'printer_max_build_volume')
      .single();

    if (error || !data) {
      // Return default Ender-3 dimensions if not found
      return NextResponse.json({
        success: true,
        data: {
          max_x: 22,
          max_y: 22,
          max_z: 25
        }
      });
    }

    // Parse the JSON value
    interface BuildVolumeData {
      value: string;
    }
    
    const buildVolume = JSON.parse((data as BuildVolumeData).value);
    
    return NextResponse.json({
      success: true,
      data: {
        max_x: buildVolume.max_x || 22,
        max_y: buildVolume.max_y || 22,
        max_z: buildVolume.max_z || 25
      }
    });
  } catch (error) {
    console.error('Error fetching build volume:', error);
    
    // Return default on error
    return NextResponse.json({
      success: true,
      data: {
        max_x: 22,
        max_y: 22,
        max_z: 25
      }
    });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Admin check using is_admin() function
        const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    
        if (adminError || !isAdmin) {
      console.error('[BuildVolume] Admin check failed:', {
        adminError,
        isAdmin,
        userEmail: user.email,
        userId: user.id
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Admin access required. Use @axis3.com.tr email or set role=admin in metadata',
          debug: {
            isAdmin,
            adminError: adminError?.message,
            userEmail: user.email
          }
        },
        { status: 403 }
      );
    }
    
        // Parse request body
    const body = await request.json();
    const { max_x, max_y, max_z } = body;
    
    // Validate input
    if (!max_x || !max_y || !max_z || max_x <= 0 || max_y <= 0 || max_z <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid build volume dimensions' },
        { status: 400 }
      );
    }
    
    // Update or insert printer_max_build_volume setting using service client
    const buildVolumeValue = JSON.stringify({ max_x, max_y, max_z });
    
        const serviceClient = await createServiceClient();
    const { error: upsertError } = await serviceClient
      .from('global_settings')
      .upsert({
        key: 'printer_max_build_volume',
        value: buildVolumeValue,
        category: 'system',
        description: 'Maksimum yazıcı baskı alanı boyutları (cm)',
        updated_at: new Date().toISOString()
      } as any, {
        onConflict: 'key'
      });
    
    if (upsertError) {
      console.error('[BuildVolume] Error updating build volume:', upsertError);
      return NextResponse.json(
        { success: false, error: 'Failed to update build volume' },
        { status: 500 }
      );
    }
    
        return NextResponse.json({
      success: true,
      data: { max_x, max_y, max_z }
    });
  } catch (error) {
    console.error('[BuildVolume] Error in POST:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
