/**
 * Client-side Bank Account Service
 * API routes üzerinden banka hesaplarını yönetir
 */

export interface BankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  branch_name: string | null;
  branch_code: string | null;
  account_number: string | null;
  swift_code: string | null;
  currency: string;
  is_active: boolean;
  display_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBankAccountInput {
  bank_name: string;
  account_holder: string;
  iban: string;
  branch_name?: string | null;
  branch_code?: string | null;
  account_number?: string | null;
  swift_code?: string | null;
  currency?: string;
  is_active?: boolean;
  display_order?: number;
  notes?: string | null;
}

export interface UpdateBankAccountInput {
  bank_name?: string;
  account_holder?: string;
  iban?: string;
  branch_name?: string | null;
  branch_code?: string | null;
  account_number?: string | null;
  swift_code?: string | null;
  currency?: string;
  is_active?: boolean;
  display_order?: number;
  notes?: string | null;
}

class BankAccountClientService {
  /**
   * Tüm banka hesaplarını getir (admin only)
   */
  async getAllBankAccounts(): Promise<BankAccount[]> {
    const response = await fetch('/api/admin/bank-accounts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch bank accounts');
    }

    const data = await response.json();
    return data.accounts;
  }

  /**
   * Yeni banka hesabı oluştur (admin only)
   */
  async createBankAccount(input: CreateBankAccountInput): Promise<{ success: boolean; account?: BankAccount; error?: string }> {
    try {
      const response = await fetch('/api/admin/bank-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Failed to create bank account' };
      }

      const data = await response.json();
      return { success: true, account: data.account };
    } catch (error) {
      console.error('Error creating bank account:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Banka hesabını güncelle (admin only)
   */
  async updateBankAccount(id: string, input: UpdateBankAccountInput): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/admin/bank-accounts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Failed to update bank account' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating bank account:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Banka hesabını sil (admin only)
   */
  async deleteBankAccount(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/admin/bank-accounts/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Failed to delete bank account' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting bank account:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Banka hesaplarını yeniden sırala (admin only)
   */
  async reorderBankAccounts(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/admin/bank-accounts/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderedIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Failed to reorder bank accounts' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error reordering bank accounts:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Banka hesabı durumunu değiştir (aktif/pasif) (admin only)
   */
  async toggleAccountStatus(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/admin/bank-accounts/${id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Failed to toggle account status' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error toggling account status:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * IBAN formatla (görüntüleme için)
   */
  formatIBAN(iban: string): string {
    const clean = iban.replace(/\s/g, '');
    return clean.replace(/(.{4})/g, '$1 ').trim();
  }
}

// Singleton instance
export const bankAccountClientService = new BankAccountClientService();
