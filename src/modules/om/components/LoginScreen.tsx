import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import intuitiveRoboticsLogo from '../images/intuitive-robotics-logo.png';
import { authenticateUser } from '../services/authService';
import { AuthUser } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [uid, setUid] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Brief feedback
    setTimeout(() => {
      const result = authenticateUser(uid, password, rememberMe);
      setIsSubmitting(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Authentication failed. Please verify your credentials.');
      }
    }, 250);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background subtle light ambient accents */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Top clean header */}
      <header className="w-full px-6 py-4 flex items-center justify-between z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <img
            src={intuitiveRoboticsLogo}
            alt="Intuitive Robotics Logo"
            className="h-8 sm:h-9 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Secure Operations Portal</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/60 p-6 sm:p-8">
          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 mb-3 shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              O&M Platform Sign In
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Access real-time asset telemetry & compressor diagnostics
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User ID Field */}
            <div>
              <label
                htmlFor="login-uid"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-uid"
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="Enter User ID"
                  autoComplete="username"
                  required
                  autoFocus
                  className="w-full bg-slate-50/80 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-500/15 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all outline-hidden"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  autoComplete="current-password"
                  required
                  className="w-full bg-slate-50/80 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-500/15 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                />
                <span>Remember login on this browser</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-3 px-6 text-center text-[11px] text-slate-500 border-t border-slate-200/80 bg-white/70">
        <span>Intuitive Robotics • O&M Platform v1.0.0 • Authorized Personnel Only</span>
      </footer>
    </div>
  );
};
