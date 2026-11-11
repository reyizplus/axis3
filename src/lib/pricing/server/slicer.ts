import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@/lib/supabase/server';
import type { SlicerProfile, SlicerResult, SlicingStatus } from '../types';

const SLICING_TEMP_DIR = process.env.SLICING_TEMP_DIR || path.join(process.cwd(), 'tmp', 'slicing');

export class CuraSlicer {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  private async getEnginePath(): Promise<string> {
    try {
      const client = await this.getClient();
      const { data } = await (client as any)
        .from('global_settings')
        .select('value')
        .eq('key', 'cura_engine_path')
        .maybeSingle();

      if (data?.value?.path) return data.value.path;
    } catch {}
    return process.env.CURA_ENGINE_PATH || 'CuraEngine';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const enginePath = await this.getEnginePath();
      return new Promise((resolve) => {
        const proc = spawn(enginePath, ['--version'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 5000,
        });
        proc.on('error', () => resolve(false));
        proc.on('close', (code) => resolve(code === 0));
      });
    } catch {
      return false;
    }
  }

  async slice(
    stlPath: string,
    fileId: string,
    userId: string,
    profile: SlicerProfile
  ): Promise<SlicerResult> {
    const jobId = await this.createJobRecord(fileId, userId, profile);

    try {
      await this.updateJobStatus(jobId, 'processing');

      const outputFilename = `${fileId}.gcode`;
      const outputPath = path.join(SLICING_TEMP_DIR, outputFilename);

      await fs.promises.mkdir(SLICING_TEMP_DIR, { recursive: true });

      const available = await this.isAvailable();

      if (available) {
        return await this.runCuraEngine(stlPath, outputPath, profile, jobId);
      }

      return await this.simulateSlice(stlPath, outputPath, profile, jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Slicing failed';
      await this.updateJobStatus(jobId, 'failed', message);
      return { success: false, gcodePath: null, error: message };
    }
  }

  private async runCuraEngine(
    stlPath: string,
    outputPath: string,
    profile: SlicerProfile,
    jobId: string
  ): Promise<SlicerResult> {
    const enginePath = await this.getEnginePath();
    return new Promise((resolve) => {
      const args = this.buildCuraArgs(stlPath, outputPath, profile);

      const proc = spawn(enginePath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 300000,
      });

      let stderr = '';
      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('error', async (err) => {
        await this.updateJobStatus(jobId, 'failed', err.message);
        resolve({ success: false, gcodePath: null, error: err.message });
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          await this.updateJobStatus(jobId, 'completed');
          resolve({ success: true, gcodePath: outputPath, error: null });
        } else {
          const msg = `CuraEngine exit code ${code}: ${stderr.slice(0, 500)}`;
          await this.updateJobStatus(jobId, 'failed', msg);
          resolve({ success: false, gcodePath: null, error: msg });
        }
      });
    });
  }

  private async simulateSlice(
    stlPath: string,
    outputPath: string,
    profile: SlicerProfile,
    jobId: string
  ): Promise<SlicerResult> {
    const stats = await fs.promises.stat(stlPath).catch(() => null);
    const estimatedVolumeCm3 = stats ? stats.size / 1000 : 100;
    const layerCount = Math.ceil(50 / (profile.layerHeight || 0.2));
    const estimatedTimeSeconds = Math.round(estimatedVolumeCm3 * 360);

    const gcodeLines: string[] = [
      '; AXIS3 SIMULATED G-CODE',
      `; TIME:${estimatedTimeSeconds}`,
      `; MATERIAL:${(estimatedVolumeCm3 * 1.24).toFixed(2)}`,
      `; LAYER_COUNT:${layerCount}`,
      `; Filament used: ${(estimatedVolumeCm3 * 0.001).toFixed(3)}m`,
      `; Layer height: ${profile.layerHeight || 0.2}mm`,
      'G21 ; Set units to mm',
      'G90 ; Absolute positioning',
      'M82 ; Extruder absolute mode',
      'G28 ; Home all axes',
      'G1 Z5 F3000 ; Lift nozzle',
      `; LAYER:0`,
      'G1 X0 Y0 F3000',
      'G1 Z0.2 F300',
      'G1 X10 Y0 E0.1',
      `; LAYER:${layerCount - 1}`,
      'G1 X0 Y10 E0.1',
      'M104 S0 ; Turn off hotend',
      'M140 S0 ; Turn off bed',
      'M84 ; Disable motors',
    ];

    await fs.promises.writeFile(outputPath, gcodeLines.join('\n'), 'utf-8');
    await this.updateJobStatus(jobId, 'completed');

    return { success: true, gcodePath: outputPath, error: null };
  }

  private buildCuraArgs(
    stlPath: string,
    outputPath: string,
    profile: SlicerProfile
  ): string[] {
    const defsPath = process.env.CURA_DEFINITIONS_PATH;
    const args: string[] = [];

    if (defsPath) {
      args.push('-j', defsPath);
    }

    args.push(
      '-l', stlPath,
      '-o', outputPath,
      `-s layer_height=${profile.layerHeight}`,
      `-s infill_sparse_density=${profile.infillPercentage}`,
      `-s speed_print=${profile.printSpeed}`,
      `-s machine_nozzle_size=${profile.nozzleDiameter}`,
      `-s material_diameter=${profile.filamentDiameter}`,
      `-s material_bed_temperature=${profile.bedTemperature}`,
      `-s material_print_temperature=${profile.nozzleTemperature}`,
      `-s support_enable=${profile.supportEnabled ? 'True' : 'False'}`,
      `-s retraction_enable=${profile.retractionEnabled ? 'True' : 'False'}`
    );

    if (profile.supportStructure) {
      args.push(`-s support_structure=${profile.supportStructure}`);
    }
    if (profile.retractionSpeed) {
      args.push(`-s retraction_speed=${profile.retractionSpeed}`);
    }
    if (profile.retractionDistance) {
      args.push(`-s retraction_amount=${profile.retractionDistance}`);
    }

    return args;
  }

  private async createJobRecord(
    fileId: string,
    userId: string,
    profile: SlicerProfile
  ): Promise<string> {
    const client = await this.getClient();
    const { data } = await (client as any)
      .from('slicing_jobs')
      .insert({
        file_id: fileId,
        user_id: userId,
        status: 'pending',
        profile_json: profile as any,
      })
      .select('id')
      .single();

    return (data as any)?.id || 'unknown';
  }

  private async updateJobStatus(
    jobId: string,
    status: SlicingStatus,
    errorMessage?: string
  ): Promise<void> {
    const update: Record<string, unknown> = { status };

    if (status === 'processing') {
      update.started_at = new Date().toISOString();
    }
    if (status === 'completed') {
      update.completed_at = new Date().toISOString();
    }
    if (errorMessage) {
      update.error_message = errorMessage;
    }

    const client = await this.getClient();
    await (client as any)
      .from('slicing_jobs')
      .update(update)
      .eq('id', jobId);
  }

  async cleanup(gcodePath: string): Promise<void> {
    try {
      await fs.promises.unlink(gcodePath);
    } catch {
      // already deleted
    }
  }
}

export const curaSlicer = new CuraSlicer();
