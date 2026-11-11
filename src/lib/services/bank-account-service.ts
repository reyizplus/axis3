/**
 * Bank Account Service
 * Manages bank accounts for EFT/Havale payments
 */

import { createClient } from '@/lib/supabase/server';

export interface BankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  branch_name?: string | null;
  branch_code?: string | null;
  account_number?: string | null;
  swift_code?: string | null;
  currency: string;
  is_active: boolean;
  display_order: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CreateBankAccountInput = Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBankAccountInput = Partial<CreateBankAccountInput>;

export class BankAccountService {
  /**
   * Get all active bank accounts (for public display)
   * Ordered by display_order
   */
  async getActiveBankAccounts(): Promise<BankAccount[]> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch active bank accounts:', error);
        return [];
      }

      return (data || []) as BankAccount[];
    } catch (error) {
      console.error('Error in getActiveBankAccounts:', error);
      return [];
    }
  }

  /**
   * Get all bank accounts (admin only)
   * Includes inactive accounts
   */
  async getAllBankAccounts(): Promise<BankAccount[]> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch all bank accounts:', error);
        return [];
      }

      return (data || []) as BankAccount[];
    } catch (error) {
      console.error('Error in getAllBankAccounts:', error);
      return [];
    }
  }

  /**
   * Get a single bank account by ID
   */
  async getBankAccountById(id: string): Promise<BankAccount | null> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Failed to fetch bank account:', error);
        return null;
      }

      return data as BankAccount;
    } catch (error) {
      console.error('Error in getBankAccountById:', error);
      return null;
    }
  }

  /**
   * Create a new bank account
   */
  async createBankAccount(input: CreateBankAccountInput): Promise<{ success: boolean; account?: BankAccount; error?: string }> {
    try {
      // Validate IBAN format (basic validation)
      if (!this.validateIBAN(input.iban)) {
        return { success: false, error: 'Geçersiz IBAN formatı' };
      }

      // Validate required fields
      if (!input.bank_name || input.bank_name.trim().length === 0) {
        return { success: false, error: 'Banka adı gereklidir' };
      }

      if (!input.account_holder || input.account_holder.trim().length === 0) {
        return { success: false, error: 'Hesap sahibi gereklidir' };
      }

      const supabase = await createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('bank_accounts') as any)
        .insert(input)
        .select()
        .single();

      if (error) {
        console.error('Failed to create bank account:', error);
        return { success: false, error: 'Banka hesabı oluşturulamadı' };
      }

      return { success: true, account: data as BankAccount };
    } catch (error) {
      console.error('Error in createBankAccount:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Update a bank account
   */
  async updateBankAccount(id: string, input: UpdateBankAccountInput): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate IBAN if provided
      if (input.iban && !this.validateIBAN(input.iban)) {
        return { success: false, error: 'Geçersiz IBAN formatı' };
      }

      const supabase = await createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('bank_accounts') as any)
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Failed to update bank account:', error);
        return { success: false, error: 'Banka hesabı güncellenemedi' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateBankAccount:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Delete a bank account
   */
  async deleteBankAccount(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete bank account:', error);
        return { success: false, error: 'Banka hesabı silinemedi' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteBankAccount:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Reorder bank accounts
   * Updates display_order for multiple accounts
   */
  async reorderBankAccounts(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();

      // Update each account's display_order
      const updates = orderedIds.map((id, index) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (supabase.from('bank_accounts') as any)
          .update({ display_order: index + 1 })
          .eq('id', id);
      });

      const results = await Promise.all(updates);

      // Check if any update failed
      const failed = results.find(result => result.error);
      if (failed) {
        console.error('Failed to reorder bank accounts:', failed.error);
        return { success: false, error: 'Sıralama güncellenemedi' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in reorderBankAccounts:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Toggle account active status
   */
  async toggleAccountStatus(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('bank_accounts') as any)
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Failed to toggle account status:', error);
        return { success: false, error: 'Durum güncellenemedi' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in toggleAccountStatus:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Validate IBAN format (basic validation)
   * TR + 2 check digits + 24 digits = 26 characters total
   */
  private validateIBAN(iban: string): boolean {
    // Remove spaces and convert to uppercase
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();

    // Check if it starts with TR and has correct length
    if (!cleanIBAN.startsWith('TR') || cleanIBAN.length !== 26) {
      return false;
    }

    // Check if remaining characters are digits
    const digits = cleanIBAN.substring(2);
    return /^\d{24}$/.test(digits);
  }

  /**
   * Format IBAN for display (add spaces every 4 characters)
   */
  formatIBAN(iban: string): string {
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
    return cleanIBAN.match(/.{1,4}/g)?.join(' ') || iban;
  }

  /**
   * Get statistics about bank accounts
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    try {
      const accounts = await this.getAllBankAccounts();
      const active = accounts.filter(acc => acc.is_active).length;

      return {
        total: accounts.length,
        active,
        inactive: accounts.length - active,
      };
    } catch (error) {
      console.error('Error in getStatistics:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
      };
    }
  }
}

// Export singleton instance
export const bankAccountService = new BankAccountService();
