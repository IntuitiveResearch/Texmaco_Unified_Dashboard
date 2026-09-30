import React, { useState } from 'react';
import { RadioReceiver, Settings, Plug, AlertCircle } from 'lucide-react';

interface ConnectionPanelProps {
  onConnect: (url: string, industry: string) => void;
  error: string | null;
}

export function ConnectionPanel({ onConnect, error }: ConnectionPanelProps) {
  const [url, setUrl] = useState('wss://echo.websocket.events');
  const [industry, setIndustry] = useState('manufacturing');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && industry) {
      onConnect(url, industry);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden">
        <div className="bg-[#0D1117] p-8 text-center border-b border-[var(--border)]">
          <div className="mx-auto w-16 h-16 bg-[var(--border)] rounded-2xl flex items-center justify-center mb-4 border border-[var(--border)]">
            <RadioReceiver className="w-8 h-8 text-[var(--text-p)]" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-[var(--text-p)] tracking-tight">Connect Telemetry</h2>
          <p className="text-[var(--text-s)] text-sm">Enter endpoint details to start receiving real-time industrial KPIs.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-900/20 text-red-400 border border-red-900/50 rounded-lg text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="url" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-s)] mb-2">
              WebSocket Endpoint
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Plug className="h-5 w-5 text-[var(--text-s)] opacity-50" />
              </div>
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="wss://your-endpoint.com/ws"
                className="pl-10 w-full px-4 py-2 bg-[#0D1117] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-[var(--text-p)] font-mono text-sm transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="industry" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-s)] mb-2">
              Industry Namespace
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Settings className="h-5 w-5 text-[var(--text-s)] opacity-50" />
              </div>
              <input
                type="text"
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. manufacturing"
                className="pl-10 w-full px-4 py-2 bg-[#0D1117] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-[var(--text-p)] font-mono text-sm transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[var(--accent)] hover:bg-[#3FB950] text-white font-medium py-2.5 px-4 rounded transition-colors text-sm"
          >
            Connect Stream
          </button>
        </form>
      </div>
    </div>
  );
}
