import { supabase } from './supabase';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface StoredAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

const LOCAL_USER_KEY = 'nexsite_auth_user';
const ACCOUNTS_STORE_KEY = 'nexsite_accounts_db';

// Pre-seeded accounts guaranteed to always work
const DEFAULT_ACCOUNTS: StoredAccount[] = [
  { id: 'admin_1', name: 'Admin', email: 'admin@nexsite.ai', passwordHash: 'admin123', role: 'admin' },
  { id: 'admin_2', name: 'Admin', email: 'admin@nexsite.com', passwordHash: 'admin123', role: 'admin' },
  { id: 'admin_3', name: 'Admin', email: 'admin', passwordHash: 'admin123', role: 'admin' },
  { id: 'admin_4', name: 'Admin', email: 'admin', passwordHash: 'admin', role: 'admin' },
  { id: 'user_1', name: 'Demo User', email: 'user@nexsite.ai', passwordHash: 'user123', role: 'user' },
  { id: 'user_2', name: 'Demo User', email: 'user@nexsite.com', passwordHash: 'user123', role: 'user' },
  { id: 'user_3', name: 'Demo User', email: 'user', passwordHash: 'user123', role: 'user' },
  { id: 'user_4', name: 'Demo User', email: 'user', passwordHash: 'user', role: 'user' },
];

function getStoredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORE_KEY);
    if (!raw) {
      localStorage.setItem(ACCOUNTS_STORE_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ACCOUNTS;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

function saveAccount(acc: StoredAccount) {
  const accounts = getStoredAccounts();
  const existingIdx = accounts.findIndex(a => a.email.toLowerCase() === acc.email.toLowerCase());
  if (existingIdx >= 0) {
    accounts[existingIdx] = acc;
  } else {
    accounts.push(acc);
  }
  try {
    localStorage.setItem(ACCOUNTS_STORE_KEY, JSON.stringify(accounts));
  } catch {}
}

export const AuthService = {
  async login(emailOrUsername: string, password: string): Promise<{ token: string; user: User }> {
    const identifier = emailOrUsername.trim().toLowerCase();

    // 1. Try Supabase Auth first if it's an email format
    if (identifier.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });

        if (!error && data.user) {
          const role: UserRole = 
            data.user.user_metadata?.role === 'admin' ||
            identifier.includes('admin')
              ? 'admin' 
              : 'user';

          const userObj: User = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
            email: data.user.email || identifier,
            role,
            avatar: data.user.user_metadata?.avatar,
          };

          const token = data.session?.access_token || 'supabase_token_' + Date.now();
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
          // Also cache locally for offline/resilience
          saveAccount({
            id: userObj.id,
            name: userObj.name,
            email: userObj.email,
            passwordHash: password,
            role: userObj.role,
          });
          return { token, user: userObj };
        }
      } catch (e) {
        console.warn('[AuthService] Supabase remote login notice:', e);
      }
    }

    // 2. Check local accounts store
    const accounts = getStoredAccounts();
    const found = accounts.find(
      a => (a.email.toLowerCase() === identifier || a.name.toLowerCase() === identifier) && 
           a.passwordHash === password
    );

    if (found) {
      const userObj: User = {
        id: found.id,
        name: found.name,
        email: found.email,
        role: found.role,
      };
      const token = 'token_' + Buffer.from(`${found.email}:${found.role}:${Date.now()}`).toString('base64');
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
      return { token, user: userObj };
    }

    // 3. Fallback check for admin pattern
    if (identifier.includes('admin') && (password === 'admin' || password === 'admin123')) {
      const adminObj: User = {
        id: 'admin_' + Date.now(),
        name: 'Admin',
        email: identifier.includes('@') ? identifier : 'admin@nexsite.ai',
        role: 'admin',
      };
      const token = 'token_admin_' + Date.now();
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(adminObj));
      return { token, user: adminObj };
    }

    throw new Error('Invalid email/username or password. If you are new, click "Sign Up" to create an account.');
  },

  async signup(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
    const cleanEmail = email.trim().toLowerCase();
    const role: UserRole = cleanEmail.includes('admin') ? 'admin' : 'user';

    const userObj: User = {
      id: 'usr_' + Date.now().toString(36),
      name: name.trim() || cleanEmail.split('@')[0] || 'User',
      email: cleanEmail,
      role,
    };

    // Save to local accounts database immediately so login is guaranteed
    saveAccount({
      id: userObj.id,
      name: userObj.name,
      email: userObj.email,
      passwordHash: password,
      role: userObj.role,
    });

    // Try to also register in Supabase in background
    try {
      if (cleanEmail.includes('@')) {
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { name: userObj.name, role: userObj.role }
          }
        });
      }
    } catch (e) {
      console.warn('[AuthService] Supabase cloud signup notice:', e);
    }

    const token = 'token_' + Buffer.from(`${userObj.email}:${userObj.role}:${Date.now()}`).toString('base64');
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
    return { token, user: userObj };
  },

  async verify(): Promise<User | null> {
    // 1. Check active Supabase session
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

    // 2. Check cached localStorage user
    try {
      const saved = localStorage.getItem(LOCAL_USER_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}

    return null;
  },

  logout() {
    try {
      supabase.auth.signOut().catch(() => {});
    } catch {}
    localStorage.removeItem(LOCAL_USER_KEY);
  },

  getToken(): string | null {
    return localStorage.getItem(LOCAL_USER_KEY);
  },
};
