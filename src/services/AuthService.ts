// AuthService — centralized auth logic. Replace internals with real provider later.

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

const TOKEN_KEY = 'nexsite_token';

export const AuthService = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Login failed.' }));
      throw new Error(data.error || 'Invalid email or password.');
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },

  async signup(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Signup failed.' }));
      throw new Error(data.error || 'Could not create account.');
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },

  async verify(): Promise<User | null> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const res = await fetch('/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
};
