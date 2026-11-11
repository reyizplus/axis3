/**
 * Debug API: Payment Gateways Status
 * Check payment_gateways table status and configuration
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('payment_gateways')
      .select('count')
      .limit(1);

    if (tableError) {
      return NextResponse.json({
        success: false,
        error: 'Table does not exist or RLS blocking access',
        details: tableError.message,
        code: tableError.code,
      }, { status: 500 });
    }

    // Get all gateways (bypass RLS with service role if needed)
    const { data: allGateways, error: allError } = await supabase
      .from('payment_gateways')
      .select('*')
      .order('display_order');

    // Get enabled gateways using RPC function
    const { data: enabledGateways, error: rpcError } = await supabase
      .rpc('get_enabled_payment_gateways') as { data: any[] | null; error: any };

    // Check if RPC function exists
    const { data: functionCheck, error: functionError } = await supabase
      .rpc('has_enabled_payment_gateways') as { data: boolean | null; error: any };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checks: {
        tableExists: !tableError,
        rpcFunctionExists: !functionError,
        totalGateways: allGateways?.length || 0,
        enabledGateways: Array.isArray(enabledGateways) ? enabledGateways.length : 0,
      },
      data: {
        allGateways: allGateways || [],
        enabledGateways: enabledGateways || [],
        hasEnabledGateways: functionCheck || false,
      },
      errors: {
        allGatewaysError: allError?.message,
        rpcError: rpcError?.message,
        functionError: functionError?.message,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error.message,
    }, { status: 500 });
  }
}
