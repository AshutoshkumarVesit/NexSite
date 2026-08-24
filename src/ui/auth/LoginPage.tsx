import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Sparkles } from 'lucide-react';
import { BackgroundVideo } from '../common/BackgroundVideo';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      window.location.hash = '#/dashboard';
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nex-login-page">
      {/* Background Video Layer */}
      <BackgroundVideo />

      {/* Left — Branding */}
      <div className="nex-login-brand">
        <div className="nex-login-brand-inner">
          <a href="#/" className="nex-logo-row" title="Back to Home">
            <Sparkles size={32} className="nex-logo-icon" />
            <span className="nex-logo-text">NexSite</span>
          </a>
          <h1 className="nex-login-headline">Turn your idea into a production-ready website.</h1>
          <p className="nex-login-subtext">
            Describe what you want. NexSite's AI agents design, generate and assemble it — in seconds.
          </p>
          <div className="nex-login-features">
            <div className="nex-login-feature">
              <span className="nex-feature-dot" />
              Multi-agent AI pipeline
            </div>
            <div className="nex-login-feature">
              <span className="nex-feature-dot" />
              Live preview in browser
            </div>
            <div className="nex-login-feature">
              <span className="nex-feature-dot" />
              SEO & responsive by default
            </div>
          </div>
        </div>
      </div>

      {/* Right — Sign In Card */}
      <div className="nex-login-form-side">
        <div className="nex-login-card">
          <h2 className="nex-login-card-title">Sign In</h2>
          <p className="nex-login-card-subtitle">Welcome back. Enter your credentials to continue.</p>

          {error && <div className="nex-login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="nex-login-form">
            <label className="nex-label">
              Email
              <input
                type="email"
                className="nex-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@nexsite.ai"
                required
                autoFocus
              />
            </label>
            <label className="nex-label">
              Password
              <input
                type="password"
                className="nex-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            <button type="submit" className="nex-btn-primary" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="nex-demo-fill">
            <span className="nex-demo-label">Demo accounts:</span>
            <button
              type="button"
              className="nex-btn-demo"
              onClick={() => {
                setEmail('admin@nexsite.ai');
                setPassword('Admin@123');
                setError('');
              }}
            >
              Fill Admin
            </button>
            <button
              type="button"
              className="nex-btn-demo"
              onClick={() => {
                setEmail('user@nexsite.ai');
                setPassword('User@123');
                setError('');
              }}
            >
              Fill User
            </button>
          </div>

          <div className="nex-login-divider">
            <span>or</span>
          </div>

          <button className="nex-btn-google" disabled title="Coming soon">
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
            Continue with Google — Coming soon
          </button>

          <p className="nex-login-footer-text">
            Don't have an account? <a href="#/signup" className="nex-link">Create one</a>
          </p>
        </div>
      </div>
    </div>
  );
}
