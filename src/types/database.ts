/**
 * Axis3 - Database Type Definitions
 *
 * Auto-generated types from Supabase schema.
 * This file should be regenerated when database schema changes.
 *
 * Command: npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admin_permissions: {
        Row: {
          id: string; user_id: string; section_key: string
          granted_by: string | null; created_at: string
        }
        Insert: {
          id?: string; user_id: string; section_key: string
          granted_by?: string | null; created_at?: string
        }
        Update: {
          id?: string; user_id?: string; section_key?: string
          granted_by?: string | null; created_at?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          id: string; user_id: string; title: string; full_name: string; phone: string
          address_line1: string; address_line2: string | null; city: string; district: string
          postal_code: string | null; country: string; is_default: boolean
          address_type: 'shipping' | 'billing' | 'both'; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id: string; title: string; full_name: string; phone: string
          address_line1: string; address_line2?: string | null; city: string; district: string
          postal_code?: string | null; country?: string; is_default?: boolean
          address_type?: 'shipping' | 'billing' | 'both'; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; user_id?: string; title?: string; full_name?: string; phone?: string
          address_line1?: string; address_line2?: string | null; city?: string; district?: string
          postal_code?: string | null; country?: string; is_default?: boolean
          address_type?: 'shipping' | 'billing' | 'both'; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string; user_id: string | null; action: string; entity_type: string; entity_id: string
          old_values: Json | null; new_values: Json | null; ip_address: string | null
          user_agent: string | null; created_at: string
        }
        Insert: {
          id?: string; user_id?: string | null; action: string; entity_type: string; entity_id: string
          old_values?: Json | null; new_values?: Json | null; ip_address?: string | null
          user_agent?: string | null; created_at?: string
        }
        Update: {
          id?: string; user_id?: string | null; action?: string; entity_type?: string; entity_id?: string
          old_values?: Json | null; new_values?: Json | null; ip_address?: string | null
          user_agent?: string | null; created_at?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          id: string; bank_name: string; account_holder: string; iban: string
          branch_name: string | null; branch_code: string | null; account_number: string | null
          swift_code: string | null; currency: string; is_active: boolean; display_order: number
          notes: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; bank_name: string; account_holder: string; iban: string
          branch_name?: string | null; branch_code?: string | null; account_number?: string | null
          swift_code?: string | null; currency?: string; is_active?: boolean; display_order?: number
          notes?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; bank_name?: string; account_holder?: string; iban?: string
          branch_name?: string | null; branch_code?: string | null; account_number?: string | null
          swift_code?: string | null; currency?: string; is_active?: boolean; display_order?: number
          notes?: string | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          id: string; name: string; slug: string; description: string | null
          parent_id: string | null; sort_order: number; is_active: boolean
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; name: string; slug: string; description?: string | null
          parent_id?: string | null; sort_order?: number; is_active?: boolean
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; name?: string; slug?: string; description?: string | null
          parent_id?: string | null; sort_order?: number; is_active?: boolean
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          id: string; category_id: string | null; author_id: string | null; title: string; slug: string
          excerpt: string | null; content: string; featured_image: string | null
          meta_title: string | null; meta_description: string | null; meta_keywords: string | null
          status: 'draft' | 'published' | 'archived'; published_at: string | null
          view_count: number; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; category_id?: string | null; author_id?: string | null; title: string; slug: string
          excerpt?: string | null; content: string; featured_image?: string | null
          meta_title?: string | null; meta_description?: string | null; meta_keywords?: string | null
          status?: 'draft' | 'published' | 'archived'; published_at?: string | null
          view_count?: number; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; category_id?: string | null; author_id?: string | null; title?: string; slug?: string
          excerpt?: string | null; content?: string; featured_image?: string | null
          meta_title?: string | null; meta_description?: string | null; meta_keywords?: string | null
          status?: 'draft' | 'published' | 'archived'; published_at?: string | null
          view_count?: number; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          id: string; ip_address: string; reason: string | null
          blocked_by: string | null; blocked_at: string; expires_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string; ip_address: string; reason?: string | null
          blocked_by?: string | null; blocked_at?: string; expires_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string; ip_address?: string; reason?: string | null
          blocked_by?: string | null; blocked_at?: string; expires_at?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          id: string; cart_id: string; file_id: string | null; filename: string
          volume_cm3: number | null; material_id: string; material_name: string
          print_setting_id: string; print_setting_name: string; quantity: number
          unit_price: number; total_price: number; estimated_time: number | null
          technology: 'FDM' | 'SLA' | null; color: string | null; nozzle_size_id: string | null
          nozzle_size_mm: number | null; is_preorder: boolean | null
          preorder_discount_percent: number | null; estimated_restock_days: number | null
          custom_layer_height: number | null; custom_infill_percentage: number | null
          custom_time_multiplier: number | null; custom_layer_thickness: number | null
          custom_exposure_time: number | null; delivery_days: number | null
          cart_version: number
          created_at: string
        }
        Insert: {
          id?: string; cart_id: string; file_id?: string | null; filename: string
          volume_cm3?: number | null; material_id: string; material_name: string
          print_setting_id: string; print_setting_name: string; quantity?: number
          unit_price?: number; total_price?: number; estimated_time?: number | null
          technology?: 'FDM' | 'SLA' | null; color?: string | null; nozzle_size_id?: string | null
          nozzle_size_mm?: number | null; is_preorder?: boolean | null
          preorder_discount_percent?: number | null; estimated_restock_days?: number | null
          custom_layer_height?: number | null; custom_infill_percentage?: number | null
          custom_time_multiplier?: number | null; custom_layer_thickness?: number | null
          custom_exposure_time?: number | null; delivery_days?: number | null
          cart_version?: number
          created_at?: string
        }
        Update: {
          id?: string; cart_id?: string; file_id?: string | null; filename?: string
          volume_cm3?: number | null; material_id?: string; material_name?: string
          print_setting_id?: string; print_setting_name?: string; quantity?: number
          unit_price?: number; total_price?: number; estimated_time?: number | null
          technology?: 'FDM' | 'SLA' | null; color?: string | null; nozzle_size_id?: string | null
          nozzle_size_mm?: number | null; is_preorder?: boolean | null
          preorder_discount_percent?: number | null; estimated_restock_days?: number | null
          custom_layer_height?: number | null; custom_infill_percentage?: number | null
          custom_time_multiplier?: number | null; custom_layer_thickness?: number | null
          custom_exposure_time?: number | null; delivery_days?: number | null
          cart_version?: number
          created_at?: string
        }
        Relationships: []
      }
      carts: {
        Row: {
          id: string; user_id: string; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id: string; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; user_id?: string; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      corporate_pricing_rules: {
        Row: {
          id: string; user_id: string; base_discount_percentage: number
          volume_tier_multiplier: number; minimum_order_value: number
          monthly_volume_bonus: boolean; monthly_volume_threshold: number
          monthly_bonus_percentage: number; custom_rules: Json; is_active: boolean
          approved_by: string | null; approved_at: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id: string; base_discount_percentage?: number
          volume_tier_multiplier?: number; minimum_order_value?: number
          monthly_volume_bonus?: boolean; monthly_volume_threshold?: number
          monthly_bonus_percentage?: number; custom_rules?: Json; is_active?: boolean
          approved_by?: string | null; approved_at?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; user_id?: string; base_discount_percentage?: number
          volume_tier_multiplier?: number; minimum_order_value?: number
          monthly_volume_bonus?: boolean; monthly_volume_threshold?: number
          monthly_bonus_percentage?: number; custom_rules?: Json; is_active?: boolean
          approved_by?: string | null; approved_at?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          id: string; user_id: string | null; category: string; title: string; description: string
          status: string; priority: string; admin_response: string | null; admin_id: string | null
          responded_at: string | null; user_agent: string | null; page_url: string | null
          screenshot_url: string | null; metadata: Json
          contact_name: string | null; contact_email: string | null; contact_phone: string | null
          created_at: string; updated_at: string; deleted_at: string | null
        }
        Insert: {
          id?: string; user_id?: string | null; category: string; title: string; description: string
          status?: string; priority?: string; admin_response?: string | null; admin_id?: string | null
          responded_at?: string | null; user_agent?: string | null; page_url?: string | null
          screenshot_url?: string | null; metadata?: Json
          contact_name?: string | null; contact_email?: string | null; contact_phone?: string | null
          created_at?: string; updated_at?: string; deleted_at?: string | null
        }
        Update: {
          id?: string; user_id?: string | null; category?: string; title?: string; description?: string
          status?: string; priority?: string; admin_response?: string | null; admin_id?: string | null
          responded_at?: string | null; user_agent?: string | null; page_url?: string | null
          screenshot_url?: string | null; metadata?: Json
          contact_name?: string | null; contact_email?: string | null; contact_phone?: string | null
          created_at?: string; updated_at?: string; deleted_at?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          id: string; user_id: string; filename: string; original_filename: string; file_size: number
          mime_type: string; storage_path: string; volume_cm3: number | null
          surface_area_cm2: number | null; bounding_box_x: number | null
          bounding_box_y: number | null; bounding_box_z: number | null
          triangle_count: number | null; is_manifold: boolean | null; has_errors: boolean
          error_details: Json | null; thumbnail_path: string | null; preview_data: Json | null
          analysis_status: string; metadata: Json; color: string | null
          session_id: string | null; guest_email: string | null; guest_token: string | null
          created_at: string; updated_at: string; deleted_at: string | null
        }
        Insert: {
          id?: string; user_id: string; filename: string; original_filename: string; file_size: number
          mime_type?: string; storage_path: string; volume_cm3?: number | null
          surface_area_cm2?: number | null; bounding_box_x?: number | null
          bounding_box_y?: number | null; bounding_box_z?: number | null
          triangle_count?: number | null; is_manifold?: boolean | null; has_errors?: boolean
          error_details?: Json | null; thumbnail_path?: string | null; preview_data?: Json | null
          analysis_status?: string; metadata?: Json; color?: string | null
          session_id?: string | null; guest_email?: string | null; guest_token?: string | null
          created_at?: string; updated_at?: string; deleted_at?: string | null
        }
        Update: {
          id?: string; user_id?: string; filename?: string; original_filename?: string; file_size?: number
          mime_type?: string; storage_path?: string; volume_cm3?: number | null
          surface_area_cm2?: number | null; bounding_box_x?: number | null
          bounding_box_y?: number | null; bounding_box_z?: number | null
          triangle_count?: number | null; is_manifold?: boolean | null; has_errors?: boolean
          error_details?: Json | null; thumbnail_path?: string | null; preview_data?: Json | null
          analysis_status?: string; metadata?: Json; color?: string | null
          session_id?: string | null; guest_email?: string | null; guest_token?: string | null
          created_at?: string; updated_at?: string; deleted_at?: string | null
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          id: string; key: string; value: Json; category: string; description: string | null
          is_public: boolean; updated_by: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; key: string; value: Json; category: string; description?: string | null
          is_public?: boolean; updated_by?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; key?: string; value?: Json; category?: string; description?: string | null
          is_public?: boolean; updated_by?: string | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      guest_sessions: {
        Row: {
          id: string; session_id: string; email: string | null; ip_address: string | null
          user_agent: string | null; files_uploaded: number; last_activity: string
          converted_to_user_id: string | null; converted_at: string | null
          metadata: Json; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; session_id: string; email?: string | null; ip_address?: string | null
          user_agent?: string | null; files_uploaded?: number; last_activity?: string
          converted_to_user_id?: string | null; converted_at?: string | null
          metadata?: Json; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; session_id?: string; email?: string | null; ip_address?: string | null
          user_agent?: string | null; files_uploaded?: number; last_activity?: string
          converted_to_user_id?: string | null; converted_at?: string | null
          metadata?: Json; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          id: string; type: 'filament' | 'nozzle' | 'resin' | 'other'; name: string
          sku: string | null; quantity_on_hand: number; minimum_stock: number
          unit_cost: number | null; is_active: boolean; description: string | null
          material_id: string | null; color: string | null; hex_color: string | null
          spool_weight_grams: number | null; nozzle_size_id: string | null
          allow_preorder: boolean; preorder_discount_percent: number | null
          estimated_restock_days: number; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; type: 'filament' | 'nozzle' | 'resin' | 'other'; name: string
          sku?: string | null; quantity_on_hand?: number; minimum_stock?: number
          unit_cost?: number | null; is_active?: boolean; description?: string | null
          material_id?: string | null; color?: string | null; hex_color?: string | null
          spool_weight_grams?: number | null; nozzle_size_id?: string | null
          allow_preorder?: boolean; preorder_discount_percent?: number | null
          estimated_restock_days?: number; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; type?: 'filament' | 'nozzle' | 'resin' | 'other'; name?: string
          sku?: string | null; quantity_on_hand?: number; minimum_stock?: number
          unit_cost?: number | null; is_active?: boolean; description?: string | null
          material_id?: string | null; color?: string | null; hex_color?: string | null
          spool_weight_grams?: number | null; nozzle_size_id?: string | null
          allow_preorder?: boolean; preorder_discount_percent?: number | null
          estimated_restock_days?: number; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      ip_activity_logs: {
        Row: {
          id: string; ip_address: string; user_id: string | null
          user_agent: string | null; device_type: string; page_url: string | null
          created_at: string
        }
        Insert: {
          id?: string; ip_address: string; user_id?: string | null
          user_agent?: string | null; device_type?: string; page_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string; ip_address?: string; user_id?: string | null
          user_agent?: string | null; device_type?: string; page_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          id: string; name: string; code: string; technology: 'FDM' | 'SLA'
          density: number; cost_per_gram: number; color: string | null; hex_color: string | null
          image_url: string | null; properties: Json; description: string | null
          is_active: boolean; sort_order: number; print_speed_modifier: number | null
          stock_status: string | null; lead_time_days: number | null
          preorder_allowed: boolean | null; preorder_discount_percent: number | null
          estimated_restock_days: number | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; name: string; code: string; technology: 'FDM' | 'SLA'
          density: number; cost_per_gram: number; color?: string | null; hex_color?: string | null
          image_url?: string | null; properties?: Json; description?: string | null
          is_active?: boolean; sort_order?: number; print_speed_modifier?: number | null
          stock_status?: string | null; lead_time_days?: number | null
          preorder_allowed?: boolean | null; preorder_discount_percent?: number | null
          estimated_restock_days?: number | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; name?: string; code?: string; technology?: 'FDM' | 'SLA'
          density?: number; cost_per_gram?: number; color?: string | null; hex_color?: string | null
          image_url?: string | null; properties?: Json; description?: string | null
          is_active?: boolean; sort_order?: number; print_speed_modifier?: number | null
          stock_status?: string | null; lead_time_days?: number | null
          preorder_allowed?: boolean | null; preorder_discount_percent?: number | null
          estimated_restock_days?: number | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      nozzle_sizes: {
        Row: {
          id: string; size_mm: number; display_name: string
          compatible_technology: 'FDM' | 'SLA'; is_active: boolean; sort_order: number
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; size_mm: number; display_name: string
          compatible_technology?: 'FDM' | 'SLA'; is_active?: boolean; sort_order?: number
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; size_mm?: number; display_name?: string
          compatible_technology?: 'FDM' | 'SLA'; is_active?: boolean; sort_order?: number
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string; order_id: string; file_id: string; price_calculation_id: string | null
          filename: string; material_name: string; print_setting_name: string; quantity: number
          unit_price: number; discount_percentage: number; subtotal: number
          production_status: string; print_started_at: string | null
          print_completed_at: string | null; print_duration_minutes: number | null
          printer_id: string | null; quality_check_passed: boolean | null
          quality_notes: string | null; color: string | null; nozzle_size_id: string | null
          nozzle_size_mm: number | null; custom_layer_height: number | null
          custom_infill_percentage: number | null; custom_time_multiplier: number | null
          custom_layer_thickness: number | null; custom_exposure_time: number | null
          is_preorder: boolean | null; preorder_discount_percent: number | null
          estimated_restock_days: number | null; price_breakdown: Json | null
          estimated_print_hours: number | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; order_id: string; file_id: string; price_calculation_id?: string | null
          filename: string; material_name: string; print_setting_name: string; quantity?: number
          unit_price: number; discount_percentage?: number; subtotal: number
          production_status?: string; print_started_at?: string | null
          print_completed_at?: string | null; print_duration_minutes?: number | null
          printer_id?: string | null; quality_check_passed?: boolean | null
          quality_notes?: string | null; color?: string | null; nozzle_size_id?: string | null
          nozzle_size_mm?: number | null; custom_layer_height?: number | null
          custom_infill_percentage?: number | null; custom_time_multiplier?: number | null
          custom_layer_thickness?: number | null; custom_exposure_time?: number | null
          is_preorder?: boolean | null; preorder_discount_percent?: number | null
          estimated_restock_days?: number | null; price_breakdown?: Json | null
          estimated_print_hours?: number | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; order_id?: string; file_id?: string; price_calculation_id?: string | null
          filename?: string; material_name?: string; print_setting_name?: string; quantity?: number
          unit_price?: number; discount_percentage?: number; subtotal?: number
          production_status?: string; print_started_at?: string | null
          print_completed_at?: string | null; print_duration_minutes?: number | null
          printer_id?: string | null; quality_check_passed?: boolean | null
          quality_notes?: string | null; color?: string | null; nozzle_size_id?: string | null
          nozzle_size_mm?: number | null; custom_layer_height?: number | null
          custom_infill_percentage?: number | null; custom_time_multiplier?: number | null
          custom_layer_thickness?: number | null; custom_exposure_time?: number | null
          is_preorder?: boolean | null; preorder_discount_percent?: number | null
          estimated_restock_days?: number | null; price_breakdown?: Json | null
          estimated_print_hours?: number | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          id: string; order_id: string; from_status: string | null; to_status: string
          changed_by: string | null; notes: string | null; created_at: string
        }
        Insert: {
          id?: string; order_id: string; from_status?: string | null; to_status: string
          changed_by?: string | null; notes?: string | null; created_at?: string
        }
        Update: {
          id?: string; order_id?: string; from_status?: string | null; to_status?: string
          changed_by?: string | null; notes?: string | null; created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string; user_id: string; order_number: string;           shipping_address: Json
          billing_address: Json; subtotal: number; discount_amount: number; tax_amount: number
          shipping_cost: number; total_amount: number; status: string
          customer_notes: string | null; admin_notes: string | null
          shipping_method: string | null; tracking_number: string | null
          cargo_company: string | null; cargo_status: string | null
          cargo_price: number | null; share_tracking_link: boolean | null
          shipped_at: string | null; delivered_at: string | null; cancelled_at: string | null
          cancelled_reason: string | null; refunded_at: string | null
          refund_amount: number | null; payment_status: string; payment_id: string | null
          payment_method: string | null; payment_date: string | null
          payment_token: string | null; payment_error: string | null
          proof_image_url: string | null; proof_notes: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id: string; order_number: string; shipping_address: Json
          billing_address: Json; subtotal: number; discount_amount?: number; tax_amount: number
          shipping_cost?: number; total_amount: number; status?: string
          customer_notes?: string | null; admin_notes?: string | null
          shipping_method?: string | null; tracking_number?: string | null
          cargo_company?: string | null; cargo_status?: string | null
          cargo_price?: number | null; share_tracking_link?: boolean | null
          shipped_at?: string | null; delivered_at?: string | null; cancelled_at?: string | null
          cancelled_reason?: string | null; refunded_at?: string | null
          refund_amount?: number | null; payment_status?: string; payment_id?: string | null
          payment_method?: string | null; payment_date?: string | null
          payment_token?: string | null; payment_error?: string | null
          proof_image_url?: string | null; proof_notes?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; user_id?: string; order_number?: string; shipping_address?: Json
          billing_address?: Json; subtotal?: number; discount_amount?: number; tax_amount?: number
          shipping_cost?: number; total_amount?: number; status?: string
          customer_notes?: string | null; admin_notes?: string | null
          shipping_method?: string | null; tracking_number?: string | null
          cargo_company?: string | null; cargo_status?: string | null
          cargo_price?: number | null; share_tracking_link?: boolean | null
          shipped_at?: string | null; delivered_at?: string | null; cancelled_at?: string | null
          cancelled_reason?: string | null; refunded_at?: string | null
          refund_amount?: number | null; payment_status?: string; payment_id?: string | null
          payment_method?: string | null; payment_date?: string | null
          payment_token?: string | null; payment_error?: string | null
          proof_image_url?: string | null; proof_notes?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          id: string; user_id: string; token: string; url_token: string | null; expires_at: string
          used_at: string | null; created_at: string
        }
        Insert: {
          id?: string; user_id: string; token: string; url_token?: string | null; expires_at: string
          used_at?: string | null; created_at?: string
        }
        Update: {
          id?: string; user_id?: string; token?: string; url_token?: string | null; expires_at?: string
          used_at?: string | null; created_at?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          id: string; gateway_type: string; display_name: string; description: string | null
          is_enabled: boolean; display_order: number; icon_name: string | null
          configuration: Json; metadata: Json; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; gateway_type: string; display_name: string; description?: string | null
          is_enabled?: boolean; display_order?: number; icon_name?: string | null
          configuration?: Json; metadata?: Json; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; gateway_type?: string; display_name?: string; description?: string | null
          is_enabled?: boolean; display_order?: number; icon_name?: string | null
          configuration?: Json; metadata?: Json; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      payment_gateway_logs: {
        Row: {
          id: string; gateway_id: string | null; action: string; performed_by: string | null
          old_value: Json | null; new_value: Json | null; ip_address: string | null
          user_agent: string | null; created_at: string
        }
        Insert: {
          id?: string; gateway_id?: string | null; action: string; performed_by?: string | null
          old_value?: Json | null; new_value?: Json | null; ip_address?: string | null
          user_agent?: string | null; created_at?: string
        }
        Update: {
          id?: string; gateway_id?: string | null; action?: string; performed_by?: string | null
          old_value?: Json | null; new_value?: Json | null; ip_address?: string | null
          user_agent?: string | null; created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string; order_id: string; payment_method: string; amount: number; currency: string
          gateway: string; transaction_id: string | null; conversation_id: string | null
          status: string; gateway_response: Json | null; error_message: string | null
          paid_at: string | null; refunded_at: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; order_id: string; payment_method: string; amount: number; currency?: string
          gateway?: string; transaction_id?: string | null; conversation_id?: string | null
          status?: string; gateway_response?: Json | null; error_message?: string | null
          paid_at?: string | null; refunded_at?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; order_id?: string; payment_method?: string; amount?: number; currency?: string
          gateway?: string; transaction_id?: string | null; conversation_id?: string | null
          status?: string; gateway_response?: Json | null; error_message?: string | null
          paid_at?: string | null; refunded_at?: string | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      pending_2fa_sessions: {
        Row: {
          id: string; email: string; password_hash: string; two_factor_enabled: boolean
          user_metadata: Json; expires_at: string; used: boolean; created_at: string
        }
        Insert: {
          id?: string; email: string; password_hash: string; two_factor_enabled?: boolean
          user_metadata?: Json; expires_at: string; used?: boolean; created_at?: string
        }
        Update: {
          id?: string; email?: string; password_hash?: string; two_factor_enabled?: boolean
          user_metadata?: Json; expires_at?: string; used?: boolean; created_at?: string
        }
        Relationships: []
      }
      price_calculations: {
        Row: {
          id: string; file_id: string; material_id: string; print_setting_id: string
          volume_cm3: number; weight_grams: number; print_time_hours: number
          material_cost: number; labor_cost: number; energy_cost: number; overhead_cost: number
          base_price: number; profit_margin: number; total_price: number
          quantity_discounts: Json; calculation_params: Json; created_at: string; expires_at: string
        }
        Insert: {
          id?: string; file_id: string; material_id: string; print_setting_id: string
          volume_cm3: number; weight_grams: number; print_time_hours: number
          material_cost: number; labor_cost: number; energy_cost: number; overhead_cost: number
          base_price: number; profit_margin: number; total_price: number
          quantity_discounts?: Json; calculation_params?: Json; created_at?: string; expires_at?: string
        }
        Update: {
          id?: string; file_id?: string; material_id?: string; print_setting_id?: string
          volume_cm3?: number; weight_grams?: number; print_time_hours?: number
          material_cost?: number; labor_cost?: number; energy_cost?: number; overhead_cost?: number
          base_price?: number; profit_margin?: number; total_price?: number
          quantity_discounts?: Json; calculation_params?: Json; created_at?: string; expires_at?: string
        }
        Relationships: []
      }
      pricing_history: {
        Row: {
          id: string; file_id: string | null; material_id: string | null
          print_setting_id: string | null; volume_cm3: number | null
          calculated_price: number | null; price_breakdown: Json | null
          settings_snapshot: Json | null; created_at: string
        }
        Insert: {
          id?: string; file_id?: string | null; material_id?: string | null
          print_setting_id?: string | null; volume_cm3?: number | null
          calculated_price?: number | null; price_breakdown?: Json | null
          settings_snapshot?: Json | null; created_at?: string
        }
        Update: {
          id?: string; file_id?: string | null; material_id?: string | null
          print_setting_id?: string | null; volume_cm3?: number | null
          calculated_price?: number | null; price_breakdown?: Json | null
          settings_snapshot?: Json | null; created_at?: string
        }
        Relationships: []
      }
      print_settings: {
        Row: {
          id: string; name: string; code: string; technology: 'FDM' | 'SLA'
          layer_height: number | null; infill_percentage: number | null
          print_speed: number | null; layer_thickness: number | null
          exposure_time: number | null; time_multiplier: number; price_multiplier: number
          description: string | null; is_active: boolean; sort_order: number
          quality_premium: number | null; requires_nozzle_size_id: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; name: string; code: string; technology: 'FDM' | 'SLA'
          layer_height?: number | null; infill_percentage?: number | null
          print_speed?: number | null; layer_thickness?: number | null
          exposure_time?: number | null; time_multiplier?: number; price_multiplier?: number
          description?: string | null; is_active?: boolean; sort_order?: number
          quality_premium?: number | null; requires_nozzle_size_id?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; name?: string; code?: string; technology?: 'FDM' | 'SLA'
          layer_height?: number | null; infill_percentage?: number | null
          print_speed?: number | null; layer_thickness?: number | null
          exposure_time?: number | null; time_multiplier?: number; price_multiplier?: number
          description?: string | null; is_active?: boolean; sort_order?: number
          quality_premium?: number | null; requires_nozzle_size_id?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      store_cart_items: {
        Row: {
          id: string; user_id: string; product_id: string; product_name: string
          product_slug: string; image_url: string | null; unit_price: number
          quantity: number; total_price: number; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id: string; product_id: string; product_name: string
          product_slug: string; image_url?: string | null; unit_price: number
          quantity?: number; total_price: number; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; user_id?: string; product_id?: string; product_name?: string
          product_slug?: string; image_url?: string | null; unit_price?: number
          quantity?: number; total_price?: number; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      store_categories: {
        Row: {
          id: string; parent_id: string | null; name: string; slug: string
          description: string | null; image_url: string | null; sort_order: number
          is_active: boolean; seo_title: string | null; seo_description: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; parent_id?: string | null; name: string; slug: string
          description?: string | null; image_url?: string | null; sort_order?: number
          is_active?: boolean; seo_title?: string | null; seo_description?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; parent_id?: string | null; name?: string; slug?: string
          description?: string | null; image_url?: string | null; sort_order?: number
          is_active?: boolean; seo_title?: string | null; seo_description?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      store_order_items: {
        Row: {
          id: string; order_id: string; product_id: string; product_name: string
          product_slug: string; sku: string | null; unit_price: number; quantity: number
          subtotal: number; metadata: Json; created_at: string
        }
        Insert: {
          id?: string; order_id: string; product_id: string; product_name: string
          product_slug: string; sku?: string | null; unit_price: number; quantity?: number
          subtotal: number; metadata?: Json; created_at?: string
        }
        Update: {
          id?: string; order_id?: string; product_id?: string; product_name?: string
          product_slug?: string; sku?: string | null; unit_price?: number; quantity?: number
          subtotal?: number; metadata?: Json; created_at?: string
        }
        Relationships: []
      }
      store_product_images: {
        Row: {
          id: string; product_id: string; image_url: string; alt_text: string | null
          sort_order: number; is_main: boolean; created_at: string
        }
        Insert: {
          id?: string; product_id: string; image_url: string; alt_text?: string | null
          sort_order?: number; is_main?: boolean; created_at?: string
        }
        Update: {
          id?: string; product_id?: string; image_url?: string; alt_text?: string | null
          sort_order?: number; is_main?: boolean; created_at?: string
        }
        Relationships: []
      }
      store_products: {
        Row: {
          id: string; category_id: string | null; name: string; slug: string
          description: string | null; short_description: string | null; price: number
          compare_at_price: number | null; cost_price: number | null; stock_quantity: number
          track_stock: boolean; allow_backorder: boolean; sku: string | null
          barcode: string | null; weight_grams: number | null; unit: string
          main_image_url: string | null; is_active: boolean; is_featured: boolean
          sort_order: number; seo_title: string | null; seo_description: string | null
          metadata: Json; created_at: string; updated_at: string; deleted_at: string | null
        }
        Insert: {
          id?: string; category_id?: string | null; name: string; slug: string
          description?: string | null; short_description?: string | null; price: number
          compare_at_price?: number | null; cost_price?: number | null; stock_quantity?: number
          track_stock?: boolean; allow_backorder?: boolean; sku?: string | null
          barcode?: string | null; weight_grams?: number | null; unit?: string
          main_image_url?: string | null; is_active?: boolean; is_featured?: boolean
          sort_order?: number; seo_title?: string | null; seo_description?: string | null
          metadata?: Json; created_at?: string; updated_at?: string; deleted_at?: string | null
        }
        Update: {
          id?: string; category_id?: string | null; name?: string; slug?: string
          description?: string | null; short_description?: string | null; price?: number
          compare_at_price?: number | null; cost_price?: number | null; stock_quantity?: number
          track_stock?: boolean; allow_backorder?: boolean; sku?: string | null
          barcode?: string | null; weight_grams?: number | null; unit?: string
          main_image_url?: string | null; is_active?: boolean; is_featured?: boolean
          sort_order?: number; seo_title?: string | null; seo_description?: string | null
          metadata?: Json; created_at?: string; updated_at?: string; deleted_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string; key: string; value: Json; description: string | null
          is_public: boolean; updated_by: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; key: string; value: Json; description?: string | null
          is_public?: boolean; updated_by?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; key?: string; value?: Json; description?: string | null
          is_public?: boolean; updated_by?: string | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string; email: string; full_name: string; first_name: string; last_name: string
          phone: string | null; company_name: string | null; is_corporate: boolean
          tax_number: string | null; tax_office: string | null; email_verified: boolean
          email_verified_at: string | null; phone_verified: boolean; two_factor_enabled: boolean
          two_factor_secret: string | null; two_factor_recovery_codes: Json | null
          status: string; preferences: Json
          notification_preferences: Json | null; terms_accepted_at: string | null
          cookie_consent: string | null
          upload_quota_bytes: number | null; upload_quota_reset_at: string | null
          created_at: string; updated_at: string; deleted_at: string | null
        }
        Insert: {
          id?: string; email: string; full_name: string; first_name?: string; last_name?: string
          phone?: string | null; company_name?: string | null; is_corporate?: boolean
          tax_number?: string | null; tax_office?: string | null; email_verified?: boolean
          email_verified_at?: string | null; phone_verified?: boolean; two_factor_enabled?: boolean
          two_factor_secret?: string | null; two_factor_recovery_codes?: Json | null
          status?: string; preferences?: Json
          notification_preferences?: Json | null; terms_accepted_at?: string | null
          cookie_consent?: string | null
          upload_quota_bytes?: number | null; upload_quota_reset_at?: string | null
          created_at?: string; updated_at?: string; deleted_at?: string | null
        }
        Update: {
          id?: string; email?: string; full_name?: string; first_name?: string; last_name?: string
          phone?: string | null; company_name?: string | null; is_corporate?: boolean
          tax_number?: string | null; tax_office?: string | null; email_verified?: boolean
          email_verified_at?: string | null; phone_verified?: boolean; two_factor_enabled?: boolean
          two_factor_secret?: string | null; two_factor_recovery_codes?: Json | null
          status?: string; preferences?: Json
          notification_preferences?: Json | null; terms_accepted_at?: string | null
          cookie_consent?: string | null
          upload_quota_bytes?: number | null; upload_quota_reset_at?: string | null
          created_at?: string; updated_at?: string; deleted_at?: string | null
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          id: string; user_id: string | null; email: string | null; code: string; type: string
          expires_at: string; used_at: string | null; attempts: number; created_at: string
        }
        Insert: {
          id?: string; user_id?: string | null; email?: string | null; code: string; type?: string
          expires_at: string; used_at?: string | null; attempts?: number; created_at?: string
        }
        Update: {
          id?: string; user_id?: string | null; email?: string | null; code?: string; type?: string
          expires_at?: string; used_at?: string | null; attempts?: number; created_at?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          id: string; user_id: string; ip_address: string | null; user_agent: string | null
          device_type: string; page_url: string | null; created_at: string
        }
        Insert: {
          id?: string; user_id: string; ip_address?: string | null; user_agent?: string | null
          device_type?: string; page_url?: string | null; created_at?: string
        }
        Update: {
          id?: string; user_id?: string; ip_address?: string | null; user_agent?: string | null
          device_type?: string; page_url?: string | null; created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      has_enabled_payment_gateways: {
        Args: Record<string, never>
        Returns: boolean
      }
      get_enabled_payment_gateways: {
        Args: Record<string, never>
        Returns: unknown
      }
      check_file_in_orders: {
        Args: { file_uuid: string }
        Returns: boolean
      }
      admin_delete_user_complete: {
        Args: { user_uuid: string }
        Returns: Json
      }
      get_storage_stats: {
        Args: Record<string, never>
        Returns: Json
      }
      has_admin_permission: {
        Args: { section_key: string }
        Returns: boolean
      }
      admin_revoke_admin_role: {
        Args: { user_uuid: string }
        Returns: Json
      }
    }
  }
}
