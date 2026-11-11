/**
 * Axis3 - Global TypeScript Type Definitions
 * 
 * This file contains all shared types used across the application.
 */

// ============================================================================
// Database Types (matching Supabase schema)
// ============================================================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  company_name?: string;
  is_corporate: boolean;
  tax_number?: string;
  tax_office?: string;
  email_verified: boolean;
  phone_verified: boolean;
  status: 'active' | 'suspended' | 'deleted';
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Address {
  id: string;
  user_id: string;
  title: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  district: string;
  postal_code?: string;
  country: string;
  is_default: boolean;
  address_type: 'shipping' | 'billing' | 'both';
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  
  // STL Analysis Results
  volume_cm3?: number;
  surface_area_cm2?: number;
  bounding_box_x?: number;
  bounding_box_y?: number;
  bounding_box_z?: number;
  triangle_count?: number;
  is_manifold?: boolean;
  has_errors: boolean;
  error_details?: Record<string, unknown>;
  
  // Preview
  thumbnail_path?: string;
  preview_data?: Record<string, unknown>;
  
  // Status
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Material {
  id: string;
  name: string;
  code: string;
  technology: 'FDM' | 'SLA';
  density: number;
  cost_per_gram: number;
  color?: string;
  hex_color?: string;
  image_url?: string;
  properties: Record<string, unknown>;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PrintSetting {
  id: string;
  name: string;
  code: string;
  technology: 'FDM' | 'SLA';
  
  // FDM Settings
  layer_height?: number;
  infill_percentage?: number;
  print_speed?: number;
  
  // SLA Settings
  layer_thickness?: number;
  exposure_time?: number;
  
  // Pricing
  time_multiplier: number;
  price_multiplier: number;
  
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PriceCalculation {
  id: string;
  file_id: string;
  material_id: string;
  print_setting_id: string;
  
  // Calculation Details
  volume_cm3: number;
  weight_grams: number;
  print_time_hours: number;
  
  // Cost Breakdown
  material_cost: number;
  labor_cost: number;
  energy_cost: number;
  overhead_cost: number;
  
  // Price
  base_price: number;
  profit_margin: number;
  total_price: number;
  
  // Quantity Discounts
  quantity_discounts: Record<number, number>;
  
  calculation_params: Record<string, unknown>;
  created_at: string;
  expires_at: string;
}

// =====================================================
// Pricing v2 Types
// =====================================================

export interface PricingV2Input {
  fileId: string;
  volumeCm3: number;
  materialId: string;
  machineType: 'FDM_STANDARD' | 'FDM_INDUSTRIAL' | 'SLA_STANDARD' | 'SLA_INDUSTRIAL';
  technology: 'FDM' | 'SLA';
  quantity: number;
  color?: string;
  nozzleSizeMm?: number;
  useGCodeAnalysis: boolean;
  preorderDiscountPercent?: number | null;
}

export interface PricingV2Breakdown {
  material: { filamentGrams: number; supportGrams: number; totalGrams: number; wastePercentage: number; subtotal: number };
  machineAmortization: { correctedPrintTimeHours: number; hourlyRate: number; subtotal: number };
  labor: { filePrepMinutes: number; supportRemovalMinutes: number; postProcessingMinutes: number; totalMinutes: number; subtotal: number };
  riskPremium: { baseTotal: number; premiumPercentage: number; subtotal: number };
  subtotal: number;
  totalBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  totalWithVat: number;
  pricePerUnit: number;
  totalPrice: number;
  quantityDiscount?: number;
  preorderDiscount?: number;
}

export interface PricingV2Result {
  success: boolean;
  totalPrice: number;
  breakdown: PricingV2Breakdown;
  estimatedTime: {
    rawPrintTimeHours: number;
    correctedTimeHours: number;
    correctionBreakdown: {
      warmUpMinutes: number;
      calibrationMinutes: number;
      bedPrepMinutes: number;
      deadTimePerPartMinutes: number;
    };
  };
  deliveryDays: number;
  error: string | null;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  
  // Address Info (Snapshot)
  shipping_address: Address;
  billing_address: Address;
  
  // Price Info
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  
  // Status
  status: OrderStatus;
  
  // Notes
  customer_notes?: string;
  admin_notes?: string;
  
  // Shipping
  shipping_method?: string;
  tracking_number?: string;
  shipped_at?: string;
  delivered_at?: string;
  
  // Cancel/Refund
  cancelled_at?: string;
  cancelled_reason?: string;
  refunded_at?: string;
  refund_amount?: number;
  
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 
  | 'pending'
  | 'payment_received'
  | 'preparing'
  | 'printing'
  | 'quality_check'
  | 'packaging'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  file_id: string;
  price_calculation_id?: string;
  
  // Product Details (Snapshot)
  filename: string;
  material_name: string;
  print_setting_name: string;
  
  // Quantity and Price
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  subtotal: number;
  
  // Production Status
  production_status: ProductionStatus;
  
  // Production Details
  print_started_at?: string;
  print_completed_at?: string;
  print_duration_minutes?: number;
  printer_id?: string;
  
  // Quality Control
  quality_check_passed?: boolean;
  quality_notes?: string;
  
  created_at: string;
  updated_at: string;
}

export type ProductionStatus = 
  | 'pending'
  | 'printing'
  | 'completed'
  | 'failed'
  | 'reprinting';

export interface Payment {
  id: string;
  order_id: string;
  
  // Payment Info
  payment_method: string;
  amount: number;
  currency: string;
  
  // Gateway Info
  gateway: string;
  transaction_id?: string;
  conversation_id?: string;
  
  // Status
  status: PaymentStatus;
  
  // Details
  gateway_response?: Record<string, unknown>;
  error_message?: string;
  
  // Dates
  paid_at?: string;
  refunded_at?: string;
  
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Form Types
// ============================================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  isCorporate?: boolean;
  companyName?: string;
  taxNumber?: string;
}

export interface AddressFormData {
  title: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  postalCode?: string;
  isDefault?: boolean;
  addressType: 'shipping' | 'billing' | 'both';
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export interface CardProps {
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];
