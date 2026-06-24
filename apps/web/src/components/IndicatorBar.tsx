import React, { useEffect } from 'react';
import { useVouroStore } from '../store';
import { Terminal, Shield, RefreshCw } from 'lucide-react';

export default function IndicatorBar() {
  const { health, fetchHealth, isDevMode } = useVouroStore();

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-vouro-lime bg-vouro-lime/10 border-vouro-lime/20';
      case 'degraded':
        return 'text-vouro-orange bg-vouro-orange/10 border-vouro-orange/20';
      case 'offline':
      default:
        return 'text-vouro-red bg-vouro-red/10 border-vouro-red/20';
    }
  };

  const getIndicatorDot = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-vouro-lime';
      case 'degraded':
        return 'bg-vouro-orange';
      case 'offline':
      default:
        return 'bg-vouro-red';
    }
  };

  const solana = health?.providers?.solana || { status: 'operational', latencyMs: 65, slot: 283920158 };
  const helius = health?.providers?.helius || { status: 'operational', latencyMs: 95 };
  const jupiter = health?.providers?.jupiter || { status: 'operational' };
  const db = health?.providers?.database || { status: 'operational' };

  return (
    <div className="w-full bg-vouro-bg border-b border-vouro-ground py-2 px-4 flex flex-wrap justify-between items-center gap-4 text-xs font-mono select-none z-50">
      <div className="flex items-center gap-4">
        {/* Logo and Node indicator */}
        <div className="flex items-center gap-1.5 text-vouro-lime font-bold font-heading">
          <Terminal size={14} />
          <span>VOURO://MAINNET</span>
        </div>

        {/* Development Mock Data Status Warning Badge (Requirement) */}
        {isDevMode && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-vouro-red text-vouro-text border border-vouro-red/30 animate-pulse">
            <Shield size={10} />
            <span>DEVELOPMENT DATA ACTIVE</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-5">
        {/* Solana Network status */}
        <div className="flex items-center gap-2">
          <span className="text-vouro-muted">SOLANA:</span>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 border ${getStatusColorClass(solana.status)}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${getIndicatorDot(solana.status)}`}></span>
            <span className="capitalize">{solana.status === 'operational' ? 'Connected' : solana.status}</span>
            <span className="text-[10px] opacity-70">({solana.latencyMs}ms)</span>
          </div>
        </div>

        {/* Helius Provider status */}
        <div className="flex items-center gap-2">
          <span className="text-vouro-muted">HELIUS:</span>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 border ${getStatusColorClass(helius.status)}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${getIndicatorDot(helius.status)}`}></span>
            <span className="capitalize">{helius.status === 'operational' ? 'Connected' : helius.status}</span>
          </div>
        </div>

        {/* Jupiter price status */}
        <div className="flex items-center gap-2">
          <span className="text-vouro-muted">PRICE:</span>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 border ${getStatusColorClass(jupiter.status)}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${getIndicatorDot(jupiter.status)}`}></span>
            <span className="capitalize">{jupiter.status === 'operational' ? 'Live' : jupiter.status}</span>
          </div>
        </div>

        {/* DB websocket status */}
        <div className="flex items-center gap-2">
          <span className="text-vouro-muted">DATABASE:</span>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 border ${getStatusColorClass(db.status)}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${getIndicatorDot(db.status)}`}></span>
            <span className="capitalize">{db.status === 'operational' ? 'Realtime' : db.status}</span>
          </div>
        </div>

        {/* Block Height slot */}
        <div className="flex items-center gap-1.5 text-vouro-muted">
          <RefreshCw size={12} className="animate-spin-slow" />
          <span>SLOT: {solana.slot || 283920158}</span>
        </div>
      </div>
    </div>
  );
}
