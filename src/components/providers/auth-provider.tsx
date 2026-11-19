'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { cartService } from '@/lib/cart/cart-service';
import { loadStoreCartFromDb } from '@/lib/cart/store-cart';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar?: string;
  is_corporate: boolean;
  email_verified: boolean;
  two_factor_enabled: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthenticated: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  // Client is created once per provider instance. `useState` with a lazy
  // initializer is the React-safe way to do this; creating it during render
  // in a ref mutation violates the hooks rules.
  const [supabase] = useState(() => createClient());
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name, phone, is_corporate, email_verified, two_factor_enabled')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        const d = data as unknown as UserProfile;
        setProfile({
          id: d.id,
          email: d.email,
          full_name: d.full_name || d.email?.split('@')[0] || 'Kullanıcı',
          phone: d.phone || '',
          is_corporate: d.is_corporate || false,
          email_verified: d.email_verified || false,
          two_factor_enabled: d.two_factor_enabled || false,
        });
      } else {
        const authUser = await supabase.auth.getUser();
        if (authUser.data.user) {
          const u = authUser.data.user;
          setProfile({
            id: u.id,
            email: u.email || '',
            full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Kullanıcı',
            phone: u.user_metadata?.phone || '',
            is_corporate: u.user_metadata?.is_corporate || false,
            email_verified: u.user_metadata?.email_verified || false,
            two_factor_enabled: u.user_metadata?.two_factor_enabled || false,
          });
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  }, [user, loadUserProfile]);

  useEffect(() => {
    if (!mounted) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
        cartService.setUserId(session.user.id);
        cartService.loadFromDb();
        loadStoreCartFromDb();
      } else {
        cartService.setUserId(null);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      userRef.current = newUser;

      setUser(newUser);

      if (newUser) {
        loadUserProfile(newUser.id);
        cartService.setUserId(newUser.id);
        cartService.loadFromDb();
        loadStoreCartFromDb();
      } else {
        setProfile(null);
        cartService.setUserId(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [mounted, loadUserProfile, supabase]);

  const signOut = async () => {
    // Sepet bilinçli olarak silinmiyor: kullanıcı çıkış yapıp tekrar girdiğinde
    // sepetini bulmalı. Sipariş tamamlandığında checkout sepeti zaten temizler.
    cartService.setUserId(null);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isAuthenticated: !!user,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
