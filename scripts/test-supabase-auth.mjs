#!/usr/bin/env node
/**
 * Axis3 - Supabase Authentication Test Script
 * Tests: Register, Trigger, Database Sync
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Get credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testAuthentication() {
  console.log('🔍 AXIS3 - AUTHENTICATION TEST PROTOCOL\n');
  console.log('=' .repeat(60));
  
  // Test 1: Check if public.users table exists
  console.log('\n📋 TEST 1: Database Schema Check');
  console.log('-'.repeat(60));
  
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('email')
      .limit(1);
    
    if (error) {
      console.log('❌ FAILED: public.users table does not exist or is not accessible');
      console.log('   Error:', error.message);
      return;
    }
    
    console.log('✅ PASSED: public.users table exists and is accessible');
  } catch (err) {
    console.log('❌ FAILED: Database connection error');
    console.log('   Error:', err.message);
    return;
  }
  
  // Test 2: Register a new test user
  console.log('\n📋 TEST 2: User Registration');
  console.log('-'.repeat(60));
  
  const testEmail = `test.${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  const testFullName = 'Test User CTO';
  
  console.log(`   Email: ${testEmail}`);
  console.log(`   Full Name: ${testFullName}`);
  
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testFullName,
          phone: '+90 555 999 88 77',
          is_corporate: false,
        },
      },
    });
    
    if (signUpError) {
      console.log('❌ FAILED: User registration failed');
      console.log('   Error:', signUpError.message);
      return;
    }
    
    if (!signUpData.user) {
      console.log('❌ FAILED: No user data returned');
      return;
    }
    
    console.log('✅ PASSED: User registered successfully');
    console.log(`   User ID: ${signUpData.user.id}`);
    
    // Test 3: Check if trigger created record in public.users
    console.log('\n📋 TEST 3: Auth Trigger & Database Sync');
    console.log('-'.repeat(60));
    
    // Wait 2 seconds for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('id', signUpData.user.id)
      .single();
    
    if (userError) {
      console.log('❌ FAILED: Trigger did not create record in public.users');
      console.log('   Error:', userError.message);
      console.log('\n🔧 DIAGNOSIS: Auth trigger (005_auth_trigger.sql) not applied to Supabase Cloud');
      return;
    }
    
    if (!userData) {
      console.log('❌ FAILED: No record found in public.users');
      console.log('\n🔧 DIAGNOSIS: Auth trigger not working');
      return;
    }
    
    console.log('✅ PASSED: Trigger successfully synced auth.users → public.users');
    console.log(`   ID: ${userData.id}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Full Name: ${userData.full_name}`);
    console.log(`   Created: ${userData.created_at}`);
    
    // Test 4: Cleanup - Delete test user
    console.log('\n📋 TEST 4: Cleanup');
    console.log('-'.repeat(60));
    
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      signUpData.user.id
    );
    
    if (deleteError) {
      console.log('⚠️  WARNING: Could not delete test user');
      console.log('   Error:', deleteError.message);
    } else {
      console.log('✅ PASSED: Test user deleted successfully');
    }
    
  } catch (err) {
    console.log('❌ FAILED: Unexpected error');
    console.log('   Error:', err.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 TEST PROTOCOL COMPLETED\n');
}

// Run tests
testAuthentication().catch(console.error);
