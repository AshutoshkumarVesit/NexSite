import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Sparkles } from 'lucide-react';
import { BackgroundVideo } from '../common/BackgroundVideo';

export function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password);
      window.location.hash = '#/dashboard';
    } catch (err: any) {
      setError(err.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nex-login-page">
      {/* Background Video Layer */}
      <BackgroundVideo />

      {/* Left — Branding (same as login) */}
      <div className="nex-login-brand">
        <div className="nex-login-brand-inner">
          <a href="#/" className="nex-logo-row" title="Back to Home">
            <Sparkles size={32} className="nex-logo-icon" />
            <span className="nex-logo-text">NexSite</span>
          </a>
          <h1 className="nex-login-headline">Start building with AI today.</h1>
          <p className="nex-login-subtext">
            Create your free account and generate your first website in under a minute.
          </p>
        </div>
      </div>

      {/* Right — Signup Card */}
      <div className="nex-login-form-side">
        <div className="nex-login-card">
          <h2 className="nex-login-card-title">Create Account</h2>
          <p className="nex-login-card-subtitle">Fill in your details to get started.</p>

          {error && <div className="nex-login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="nex-login-form">
            <label className="nex-label">
              Name
              <input
                type="text"
                className="nex-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                required
                autoFocus
              />
            </label>
            <label className="nex-label">
              Email
              <input
                type="email"
                className="nex-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
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
            <label className="nex-label">
              Confirm Password
              <input
                type="password"
                className="nex-input"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            <button type="submit" className="nex-btn-primary" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="nex-login-footer-text">
            Already have an account? <a href="#/login" className="nex-link">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
