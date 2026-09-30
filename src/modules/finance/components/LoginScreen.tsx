import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [uid, setUid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUid = uid.trim();
    const trimmedPassword = password;

    if (!trimmedUid || !trimmedPassword) {
      setErrorMessage('Please enter both User ID and Password.');
      return;
    }

    setIsLoading(true);

    // Simulated short verification for smooth feedback
    setTimeout(() => {
      // Hardcoded credentials: UID = "Financial", Password = "Financial@123"
      if (trimmedUid === 'Financial' && trimmedPassword === 'Financial@123') {
        setIsLoading(false);
        onLoginSuccess(trimmedUid);
      } else {
        setIsLoading(false);
        setErrorMessage('Invalid credentials. Please verify your User ID and Password.');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen w-full bg-[#071324] flex flex-col justify-between items-center text-slate-100 font-sans relative overflow-hidden px-4 py-6 selection:bg-blue-600 selection:text-white">
      {/* Background Decorative Lighting & Industrial Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(6,182,212,0.15),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c2340_1px,transparent_1px),linear-gradient(to_bottom,#0c2340_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center gap-2.5 3xl:gap-3">
          <div className="w-8 h-8 3xl:w-10 3xl:h-10 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md text-sm 3xl:text-base tracking-tight">
            iR
          </div>
          <div className="leading-tight">
            <div className="text-xs 3xl:text-sm font-bold tracking-wider text-slate-100 uppercase">
              INTUITIVE ROBOTICS
            </div>
            <div className="text-[10px] 3xl:text-xs text-cyan-400 font-medium tracking-wide">
              Machines Know More
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 3xl:gap-3 px-3 py-1 3xl:px-4 3xl:py-1.5 rounded-lg border border-slate-800 bg-[#0c203b]/80 backdrop-blur-xs text-slate-300">
          <Building2 className="w-4 h-4 3xl:w-5 3xl:h-5 text-slate-400" />
          <div className="text-right leading-tight">
            <div className="text-[11px] 3xl:text-xs font-bold tracking-wider text-slate-200 uppercase">
              TEXMACO
            </div>
            <div className="text-[8px] 3xl:text-[9px] text-slate-400 uppercase tracking-widest leading-none">
              RAIL & ENGINEERING LTD.
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md 3xl:max-w-lg relative z-10 my-auto">
        <div className="bg-[#0b1d36]/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 3xl:p-10">
          {/* Card Header */}
          <div className="text-center mb-6 3xl:mb-8">
            <div className="w-12 h-12 3xl:w-14 3xl:h-14 mx-auto mb-3 3xl:mb-4 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <ShieldCheck className="w-6 h-6 3xl:w-7 3xl:h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl 3xl:text-3xl font-bold text-white tracking-tight">
              Financial Intelligence
            </h1>
            <p className="text-xs sm:text-sm 3xl:text-base text-slate-400 mt-1">
              Sign in with your authorized industrial account
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-200 text-xs 3xl:text-sm flex items-start gap-2.5 animate-in fade-in duration-150"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 3xl:space-y-5">
            {/* User ID field */}
            <div>
              <label
                htmlFor="login-uid"
                className="block text-xs 3xl:text-sm font-semibold text-slate-300 mb-1.5"
              >
                User ID (UID)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400 pointer-events-none">
                  <User className="w-4 h-4 3xl:w-5 3xl:h-5" />
                </div>
                <input
                  id="login-uid"
                  type="text"
                  autoComplete="username"
                  value={uid}
                  onChange={(e) => {
                    setUid(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter User ID"
                  disabled={isLoading}
                  className="w-full bg-[#08172c] border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 3xl:py-3 text-sm 3xl:text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="text-xs 3xl:text-sm font-semibold text-slate-300"
                >
                  Password
                </label>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4 3xl:w-5 3xl:h-5" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter Password"
                  disabled={isLoading}
                  className="w-full bg-[#08172c] border border-slate-700 rounded-lg pl-10 pr-10 py-2.5 3xl:py-3 text-sm 3xl:text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  className="absolute right-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 3xl:w-5 3xl:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 3xl:w-5 3xl:h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 active:from-blue-700 active:to-cyan-700 text-white font-bold py-2.5 3xl:py-3.5 px-4 rounded-lg shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 text-sm 3xl:text-base cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 3xl:w-5 3xl:h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 3xl:w-5 3xl:h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto text-center py-2 text-xs 3xl:text-sm text-slate-500 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-1">
        <div>
          Intuitive Robotics Financial Intelligence System <span className="text-slate-600">•</span> v1.0.0
        </div>
        <div className="text-slate-500">
          Industrial Machine Financial Visibility • Texmaco Rail & Engineering Ltd.
        </div>
      </footer>
    </div>
  );
};
