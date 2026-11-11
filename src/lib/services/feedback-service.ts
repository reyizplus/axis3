/**
 * Feedback Service
 * Axis3 - User Feedback Management Service
 *
 * Features:
 * - Create feedback (bug reports, feature requests, etc.)
 * - Get user feedback list
 * - Get all feedback (admin)
 * - Update feedback status (admin)
 * - Email notifications
 */

import { createClient } from '@/lib/supabase/client';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export type FeedbackCategory = 
  | 'bug_report'
  | 'feature_request'
  | 'ui_ux'
  | 'performance'
  | 'pricing'
  | 'support'
  | 'other';

export type FeedbackStatus = 
  | 'new'
  | 'in_review'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'duplicate';

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export interface CreateFeedbackInput {
  userId: string;
  category: FeedbackCategory;
  title: string;
  description: string;
  pageUrl?: string;
  screenshotUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface Feedback {
  id: string;
  user_id: string | null;
  category: FeedbackCategory;
  title: string;
  description: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  admin_response?: string | null;
  admin_id?: string | null;
  responded_at?: string | null;
  page_url?: string | null;
  screenshot_url?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Contact form fields (for anonymous submissions)
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

// =====================================================
// FEEDBACK SERVICE CLASS
// =====================================================

export class FeedbackService {
  private supabase = createClient();

  /**
   * Create new feedback
   */
  async createFeedback(input: CreateFeedbackInput): Promise<{
    success: boolean;
    feedback?: Feedback;
    error?: string;
  }> {
    try {
      // Validate input
      if (!input.title || input.title.trim().length < 5) {
        return { success: false, error: 'Başlık en az 5 karakter olmalıdır' };
      }

      if (!input.description || input.description.trim().length < 20) {
        return { success: false, error: 'Açıklama en az 20 karakter olmalıdır' };
      }

      // Get user agent
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';

      // Create feedback
      const { data, error } = await (this.supabase
        .from('feedback') as any)
        .insert({
          user_id: input.userId,
          category: input.category,
          title: input.title.trim(),
          description: input.description.trim(),
          page_url: input.pageUrl,
          screenshot_url: input.screenshotUrl,
          user_agent: userAgent,
          metadata: input.metadata || {},
        })
        .select()
        .single();

      if (error) {
        console.error('[FeedbackService] Failed to create feedback:', error);
        return { success: false, error: 'Geri bildirim gönderilemedi' };
      }

            // Send admin notification email (non-blocking)
      this.sendAdminNotification(data as unknown as Feedback).catch(err => {
        console.error('[FeedbackService] Failed to send admin notification:', err);
      });

      return { success: true, feedback: data as unknown as Feedback };
    } catch (error) {
      console.error('[FeedbackService] Create feedback error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Get user's feedback list
   */
  async getUserFeedback(userId: string): Promise<{
    success: boolean;
    feedback?: Feedback[];
    error?: string;
  }> {
    try {
      const { data, error } = await (this.supabase
        .from('feedback') as any)
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[FeedbackService] Failed to fetch feedback:', error);
        return { success: false, error: 'Geri bildirimler yüklenemedi' };
      }

      return { success: true, feedback: data as unknown as Feedback[] };
    } catch (error) {
      console.error('[FeedbackService] Get feedback error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Get all feedback (admin only)
   */
  async getAllFeedback(filters?: {
    status?: FeedbackStatus;
    category?: FeedbackCategory;
    priority?: FeedbackPriority;
  }): Promise<{
    success: boolean;
    feedback?: Feedback[];
    error?: string;
  }> {
    try {
      let query = (this.supabase
        .from('feedback')
        .select(`
          *,
          user:users!feedback_user_id_fkey(id, email, full_name)
        `) as any)
        .is('deleted_at', null);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[FeedbackService] Failed to fetch all feedback:', error);
        return { success: false, error: 'Geri bildirimler yüklenemedi' };
      }

      return { success: true, feedback: data as unknown as Feedback[] };
    } catch (error) {
      console.error('[FeedbackService] Get all feedback error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Get feedback by ID
   */
  async getFeedbackById(feedbackId: string): Promise<{
    success: boolean;
    feedback?: Feedback;
    error?: string;
  }> {
    try {
      const { data, error } = await (this.supabase
        .from('feedback')
        .select(`
          *,
          user:users!feedback_user_id_fkey(id, email, full_name)
        `) as any)
        .eq('id', feedbackId)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('[FeedbackService] Failed to fetch feedback:', error);
        return { success: false, error: 'Geri bildirim bulunamadı' };
      }

      return { success: true, feedback: data as unknown as Feedback };
    } catch (error) {
      console.error('[FeedbackService] Get feedback by ID error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Update feedback status (admin only)
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackStatus,
    priority?: FeedbackPriority,
    adminResponse?: string,
    adminId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      if (priority) {
        updateData.priority = priority;
      }
      
      if (adminResponse) {
        updateData.admin_response = adminResponse;
        updateData.admin_id = adminId;
        updateData.responded_at = new Date().toISOString();
      }

      const { error } = await (this.supabase
        .from('feedback') as any)
        .update(updateData)
        .eq('id', feedbackId);

      if (error) {
        console.error('[FeedbackService] Failed to update feedback:', error);
        return { success: false, error: 'Güncelleme başarısız' };
      }

            // Send user notification if responded
      if (adminResponse) {
        this.sendUserNotification(feedbackId).catch(err => {
          console.error('[FeedbackService] Failed to send user notification:', err);
        });
      }

      return { success: true };
    } catch (error) {
      console.error('[FeedbackService] Update feedback error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Delete feedback (soft delete)
   */
  async deleteFeedback(feedbackId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await (this.supabase
        .from('feedback') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', feedbackId)
        .eq('user_id', userId)
        .eq('status', 'new'); // Only allow deleting new feedback

      if (error) {
        console.error('[FeedbackService] Failed to delete feedback:', error);
        return { success: false, error: 'Silme işlemi başarısız' };
      }

      return { success: true };
    } catch (error) {
      console.error('[FeedbackService] Delete feedback error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Create contact message (public, anonymous)
   */
  async createContactMessage(input: {
    name: string;
    email: string;
    phone: string;
    message: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate input
      if (!input.name || input.name.trim().length < 2) {
        return { success: false, error: 'Ad en az 2 karakter olmalıdır' };
      }

      if (!input.email || !input.email.includes('@')) {
        return { success: false, error: 'Geçerli bir email adresi giriniz' };
      }

      if (!input.message || input.message.trim().length < 20) {
        return { success: false, error: 'Mesaj en az 20 karakter olmalıdır' };
      }

      // Get user agent
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';

      // Create contact message
      const { data, error } = await (this.supabase
        .from('feedback') as any)
        .insert({
          user_id: null, // Anonymous
          category: 'support',
          title: `İletişim Formu: ${input.name}`,
          description: input.message.trim(),
          contact_name: input.name.trim(),
          contact_email: input.email.trim(),
          contact_phone: input.phone.trim(),
          status: 'new',
          priority: 'medium',
          user_agent: userAgent,
          metadata: {
            source: 'contact_form',
            submitted_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (error) {
        console.error('[FeedbackService] Failed to create contact message:', error);
        return { success: false, error: 'Mesaj gönderilemedi' };
      }

            // Send admin notification email (non-blocking)
      this.sendContactNotification(data as unknown as Feedback).catch(err => {
        console.error('[FeedbackService] Failed to send contact notification:', err);
      });

      return { success: true };
    } catch (error) {
      console.error('[FeedbackService] Create contact message error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }

  /**
   * Send admin notification email
   * @private
   */
  private async sendAdminNotification(_feedback: Feedback): Promise<void> {
    try {
            // TODO: Implement admin notification email template
      // For now, just log
          } catch (error) {
      console.error('[FeedbackService] Admin notification error:', error);
    }
  }

  /**
   * Send contact form notification to admin
   * @private
   */
  private async sendContactNotification(_feedback: Feedback): Promise<void> {
    try {
            // TODO: Implement contact notification email template
      // For now, just log
          } catch (error) {
      console.error('[FeedbackService] Contact notification error:', error);
    }
  }

  /**
   * Send user notification email
   * @private
   */
  private async sendUserNotification(feedbackId: string): Promise<void> {
    try {
            // Fetch feedback with user data
      const result = await this.getFeedbackById(feedbackId);
      
      if (!result.success || !result.feedback) {
        console.error('[FeedbackService] Failed to fetch feedback for notification');
        return;
      }

      // TODO: Implement user notification email template
      // For now, just log
          } catch (error) {
      console.error('[FeedbackService] User notification error:', error);
    }
  }

  /**
   * Get feedback statistics (admin)
   */
  async getFeedbackStats(): Promise<{
    success: boolean;
    stats?: {
      total: number;
      byStatus: Record<FeedbackStatus, number>;
      byCategory: Record<FeedbackCategory, number>;
      byPriority: Record<FeedbackPriority, number>;
    };
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('feedback')
        .select('status, category, priority')
        .is('deleted_at', null);

      if (error) {
        console.error('[FeedbackService] Failed to fetch stats:', error);
        return { success: false, error: 'İstatistikler yüklenemedi' };
      }

      const stats = {
        total: data.length,
        byStatus: {} as Record<FeedbackStatus, number>,
        byCategory: {} as Record<FeedbackCategory, number>,
        byPriority: {} as Record<FeedbackPriority, number>,
      };

      // Count by status
      data.forEach((item: any) => {
        stats.byStatus[item.status as FeedbackStatus] = 
          (stats.byStatus[item.status as FeedbackStatus] || 0) + 1;
        stats.byCategory[item.category as FeedbackCategory] = 
          (stats.byCategory[item.category as FeedbackCategory] || 0) + 1;
        stats.byPriority[item.priority as FeedbackPriority] = 
          (stats.byPriority[item.priority as FeedbackPriority] || 0) + 1;
      });

      return { success: true, stats };
    } catch (error) {
      console.error('[FeedbackService] Get stats error:', error);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    }
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const feedbackService = new FeedbackService();
