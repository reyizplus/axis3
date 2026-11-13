import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { curaSlicer } from '@/lib/pricing/server/slicer';
import { gcodeAnalyzer } from '@/lib/pricing/server/gcode-analyzer';
import type { SlicerProfile } from '@/lib/pricing/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fileId, stlPath, technology, volumeCm3 } = body as {
      fileId: string;
      stlPath: string;
      technology: string;
      volumeCm3: number;
    };

    if (!fileId || !stlPath) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const profile: SlicerProfile = {
      layerHeight: 0.2,
      infillPercentage: 20,
      infillPattern: 'grid',
      printSpeed: 60,
      nozzleDiameter: 0.4,
      filamentDiameter: 1.75,
      materialType: 'PLA',
      bedTemperature: technology === 'FDM' ? 60 : 0,
      nozzleTemperature: 210,
      supportEnabled: true,
      supportStructure: 'normal',
      retractionEnabled: true,
      retractionSpeed: 40,
      retractionDistance: 5,
      fanSpeed: 100,
    };

    const result = await curaSlicer.slice(stlPath, fileId, user.id, profile);

    if (result.success && result.gcodePath) {
      const analysis = await gcodeAnalyzer.analyze(result.gcodePath);

      if (!analysis.success) {
        await curaSlicer.cleanup(result.gcodePath);
        return NextResponse.json(
          { success: false, error: analysis.error || 'G-Code analizi başarısız' },
          { status: 500 }
        );
      }

      await (supabase as any)
        .from('gcode_analysis_results')
        .insert({
          file_id: fileId,
          filament_weight_grams: analysis.filamentWeightGrams,
          support_weight_grams: analysis.supportWeightGrams,
          actual_print_time_hours: analysis.actualPrintTimeHours,
          actual_print_time_seconds: analysis.actualPrintTimeSeconds,
          total_layer_count: analysis.totalLayerCount,
          filament_length_mm: analysis.filamentLengthMm,
          total_travel_distance_mm: analysis.totalTravelDistanceMm,
          total_extrusion_distance_mm: analysis.totalExtrusionDistanceMm,
          retraction_count: analysis.retractionCount,
          min_layer_height_mm: analysis.minLayerHeightMm,
          max_layer_height_mm: analysis.maxLayerHeightMm,
          raw_header: analysis.rawHeader as any,
        });

      await curaSlicer.cleanup(result.gcodePath);

      return NextResponse.json({
        success: true,
        analysis: {
          filamentWeightGrams: analysis.filamentWeightGrams,
          supportWeightGrams: analysis.supportWeightGrams,
          actualPrintTimeHours: analysis.actualPrintTimeHours,
          totalLayerCount: analysis.totalLayerCount,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: result.error || 'Slicing failed',
    }, { status: 500 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
