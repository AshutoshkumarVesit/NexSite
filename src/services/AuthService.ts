import { supabase } from './supabase';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

const LOCAL_USER_KEY = 'nexsite_auth_user';

export const AuthService = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Supabase Auth First
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data.user) {
        const role: UserRole = 
          data.user.user_metadata?.role === 'admin' ||
          cleanEmail.includes('admin')
            ? 'admin' 
            : 'user';

        const userObj: User = {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          email: data.user.email || email,
          role,
          avatar: data.user.user_metadata?.avatar,
        };

        const token = data.session?.access_token || 'supabase_token_' + Date.now();
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
        return { token, user: userObj };
      }
      if (error) {
        console.warn('[AuthService] Supabase login error:', error.message);
      }
    } catch (e) {
      console.warn('[AuthService] Supabase connection failed, checking demo fallback:', e);
    }

    // 2. Built-in Demo Credentials Fallback (for instant access)
    if ((cleanEmail === 'admin@nexsite.ai' || cleanEmail === 'admin@nexsite.com' || cleanEmail === 'admin') && (password === 'admin123' || password === 'admin')) {
      const adminUser: User = {
        id: 'admin_user',
        name: 'Admin',
        email: 'admin@nexsite.ai',
        role: 'admin',
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(adminUser));
      return { token: 'demo-admin-token', user: adminUser };
    }

    if ((cleanEmail === 'user@nexsite.ai' || cleanEmail === 'user@nexsite.com' || cleanEmail === 'user') && (password === 'user123' || password === 'user')) {
      const regularUser: User = {
        id: 'regular_user',
        name: 'Demo User',
        email: 'user@nexsite.ai',
        role: 'user',
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(regularUser));
      return { token: 'demo-user-token', user: regularUser };
    }

    throw new Error('Invalid email or password. Please check your credentials or create a user in your Supabase dashboard.');
  },

  async signup(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
    const cleanEmail = email.trim().toLowerCase();
    const role: UserRole = cleanEmail.includes('admin') ? 'admin' : 'user';

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name, role }
        }
      });

      if (error) throw error;

      const userObj: User = {
        id: data.user?.id || 'user_' + Date.now(),
        name,
        email: cleanEmail,
        role,
      };

      const token = data.session?.access_token || 'supabase_token_' + Date.now();
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
      return { token, user: userObj };
    } catch (err: any) {
      throw new Error(err.message || 'Could not create account in Supabase.');
    }
  },

  async verify(): Promise<User | null> {
    // Check active Supabase session
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const u = data.session.user;
        const role: UserRole = 
          u.user_metadata?.role === 'admin' ||
          (u.email || '').toLowerCase().includes('admin')
            ? 'admin' 
            : 'user';

        return {
          id: u.id,
          name: u.user_metadata?.name || u.email?.split('@')[0] || 'User',
          email: u.email || '',
          role,
          avatar: u.user_metadata?.avatar,
        };
      }
    } catch {}

    // Check cached localStorage user
    try {
      const saved = localStorage.getItem(LOCAL_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}

    return null;
  },

  logout() {
    supabase.auth.signOut().catch(() => {});
    localStorage.removeItem(LOCAL_USER_KEY);
  },

  getToken(): string | null {
    return localStorage.getItem(LOCAL_USER_KEY);
  },
};
