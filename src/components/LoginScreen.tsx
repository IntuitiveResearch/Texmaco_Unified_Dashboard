import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: { uid: string; name: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [uid, setUid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUid = uid.trim();
    const trimmedPw = password.trim();

    if (!trimmedUid || !trimmedPw) {
      setError('Please provide both User ID and Password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Valid credentials as specified by user: "Texmaco_Management" / "Texmaco_Management@123"
      if (trimmedUid === 'Texmaco_Management' && trimmedPw === 'Texmaco_Management@123') {
        const authData = {
          uid: trimmedUid,
          name: 'Texmaco Executive Management',
          loginTime: new Date().toISOString(),
        };
        localStorage.setItem('texmaco_unified_auth', JSON.stringify(authData));
        localStorage.setItem('isLoggedIn', 'true');
        setIsLoading(false);
        onLoginSuccess(authData);
      } else {
        setIsLoading(false);
        setError('Invalid User ID or Password. Please verify your credentials.');
      }
    }, 450);
  };

  return (
    <div className="min-h-screen w-full bg-[#061431] flex flex-col justify-between items-center text-white font-sans relative overflow-hidden px-4 py-6 selection:bg-blue-600 selection:text-white">
      {/* Background Ambience & Engineering Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.25),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d224d_1px,transparent_1px),linear-gradient(to_bottom,#0d224d_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-3 relative z-10">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-bold tracking-wide uppercase text-slate-200">
              Texmaco Rail & Engineering
            </h2>
            <p className="text-[11px] text-slate-400">Unified Industrial Intelligence Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Enterprise Secure Portal</span>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="w-full max-w-md my-auto relative z-10 py-6">
        <div className="bg-[#0b1b3d]/90 backdrop-blur-md border border-[#1b356e] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-3 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Executive Sign In
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Access O&M, Management & Financial Intelligence
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-rose-950/60 border border-rose-700/60 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="Texmaco_Management"
                  autoComplete="username"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-[#061431] border border-[#1d3873] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-[#061431] border border-[#1d3873] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-lg shadow-blue-900/30 transition-all cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Authenticate & Launch Platform</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Bottom Philosophy & Slogan */}
      <footer className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 py-2 text-[11px] text-slate-400 relative z-10 border-t border-white/10">
        <div className="flex items-center gap-2 font-medium">
          <span>Sense</span>
          <span className="text-slate-600">•</span>
          <span>Understand</span>
          <span className="text-slate-600">•</span>
          <span>Transform</span>
        </div>
        <div>
          Real Assets. Real Intelligence. A Stronger Tomorrow.
        </div>
      </footer>
    </div>
  );
};
