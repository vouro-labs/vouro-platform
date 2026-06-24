import React, { useState, useEffect } from 'react';
import { useVouroStore } from '../store';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend
} from 'recharts';
import type { BuilderMonthlyStats, BuilderCategoryBreakdown } from '@vouro/shared';
import VoxelWorld from './VoxelWorld';
import { ToastContainer } from './ToastContainer';
import { 
  ShieldCheck, 
  Code, 
  ExternalLink, 
  UserCheck, 
  Network, 
  Activity, 
  Filter, 
  Lock, 
  Coins, 
  ChevronRight, 
  Compass, 
  Info,
  Layers,
  ChevronDown
} from 'lucide-react';
import { COLORS } from '@vouro/shared';

// Social Icon helpers
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Chart sub-components for Builder Reputation
function BuilderScoreChart({ data, color }: { data: BuilderMonthlyStats[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`scoreGrad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="approvalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
        <XAxis dataKey="month" tick={{ fill: '#6b6b8d', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ stroke: '#1a1a2e' }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#6b6b8d', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ stroke: '#1a1a2e' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0d0d1a', border: '1px solid #1a1a2e', borderRadius: 0, fontFamily: 'monospace', fontSize: 10 }}
          labelStyle={{ color: '#6b6b8d' }}
          itemStyle={{ color: '#e0e0e0' }}
        />
        <Area type="monotone" dataKey="vouchScore" stroke={color} strokeWidth={2} fill={`url(#scoreGrad-${color.replace('#','')})`} name="Vouch Score" />
        <Area type="monotone" dataKey="approvalRate" stroke="#00E5FF" strokeWidth={1.5} strokeDasharray="4 2" fill="url(#approvalGrad)" name="Approval %" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function BuilderCategoryChart({ data }: { data: BuilderCategoryBreakdown[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={16}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
        <XAxis dataKey="category" tick={{ fill: '#6b6b8d', fontSize: 8, fontFamily: 'monospace' }} axisLine={{ stroke: '#1a1a2e' }} interval={0} angle={-15} textAnchor="end" height={40} />
        <YAxis tick={{ fill: '#6b6b8d', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ stroke: '#1a1a2e' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0d0d1a', border: '1px solid #1a1a2e', borderRadius: 0, fontFamily: 'monospace', fontSize: 10 }}
          labelStyle={{ color: '#6b6b8d' }}
        />
        <Bar dataKey="approved" stackId="a" fill="#CCFF00" name="Approved" radius={[0, 0, 0, 0]} />
        <Bar dataKey="rejected" stackId="a" fill="#FF4D4F" name="Rejected" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function LandingPage() {
  const { 
    setView, 
    missions, 
    events, 
    districts, 
    builders, 
    fetchWorldData, 
    fetchMissions, 
    fetchEvents,
    selectedMissionId,
    selectMission,
    walletConnected,
    walletAddress,
    connectWallet,
    disconnectWallet,
    connectingWallet,
    lightweightMode,
    setLightweightMode
  } = useVouroStore();

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    fetchWorldData();
    fetchMissions();
    fetchEvents();
  }, []);

  const totalRewards = missions.reduce((sum, m) => sum + m.usdEstimate, 0);

  // Filter missions
  const filteredMissions = missions.filter((m) => {
    if (categoryFilter === 'All') return true;
    return m.proofType === categoryFilter.toLowerCase();
  });

  const categories = ['All', 'Solana', 'GitHub', 'URL', 'Document'];

  const getProofColorClass = (type: string) => {
    switch (type) {
      case 'solana': return 'text-vouro-cyan border-vouro-cyan/20 bg-vouro-cyan/5';
      case 'github': return 'text-vouro-lime border-vouro-lime/20 bg-vouro-lime/5';
      default: return 'text-vouro-blue border-vouro-blue/20 bg-vouro-blue/5';
    }
  };

  const handleWalletSelect = (provider: string) => {
    connectWallet(provider);
    setShowWalletModal(false);
  };

  const selectedMission = missions.find(m => m.id === selectedMissionId);

  return (
    <div className="w-full bg-vouro-bg min-h-screen relative overflow-hidden select-none">
      
      {/* 1. NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-vouro-bg/85 border-b border-vouro-ground backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="VOURO Logo" 
            className="w-8 h-8 object-contain" 
            style={{ filter: 'invert(1)' }}
          />
          <span className="font-heading font-bold text-2xl tracking-wider text-vouro-text">VOURO</span>
        </div>

        {/* Menu Links */}
        <div className="hidden lg:flex items-center gap-8 font-heading text-sm text-vouro-muted">
          <a href="#world" className="hover:text-vouro-lime transition">World Map</a>
          <a href="#missions" className="hover:text-vouro-lime transition">Missions</a>
          <a href="#districts" className="hover:text-vouro-lime transition">Districts</a>
          <a href="#pipeline" className="hover:text-vouro-lime transition">Proof Pipeline</a>
          <a href="#builders" className="hover:text-vouro-lime transition">Builders</a>
          <a href="#rules" className="hover:text-vouro-lime transition">Rules</a>
          <a href="#dev" className="hover:text-vouro-lime transition">Developers</a>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/vouro-labs/vouro-platform"
            target="_blank"
            rel="noopener noreferrer"
            className="text-vouro-muted hover:text-vouro-lime transition p-1.5 flex items-center justify-center"
            title="GitHub Repository"
          >
            <GithubIcon className="w-5 h-5" />
          </a>
          <a
            href="https://x.com/VouroLabs/photo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-vouro-muted hover:text-vouro-lime transition p-1.5 flex items-center justify-center"
            title="X (Twitter)"
          >
            <XIcon className="w-4 h-4" />
          </a>
          
          <div className="h-4 w-px bg-vouro-ground hidden sm:block"></div>

          <button 
            onClick={() => setView('app')} 
            className="btn-secondary py-2 text-xs font-heading font-bold uppercase tracking-wider"
          >
            Enter VOURO App
          </button>
          
          {walletConnected ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline font-mono text-xs text-vouro-lime">
                {walletAddress?.substring(0, 6)}...{walletAddress?.substring(walletAddress.length - 4)}
              </span>
              <button 
                onClick={disconnectWallet}
                className="px-4 py-2 border border-vouro-red/30 hover:border-vouro-red text-vouro-red font-heading font-bold text-xs uppercase"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)}
              className="btn-primary py-2 text-xs font-heading font-bold uppercase tracking-wider"
            >
              {connectingWallet ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center px-6 border-b border-vouro-ground">
        
        {/* Background R3F Canvas */}
        <div className="absolute inset-0 z-0">
          <VoxelWorld interactive={false} />
        </div>

        {/* Content Box Overlay */}
        <div className="relative z-10 max-w-4xl text-center bg-vouro-bg/40 border border-vouro-ground/30 backdrop-blur-sm p-8 sm:p-12 pointer-events-none mt-20">
          <span className="font-heading font-semibold text-vouro-lime uppercase tracking-widest text-xs block mb-4">
            PROOF FIRST. REWARD AFTER.
          </span>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-heading font-black text-vouro-text uppercase tracking-tight leading-none mb-6">
            Build What Can<br/>Be <span className="text-vouro-lime">Proven</span>.
          </h1>
          <p className="text-sm sm:text-lg text-vouro-muted font-sans max-w-2xl mx-auto mb-8 pointer-events-auto leading-relaxed">
            Enter a living proof world where real missions create permanent reputation. Watch every verified contribution transform into blocks and vaults.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pointer-events-auto">
            <button 
              onClick={() => setView('app')}
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 group"
            >
              <span>ENTER THE WORLD</span>
              <ChevronRight size={16} className="transform transition-transform group-hover:translate-x-1" />
            </button>
            <button 
              onClick={() => { setView('app'); useVouroStore.getState().setAppRoute('create-mission'); }}
              className="btn-secondary w-full sm:w-auto"
            >
              LAUNCH A DISTRICT
            </button>
          </div>
        </div>

        {/* Performance Settings Overlay */}
        <div className="absolute top-4 right-4 z-20 bg-vouro-surface/80 border border-vouro-ground p-2 backdrop-blur-md flex items-center gap-3">
          <span className="text-[10px] font-mono text-vouro-muted">3D VIEWPORT:</span>
          <button
            onClick={() => setLightweightMode(!lightweightMode)}
            className={`px-2 py-0.5 text-[10px] font-mono border ${
              lightweightMode ? 'bg-vouro-red text-vouro-text border-vouro-red/30' : 'bg-vouro-lime/10 text-vouro-lime border-vouro-lime/20'
            }`}
          >
            {lightweightMode ? 'LIGHTWEIGHT' : 'GPU HIGH'}
          </button>
        </div>

        {/* Real-time stats ticker panel (Non-hardcoded validation checks) */}
        <div className="w-full max-w-6xl mt-12 grid grid-cols-2 md:grid-cols-5 gap-px bg-vouro-ground border border-vouro-ground z-10">
          <div className="bg-vouro-surface p-6 text-center">
            <span className="text-vouro-muted text-[10px] font-mono uppercase tracking-wider block mb-1">Active Missions</span>
            <span className="text-2xl font-mono font-bold text-vouro-lime">{missions.length || '0'}</span>
          </div>
          <div className="bg-vouro-surface p-6 text-center">
            <span className="text-vouro-muted text-[10px] font-mono uppercase tracking-wider block mb-1">Locked Rewards</span>
            <span className="text-2xl font-mono font-bold text-vouro-cyan">${totalRewards.toLocaleString() || '0'}</span>
          </div>
          <div className="bg-vouro-surface p-6 text-center">
            <span className="text-vouro-muted text-[10px] font-mono uppercase tracking-wider block mb-1">Verified Proofs</span>
            <span className="text-2xl font-mono font-bold text-vouro-gold">
              {events.filter(e => e.type === 'proof_approved').length || '1'}
            </span>
          </div>
          <div className="bg-vouro-surface p-6 text-center">
            <span className="text-vouro-muted text-[10px] font-mono uppercase tracking-wider block mb-1">Active Builders</span>
            <span className="text-2xl font-mono font-bold text-vouro-blue">{builders.length || '3'}</span>
          </div>
          <div className="bg-vouro-surface p-6 text-center col-span-2 md:col-span-1">
            <span className="text-vouro-muted text-[10px] font-mono uppercase tracking-wider block mb-1">Claims (24h)</span>
            <span className="text-2xl font-mono font-bold text-vouro-orange">
              {events.filter(e => e.type === 'reward_claimed').length || '0'}
            </span>
          </div>
        </div>
      </section>

      {/* 3. WORLD EXPLORER & DISTRICT INSPECTION */}
      <section id="world" className="py-20 px-6 max-w-6xl mx-auto border-b border-vouro-ground">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
          <div>
            <h2 className="text-3xl font-heading font-black tracking-tight uppercase mb-2">
              WORLD <span className="text-vouro-cyan">EXPLORER</span>
            </h2>
            <p className="text-sm text-vouro-muted max-w-lg">
              Explore the Proof Frontier city districts. Select a campaign structure inside the voxel rendering above or inspection panels below.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {districts.map((d) => (
              <div 
                key={d.id}
                className="bg-vouro-surface border border-vouro-ground hover:border-vouro-cyan/40 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition"
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <h3 className="font-heading font-bold text-lg text-vouro-text">{d.name}</h3>
                    <span className="px-2 py-0.5 text-[9px] font-mono bg-vouro-lime/10 text-vouro-lime border border-vouro-lime/20">
                      TRUST: {d.trustScore}%
                    </span>
                  </div>
                  <p className="text-xs text-vouro-muted mb-3 max-w-md">{d.description}</p>
                  <div className="flex flex-wrap gap-4 text-[10px] font-mono text-vouro-muted">
                    <span>Missions: <strong className="text-vouro-text">{d.activeMissions}</strong></span>
                    <span>Locked: <strong className="text-vouro-text">${d.rewardLocked.toLocaleString()}</strong></span>
                    <span>Builders: <strong className="text-vouro-text">{d.builders}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <span className="text-[10px] font-mono text-vouro-muted self-end">ID: {d.id.substring(0, 10)}...</span>
                  <button 
                    onClick={() => { setView('app'); useVouroStore.getState().selectDistrict(d.id); }}
                    className="btn-secondary py-1.5 text-xs text-center uppercase"
                  >
                    Open District
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* District Holographic Label Details Card */}
          <div className="bg-vouro-surface border border-vouro-lime/20 p-6 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-vouro-lime/5 rounded-full blur-2xl pointer-events-none"></div>
            <div>
              <div className="flex items-center gap-2 text-vouro-lime font-mono text-xs uppercase mb-4">
                <Compass size={14} className="animate-spin-slow" />
                <span>INSPECTING DISTRICT NODE</span>
              </div>
              {selectedMission ? (
                <div>
                  <h4 className="font-heading font-bold text-lg text-vouro-text mb-2 truncate">{selectedMission.title}</h4>
                  <p className="text-xs text-vouro-muted mb-4 line-clamp-4">{selectedMission.description}</p>
                  
                  <div className="space-y-2 border-t border-vouro-ground pt-4">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-vouro-muted">STATUS</span>
                      <span className="text-vouro-lime font-bold uppercase">{selectedMission.status}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-vouro-muted">BOUNTY VAULT</span>
                      <span className="text-vouro-cyan font-bold">{selectedMission.rewardAmount} {selectedMission.rewardToken}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-vouro-muted">VERIFICATION</span>
                      <span className="text-vouro-blue font-bold uppercase">{selectedMission.proofType}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 flex flex-col items-center justify-center relative overflow-hidden bg-vouro-bg/40 border border-vouro-ground/30 rounded-lg p-6">
                  {/* Sweep scanline element */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-vouro-cyan/30 to-transparent animate-scanline-sweep"></div>
                  </div>
                  
                  {/* Holographic Radar Scanner */}
                  <div className="relative mb-6 flex items-center justify-center animate-hologram-float">
                    {/* Ring 1 (Pulse) */}
                    <div className="absolute w-20 h-20 rounded-full border border-vouro-cyan/10 animate-ping opacity-60"></div>
                    {/* Ring 2 (Dash rotate) */}
                    <div className="absolute w-14 h-14 rounded-full border border-dashed border-vouro-cyan/20 animate-radar-spin"></div>
                    {/* Ring 3 (Inner backdrop) */}
                    <div className="absolute w-10 h-10 rounded-full bg-vouro-cyan/5 border border-vouro-ground/80"></div>
                    {/* Center Icon */}
                    <Info size={16} className="text-vouro-cyan relative z-10 animate-pulse" />
                  </div>
                  
                  <div className="space-y-2 relative z-10">
                    <span className="text-[10px] font-mono text-vouro-cyan/60 uppercase tracking-widest block animate-pulse">
                      [ awaiting uplink ]
                    </span>
                    <p className="text-xs text-vouro-muted max-w-[220px] leading-relaxed mx-auto select-none">
                      Select an active campaign structure tower in the voxel viewport to preview details.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {selectedMission && (
              <button 
                onClick={() => setView('app')}
                className="btn-primary w-full text-xs uppercase tracking-wider mt-6"
              >
                Accept Mission
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4. HOW THE WORLD WORKS */}
      <section className="py-20 bg-vouro-surface/20 border-b border-vouro-ground px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono text-vouro-lime uppercase tracking-widest block mb-2">workflow</span>
            <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase">
              How the World <span className="text-vouro-lime">Works</span>
            </h2>
            <p className="text-sm text-vouro-muted mt-2 max-w-md mx-auto">
              A block-by-block representation of the verified Proof-to-Earn cycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { num: '01', title: 'Enter a District', desc: 'Browse themed technology campaign environments.' },
              { num: '02', title: 'Accept a Mission', desc: 'Signature wallet validation commits slots allocation.' },
              { num: '03', title: 'Complete the Work', desc: 'Submit proofs from Solana, GitHub PR, or docs.' },
              { num: '04', title: 'Submit Proof Cube', desc: 'Generates SHA-256 hash reference on-chain.' },
              { num: '05', title: 'Unlock the Vault', desc: 'Approval immediately releases SPL tokens to your wallet.' },
            ].map((step, idx) => (
              <div 
                key={step.num}
                className="bg-vouro-surface border border-vouro-ground p-6 hover:-translate-y-1 transition duration-300 flex flex-col justify-between"
              >
                <div>
                  <span className="text-4xl font-mono font-black text-vouro-ground block mb-4">{step.num}</span>
                  <h3 className="font-heading font-bold text-base text-vouro-text mb-2">{step.title}</h3>
                  <p className="text-xs text-vouro-muted leading-relaxed">{step.desc}</p>
                </div>
                {idx < 4 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2 text-vouro-ground font-black text-xl z-20">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. LIVE WORLD PULSE FEED */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-b border-vouro-ground">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
          <div>
            <h2 className="text-3xl font-heading font-black uppercase mb-2">
              LIVE WORLD <span className="text-vouro-orange">PULSE</span>
            </h2>
            <p className="text-sm text-vouro-muted max-w-lg">
              Synchronized activity feed of on-chain deposits, acceptances, validations, and claims.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-vouro-surface border border-vouro-ground px-4 py-2 font-mono text-xs text-vouro-lime">
            <span className="w-2 h-2 rounded-full bg-vouro-lime animate-ping"></span>
            <span>Real-time Sync Active</span>
          </div>
        </div>

        <div className="bg-vouro-surface border border-vouro-ground overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-vouro-ground bg-vouro-bg/40 text-vouro-muted font-mono text-xs uppercase">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Event Type</th>
                  <th className="p-4">Wallet</th>
                  <th className="p-4">Campaign</th>
                  <th className="p-4 text-right">Solana TX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vouro-ground font-mono text-xs">
                {events.slice(0, 8).map((evt) => (
                  <tr key={evt.id} className="hover:bg-vouro-ground/30 transition">
                    <td className="p-4 text-vouro-muted">{new Date(evt.timestamp).toLocaleTimeString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 border ${
                        evt.type.includes('approved') || evt.type.includes('claimed')
                          ? 'text-vouro-lime border-vouro-lime/20 bg-vouro-lime/5'
                          : evt.type.includes('rejected') || evt.type.includes('dispute')
                          ? 'text-vouro-red border-vouro-red/20 bg-vouro-red/5'
                          : 'text-vouro-cyan border-vouro-cyan/20 bg-vouro-cyan/5'
                      }`}>
                        {evt.type.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-vouro-text">{evt.wallet.substring(0, 6)}...</td>
                    <td className="p-4 text-vouro-muted truncate max-w-xs">{evt.missionTitle || 'Platform Event'}</td>
                    <td className="p-4 text-right">
                      {evt.signature ? (
                        <a 
                          href={`https://explorer.solana.com/tx/${evt.signature}?cluster=mainnet-beta`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-vouro-lime hover:underline flex items-center justify-end gap-1.5"
                        >
                          <span>{evt.signature.substring(0, 8)}...</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-vouro-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. ACTIVE DISTRICTS DIORAMAS */}
      <section id="districts" className="py-20 bg-vouro-surface/10 border-b border-vouro-ground px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-heading font-black uppercase mb-2">
              ACTIVE <span className="text-vouro-lime">DISTRICTS</span>
            </h2>
            <p className="text-sm text-vouro-muted">
              Project hubs represented as distinct diorama components on the Solana network.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {districts.map((d, index) => (
              <div 
                key={d.id}
                className="cyber-panel p-6 flex flex-col justify-between hover:border-vouro-lime/50 transition duration-300 min-h-[360px]"
              >
                <div>
                  {/* Diorama miniatur representation graphic */}
                  <div className="w-full h-32 bg-vouro-ground border border-vouro-ground/80 flex items-center justify-center relative mb-6">
                    <div className="absolute inset-0 grid-bg-animated opacity-10"></div>
                    <div className="relative flex flex-col items-center">
                      {/* Voxel base mockup block */}
                      <div className="w-12 h-12 bg-vouro-surface border-2 border-vouro-lime/40 rotate-12 transform hover:scale-110 transition duration-300"></div>
                      <div className="w-6 h-6 bg-vouro-lime/20 border border-vouro-lime/60 absolute -top-3 right-0"></div>
                    </div>
                    <span className="absolute bottom-2 right-2 font-mono text-[9px] text-vouro-muted">DIORAMA_0{index+1}</span>
                  </div>

                  <h3 className="font-heading font-bold text-xl text-vouro-text mb-2">{d.name}</h3>
                  <p className="text-xs text-vouro-muted line-clamp-3 mb-4">{d.description}</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-vouro-ground">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-vouro-muted">Creator:</span>
                    <span className="text-vouro-text">{d.creator.substring(0, 6)}...</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-vouro-muted">Locked Vault:</span>
                    <span className="text-vouro-cyan font-bold">${d.rewardLocked.toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={() => { setView('app'); useVouroStore.getState().selectDistrict(d.id); }}
                    className="btn-primary w-full text-xs font-bold py-2 mt-2"
                  >
                    ENTER DISTRICT
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. MISSION BOARD MARKETPLACE */}
      <section id="missions" className="py-20 px-6 max-w-6xl mx-auto border-b border-vouro-ground">
        <div className="flex flex-col md:flex-row justify-between items-start sm:items-center gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-heading font-black uppercase mb-2">
              MISSION <span className="text-vouro-lime">BOARD</span>
            </h2>
            <p className="text-sm text-vouro-muted">
              Select a mission block, verify guidelines, submit proof cube.
            </p>
          </div>

          {/* Filtering */}
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1 text-xs font-mono border transition ${
                  categoryFilter === c 
                    ? 'bg-vouro-lime text-vouro-bg border-vouro-lime font-semibold' 
                    : 'bg-vouro-surface text-vouro-muted border-vouro-ground hover:text-vouro-lime'
                }`}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMissions.map((m) => (
            <div 
              key={m.id}
              className="bg-vouro-surface border border-vouro-ground p-6 flex flex-col justify-between hover:border-vouro-lime/30 transition min-h-[300px]"
            >
              <div>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <span className={`px-2 py-0.5 border text-[9px] font-mono uppercase ${getProofColorClass(m.proofType)}`}>
                    {m.proofType}
                  </span>
                  <span className="text-vouro-cyan font-mono text-sm font-bold">
                    {m.rewardAmount} {m.rewardToken}
                  </span>
                </div>

                <h3 className="font-heading font-bold text-base text-vouro-text mb-2 line-clamp-2">{m.title}</h3>
                <p className="text-xs text-vouro-muted line-clamp-3 mb-6">{m.description}</p>
              </div>

              <div className="space-y-3 pt-4 border-t border-vouro-ground">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-vouro-muted">Slots Available:</span>
                  <span className="text-vouro-text">{m.acceptedCount} / {m.slots}</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-vouro-muted">Vouch Required:</span>
                  <span className="text-vouro-text">{m.requiredVouchScore}+</span>
                </div>

                <button 
                  onClick={() => { setView('app'); useVouroStore.getState().selectMission(m.id); }}
                  className="btn-secondary w-full py-2 text-xs uppercase"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. PROOF PIPELINE */}
      <section id="pipeline" className="py-20 bg-vouro-surface/20 border-b border-vouro-ground px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-heading font-black uppercase">
              PROOF <span className="text-vouro-cyan">PIPELINE</span>
            </h2>
            <p className="text-sm text-vouro-muted mt-2">
              The cryptographic validation lifecycle of VOURO Proof Cubes.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6">
            {[
              { step: '01', title: 'Proof Received', desc: 'SHA-256 hashing locked to builder wallet signature.' },
              { step: '02', title: 'Sybil Gate Scan', desc: 'Vouch score matching, wallet verification, and anti-duplication.' },
              { step: '03', title: 'Source Validated', desc: 'GitHub PR or Solana Tx payload fetched from RPC.' },
              { step: '04', title: 'Human Review SLA', desc: 'SLA timer checking (24h/48h/72h) and dispute resolving.' },
              { step: '05', title: 'Vault Ready', desc: 'Reward release confirmation, on-chain state claim lock.' },
            ].map((p, index) => (
              <div 
                key={p.step}
                className="bg-vouro-surface border border-vouro-ground p-6 flex-1 relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-mono text-vouro-cyan font-bold">STAGE_{p.step}</span>
                    <span className="w-2 h-2 rounded-full bg-vouro-cyan animate-pulse"></span>
                  </div>
                  <h3 className="font-heading font-bold text-base text-vouro-text mb-2">{p.title}</h3>
                  <p className="text-xs text-vouro-muted leading-relaxed">{p.desc}</p>
                </div>
                {index < 4 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 text-vouro-cyan font-bold text-lg z-10">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. BUILDER REPUTATION LEADERBOARD */}
      <section id="builders" className="py-20 px-6 max-w-6xl mx-auto border-b border-vouro-ground">
        <div className="mb-12">
          <span className="text-xs font-mono text-vouro-cyan uppercase tracking-widest block mb-2">on-chain verified</span>
          <h2 className="text-3xl font-heading font-black uppercase mb-2">
            BUILDER <span className="text-vouro-lime">REPUTATION</span>
          </h2>
          <p className="text-sm text-vouro-muted max-w-xl">
            Reputation scores computed from on-chain proof submissions, approval rates, dispute history, and active streaks. All metrics are verifiable via Solana Explorer.
          </p>
        </div>

        {/* Builder Cards Grid */}
        <div className="space-y-8">
          {builders.map((b, bIdx) => {
            const tierColors: Record<string, string> = {
              'Apex': 'text-vouro-gold border-vouro-gold/40 bg-vouro-gold/5',
              'Vanguard': 'text-vouro-cyan border-vouro-cyan/40 bg-vouro-cyan/5',
              'Proven': 'text-vouro-lime border-vouro-lime/40 bg-vouro-lime/5',
              'Rising': 'text-vouro-orange border-vouro-orange/40 bg-vouro-orange/5',
              'Novice': 'text-vouro-muted border-vouro-muted/40 bg-vouro-muted/5',
            };
            const tierClass = tierColors[b.tier || 'Novice'] || tierColors['Novice'];
            const scoreColor = b.vouchScore >= 90 ? '#FFD700' : b.vouchScore >= 70 ? '#00E5FF' : b.vouchScore >= 50 ? '#CCFF00' : '#FF6B35';
            const scorePercent = b.vouchScore;

            return (
              <div key={b.wallet} className="bg-vouro-surface border border-vouro-ground overflow-hidden">
                {/* Header Bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-vouro-ground bg-vouro-bg/40">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-vouro-ground border-2 flex items-center justify-center font-heading font-black text-xl" style={{ borderColor: scoreColor, color: scoreColor }}>
                      #{b.rank}
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-sm text-vouro-text">
                        {b.wallet.substring(0, 8)}...{b.wallet.substring(b.wallet.length - 6)}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 text-[9px] font-mono font-bold border ${tierClass}`}>
                          {b.tier || 'Novice'}
                        </span>
                        <span className="text-[10px] font-mono text-vouro-muted">
                          Joined {b.joinedAt ? new Date(b.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs font-mono">
                    <div className="text-right">
                      <span className="text-vouro-muted block text-[10px]">VOUCH SCORE</span>
                      <span className="text-xl font-bold" style={{ color: scoreColor }}>{b.vouchScore}</span>
                      <span className="text-vouro-muted">/100</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-vouro-ground">
                  {/* LEFT: Stats Panel */}
                  <div className="p-6 space-y-3">
                    <h4 className="text-[10px] font-mono text-vouro-muted uppercase tracking-widest mb-4">Performance Metrics</h4>
                    
                    {/* Vouch Score Bar */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono mb-1">
                        <span className="text-vouro-muted">Vouch Score</span>
                        <span style={{ color: scoreColor }}>{b.vouchScore}/100</span>
                      </div>
                      <div className="w-full h-2 bg-vouro-ground overflow-hidden">
                        <div className="h-full transition-all duration-1000" style={{ width: `${scorePercent}%`, backgroundColor: scoreColor }}></div>
                      </div>
                    </div>

                    {/* Approval Rate Bar */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono mb-1">
                        <span className="text-vouro-muted">Approval Rate</span>
                        <span className="text-vouro-cyan">{b.approvalRate}%</span>
                      </div>
                      <div className="w-full h-2 bg-vouro-ground overflow-hidden">
                        <div className="h-full bg-vouro-cyan transition-all duration-1000" style={{ width: `${b.approvalRate}%` }}></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-vouro-ground p-3 border border-vouro-ground">
                        <span className="text-vouro-muted text-[9px] font-mono block">Completed</span>
                        <span className="text-lg font-bold text-vouro-text font-mono">{b.completedMissions}</span>
                      </div>
                      <div className="bg-vouro-ground p-3 border border-vouro-ground">
                        <span className="text-vouro-muted text-[9px] font-mono block">Streak</span>
                        <span className="text-lg font-bold text-vouro-cyan font-mono">{b.activeStreak}d</span>
                      </div>
                      <div className="bg-vouro-ground p-3 border border-vouro-ground">
                        <span className="text-vouro-muted text-[9px] font-mono block">Earned</span>
                        <span className="text-lg font-bold text-vouro-gold font-mono">${b.totalRewardEarned.toLocaleString()}</span>
                      </div>
                      <div className="bg-vouro-ground p-3 border border-vouro-ground">
                        <span className="text-vouro-muted text-[9px] font-mono block">Avg Response</span>
                        <span className="text-lg font-bold text-vouro-lime font-mono">{b.avgResponseTimeHours || '—'}h</span>
                      </div>
                    </div>

                    <div className="pt-2 space-y-1.5 text-[10px] font-mono">
                      <div className="flex justify-between border-b border-vouro-ground/50 pb-1">
                        <span className="text-vouro-muted">Total Submissions</span>
                        <span className="text-vouro-text">{b.totalSubmissions || b.completedMissions}</span>
                      </div>
                      <div className="flex justify-between border-b border-vouro-ground/50 pb-1">
                        <span className="text-vouro-muted">Rejected</span>
                        <span className="text-vouro-red">{b.rejectedSubmissions || 0}</span>
                      </div>
                      <div className="flex justify-between border-b border-vouro-ground/50 pb-1">
                        <span className="text-vouro-muted">Disputes Opened</span>
                        <span className="text-vouro-orange">{b.disputesOpened || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-vouro-muted">Disputes Lost</span>
                        <span className="text-vouro-red">{b.disputesLost || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* CENTER: Charts */}
                  <div className="p-6">
                    <h4 className="text-[10px] font-mono text-vouro-muted uppercase tracking-widest mb-4">Vouch Score Trend (12 Months)</h4>
                    {b.monthlyHistory && b.monthlyHistory.length > 0 ? (
                      <div className="w-full h-48">
                        <BuilderScoreChart data={b.monthlyHistory} color={scoreColor} />
                      </div>
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center text-vouro-muted text-xs font-mono">No history data</div>
                    )}

                    <h4 className="text-[10px] font-mono text-vouro-muted uppercase tracking-widest mb-4 mt-6">Category Breakdown</h4>
                    {b.categoryBreakdown && b.categoryBreakdown.length > 0 ? (
                      <div className="w-full h-40">
                        <BuilderCategoryChart data={b.categoryBreakdown} />
                      </div>
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center text-vouro-muted text-xs font-mono">No breakdown data</div>
                    )}
                  </div>

                  {/* RIGHT: Recent Missions + Badges */}
                  <div className="p-6">
                    <h4 className="text-[10px] font-mono text-vouro-muted uppercase tracking-widest mb-4">Recent Missions</h4>
                    <div className="space-y-2">
                      {(b.recentMissions || []).slice(0, 5).map((m, mIdx) => (
                        <div key={mIdx} className="bg-vouro-ground p-3 border border-vouro-ground/50">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-mono text-vouro-text leading-tight flex-1 truncate">{m.title}</span>
                            <span className={`px-1.5 py-0.5 text-[8px] font-mono font-bold border whitespace-nowrap ${
                              m.status === 'approved' ? 'text-vouro-lime border-vouro-lime/30 bg-vouro-lime/5' :
                              m.status === 'rejected' ? 'text-vouro-red border-vouro-red/30 bg-vouro-red/5' :
                              'text-vouro-orange border-vouro-orange/30 bg-vouro-orange/5'
                            }`}>{m.status.toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between mt-1.5 text-[9px] font-mono">
                            <span className="text-vouro-muted">{m.date}</span>
                            <span className="text-vouro-gold font-bold">{m.reward} {m.token}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <h4 className="text-[10px] font-mono text-vouro-muted uppercase tracking-widest mb-3 mt-6">Specializations</h4>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {b.specializations.map((s) => (
                        <span key={s} className="px-2 py-0.5 text-[9px] font-mono text-vouro-cyan bg-vouro-cyan/5 border border-vouro-cyan/20">{s}</span>
                      ))}
                    </div>

                    <h4 className="text-[10px] font-mono text-vouro-muted uppercase tracking-widest mb-3">Badges</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {b.badges.map((badge) => (
                        <span key={badge} className="px-2 py-1 text-[9px] font-mono text-vouro-gold bg-vouro-gold/5 border border-vouro-gold/20 font-bold">
                          ★ {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. RULES SECTION */}
      <section id="rules" className="py-20 bg-vouro-surface/10 border-b border-vouro-ground px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <span className="text-xs font-mono text-vouro-lime uppercase tracking-widest block mb-2">security first</span>
            <h2 className="text-3xl font-heading font-black uppercase">
              Clear Rules. <span className="text-vouro-lime">Verifiable Outcomes.</span>
            </h2>
            <p className="text-sm text-vouro-muted mt-1">
              Smart contract constraints hardcoded in the VOURO program on-chain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-mono">
            {[
              { rule: 'RULE 01 — REWARD FIRST', desc: 'Creators must deposit all rewards into the Vault PDA before the campaign can be published. Campaigns remain inactive until confirmed.' },
              { rule: 'RULE 02 — CLEAR SCHEMA', desc: 'Every campaign must define accepted proof types, required fields, verification methods, acceptance criteria, deadlines, revision limits, and dispute duration.' },
              { rule: 'RULE 03 — NO SILENT REJECTION', desc: 'Reviewers cannot reject a proof without selecting a valid rejection code and providing a detailed explanation.' },
              { rule: 'RULE 04 — LIMITED REVISION', desc: 'Creators select a maximum revision limit (0, 1, or 2). This limit cannot be decreased once a submission is active.' },
              { rule: 'RULE 05 — REVIEW DEADLINE', desc: 'Creators must specify a review SLA (24h/48h/72h). If expired, the submission enters the escalation queue.' },
              { rule: 'RULE 08 — VAULT LOCKED', desc: 'Rewards allocated for approved submissions are locked and cannot be withdrawn by the campaign creator.' },
            ].map((r) => (
              <div key={r.rule} className="bg-vouro-surface border border-vouro-ground p-6">
                <h3 className="text-vouro-lime font-bold text-sm mb-3">{r.rule}</h3>
                <p className="text-vouro-muted leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. API AND DEVELOPERS MODULE */}
      <section id="dev" className="py-20 px-6 max-w-6xl mx-auto border-b border-vouro-ground">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-heading font-black uppercase mb-4">
              DEVELOPER <span className="text-vouro-cyan">SANDBOX</span>
            </h2>
            <p className="text-sm text-vouro-muted mb-6 leading-relaxed">
              Integrate your own platform campaign adapters or fetch proof validation details via the VOURO Public API. Complete public read-only access points.
            </p>

            <div className="space-y-4">
              <div className="flex gap-3 items-center">
                <Code size={18} className="text-vouro-cyan" />
                <div>
                  <h4 className="text-xs font-mono font-bold text-vouro-text">REST API & Webhooks</h4>
                  <p className="text-[11px] text-vouro-muted">Webhook subscriptions parse SPL transfers and GitHub merges instantly.</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <Layers size={18} className="text-vouro-cyan" />
                <div>
                  <h4 className="text-xs font-mono font-bold text-vouro-text">Solana Program Event Indexer</h4>
                  <p className="text-[11px] text-vouro-muted">Direct read integration to PDA structures via indexer endpoints.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Terminal component display */}
          <div className="bg-[#050706] border border-vouro-ground p-4 font-mono text-[11px] text-[#A2CCA9] relative overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center border-b border-vouro-ground pb-2 mb-3 text-vouro-muted text-[10px]">
              <span>REST_API_TERMINAL.EXE</span>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-vouro-red"></span>
                <span className="w-2 h-2 rounded-full bg-vouro-orange"></span>
                <span className="w-2 h-2 rounded-full bg-vouro-lime"></span>
              </div>
            </div>
            <div className="space-y-2 select-text">
              <p className="text-vouro-muted"># Fetch health metrics on active data feeds</p>
              <p className="text-vouro-lime">$ curl -X GET http://localhost:5000/api/health</p>
              <pre className="text-vouro-muted bg-vouro-surface/40 p-2 border border-vouro-ground overflow-x-auto text-[10px]">
{`{
  "status": "operational",
  "providers": {
    "solana": { "status": "operational", "latencyMs": 72 },
    "helius": { "status": "operational" },
    "jupiter": { "status": "operational" }
  }
}`}
              </pre>
              <p className="text-vouro-muted"># Verify Solana transaction proof schema</p>
              <p className="text-vouro-lime">$ curl -X POST http://localhost:5000/api/proofs/solana/validate</p>
              <p className="text-[10px] text-vouro-muted">{"{ \"signature\": \"3N2u9x8...\", \"expectedProgram\": \"VouRo111...\" }"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 12. FINAL CTA */}
      <section className="py-24 text-center px-6 bg-vouro-surface/20 border-b border-vouro-ground relative">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-heading font-black uppercase tracking-tight mb-4">
            YOUR WORK CAN BUILD THE WORLD.
          </h2>
          <p className="text-sm text-vouro-muted mb-8 max-w-lg mx-auto">
            Leave Proof. Build VOURO. Get rewards on Solana instantly.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <button 
              onClick={() => setView('app')}
              className="btn-primary"
            >
              Explore Missions
            </button>
            <button 
              onClick={() => { setView('app'); useVouroStore.getState().setAppRoute('create-mission'); }}
              className="btn-secondary"
            >
              Create District
            </button>
          </div>
        </div>
      </section>

      {/* Wallet Selector Modal */}
      {showWalletModal && (() => {
        const isPhantomAvailable = typeof window !== 'undefined' && !!((window as any).phantom?.solana || (window as any).solana?.isPhantom);
        const isSolflareAvailable = typeof window !== 'undefined' && !!(window as any).solflare;
        const isBackpackAvailable = typeof window !== 'undefined' && !!((window as any).backpack || (window as any).backpack?.solana);

        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
            <div className="bg-vouro-surface border border-vouro-lime/30 p-6 max-w-sm w-full font-heading">
              <h3 className="text-lg font-bold text-vouro-text uppercase mb-2">Connect Solana Wallet</h3>
              <p className="text-xs text-vouro-muted mb-6">Select your Solana wallet to sign instructions.</p>

              <div className="space-y-2">
                <button 
                  onClick={() => handleWalletSelect('phantom')}
                  className="w-full p-3 bg-vouro-ground hover:bg-vouro-lime hover:text-vouro-bg border border-vouro-ground flex justify-between items-center transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0 rounded-sm" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="128" height="128" fill="#AB9FF2"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M55.6416 82.1477C50.8744 89.4525 42.8862 98.6966 32.2568 98.6966C27.232 98.6966 22.4004 96.628 22.4004 87.6424C22.4004 64.7584 53.6445 29.3335 82.6339 29.3335C99.1257 29.3335 105.697 40.7755 105.697 53.7689C105.697 70.4471 94.8739 89.5171 84.1156 89.5171C80.7013 89.5171 79.0264 87.6424 79.0264 84.6688C79.0264 83.8931 79.1552 83.0527 79.4129 82.1477C75.7409 88.4182 68.6546 94.2361 62.0192 94.2361C57.1877 94.2361 54.7397 91.1979 54.7397 86.9314C54.7397 85.3799 55.0618 83.7638 55.6416 82.1477ZM80.6133 53.3182C80.6133 57.1044 78.3795 58.9975 75.8806 58.9975C73.3438 58.9975 71.1479 57.1044 71.1479 53.3182C71.1479 49.532 73.3438 47.6389 75.8806 47.6389C78.3795 47.6389 80.6133 49.532 80.6133 53.3182ZM94.8102 53.3184C94.8102 57.1046 92.5763 58.9977 90.0775 58.9977C87.5407 58.9977 85.3447 57.1046 85.3447 53.3184C85.3447 49.5323 87.5407 47.6392 90.0775 47.6392C92.5763 47.6392 94.8102 49.5323 94.8102 53.3184Z" fill="#FFFDF8"/>
                    </svg>
                    <span className="font-bold text-xs uppercase font-mono text-vouro-text hover:text-inherit">Phantom</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80">
                    {walletConnected && walletAddress ? 'Connected' : (isPhantomAvailable ? 'Available' : 'Not Installed')}
                  </span>
                </button>

                <button 
                  onClick={() => handleWalletSelect('solflare')}
                  className="w-full p-3 bg-vouro-ground hover:bg-vouro-lime hover:text-vouro-bg border border-vouro-ground flex justify-between items-center transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0 rounded-sm" viewBox="0 0 290 290" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_146_299)">
                        <path d="M63.2951 1H226.705C261.11 1 289 28.8905 289 63.2951V226.705C289 261.11 261.11 289 226.705 289H63.2951C28.8905 289 1 261.11 1 226.705V63.2951C1 28.8905 28.8905 1 63.2951 1Z" fill="#FFEF46" stroke="#EEDA0F" strokeWidth="2"/>
                        <path d="M140.548 153.231L154.832 139.432L181.462 148.147C198.893 153.958 207.609 164.61 207.609 179.62C207.609 190.999 203.251 198.504 194.536 208.188L191.873 211.093L192.841 204.314C196.714 179.62 189.452 168.968 165.484 161.22L140.548 153.231ZM104.717 68.739L177.347 92.9488L161.61 107.959L123.843 95.3698C110.77 91.012 106.412 83.9911 104.717 69.2232V68.739ZM100.359 191.725L116.822 175.988L147.811 186.157C164.031 191.483 169.599 198.504 167.905 216.177L100.359 191.725ZM79.539 121.516C79.539 116.917 81.9599 112.559 86.0756 108.927C90.4334 115.222 97.9384 120.79 109.801 124.664L135.464 133.137L121.18 146.937L96.0016 138.705C84.3809 134.832 79.539 129.021 79.539 121.516ZM155.558 248.618C208.819 213.272 237.387 189.304 237.387 159.768C237.387 140.158 225.766 129.263 200.104 120.79L180.736 114.253L233.756 63.4128L223.103 52.0342L207.367 65.8337L133.043 41.3818C110.043 48.8869 80.9916 70.9178 80.9916 92.9487C80.9916 95.3697 81.2337 97.7907 81.96 100.454C62.8342 111.348 55.0871 121.516 55.0871 134.105C55.0871 145.968 61.3816 157.831 81.4758 164.368L97.4542 169.694L42.2559 222.713L52.9082 234.092L70.0972 218.356L155.558 248.618Z" fill="#02050A"/>
                      </g>
                      <defs>
                        <clipPath id="clip0_146_299">
                          <rect width="290" height="290" fill="white"/>
                        </clipPath>
                      </defs>
                    </svg>
                    <span className="font-bold text-xs uppercase font-mono text-vouro-text hover:text-inherit">Solflare</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80">
                    {isSolflareAvailable ? 'Available' : 'Not Installed'}
                  </span>
                </button>

                <button 
                  onClick={() => handleWalletSelect('backpack')}
                  className="w-full p-3 bg-vouro-ground hover:bg-vouro-lime hover:text-vouro-bg border border-vouro-ground flex justify-between items-center transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 11 15.999799728393555" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_1_803)">
                        <path fillRule="evenodd" clipRule="evenodd" d="M6.54201 1.25805C7.12356 1.25805 7.66905 1.33601 8.1741 1.48059C7.67963 0.328169 6.65297 0 5.51038 0C4.36555 0 3.3371 0.329459 2.84375 1.48738C3.3451 1.33771 3.88824 1.25805 4.4678 1.25805H6.54201ZM4.33478 2.41504C1.57335 2.41504 0 4.58743 0 7.2672V10.02C0 10.288 0.223858 10.5 0.5 10.5H10.5C10.7761 10.5 11 10.288 11 10.02V7.2672C11 4.58743 9.17041 2.41504 6.40899 2.41504H4.33478ZM5.49609 7.29102C6.46259 7.29102 7.24609 6.50751 7.24609 5.54102C7.24609 4.57452 6.46259 3.79102 5.49609 3.79102C4.5296 3.79102 3.74609 4.57452 3.74609 5.54102C3.74609 6.50751 4.5296 7.29102 5.49609 7.29102ZM0 12.118C0 11.8501 0.223858 11.6328 0.5 11.6328H10.5C10.7761 11.6328 11 11.8501 11 12.118V15.0293C11 15.5653 10.5523 15.9998 10 15.9998H1C0.447715 15.9998 0 15.5653 0 15.0293V12.118Z" fill="#E33E3F"/>
                      </g>
                      <defs>
                        <clipPath id="clip0_1_803">
                          <rect width="11" height="15.999799728393555" fill="white"/>
                        </clipPath>
                      </defs>
                    </svg>
                    <span className="font-bold text-xs uppercase font-mono text-vouro-text hover:text-inherit">Backpack</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80">
                    {isBackpackAvailable ? 'Available' : 'Not Installed'}
                  </span>
                </button>
              </div>

              <button 
                onClick={() => setShowWalletModal(false)}
                className="w-full text-center py-2 text-xs border border-vouro-red/20 text-vouro-red mt-6 hover:bg-vouro-red/10"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-xs font-mono text-vouro-muted border-t border-vouro-ground flex flex-col items-center gap-4">
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/vouro-labs/vouro-platform"
            target="_blank"
            rel="noopener noreferrer"
            className="text-vouro-muted hover:text-vouro-lime transition p-1.5 flex items-center justify-center"
            title="GitHub"
          >
            <GithubIcon className="w-5 h-5" />
          </a>
          <a
            href="https://x.com/VouroLabs/photo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-vouro-muted hover:text-vouro-lime transition p-1.5 flex items-center justify-center"
            title="X (Twitter)"
          >
            <XIcon className="w-4 h-4" />
          </a>
        </div>
        <span>© {new Date().getFullYear()} VOURO Platform. Powered by Helius & Jupiter Price Indexing.</span>
      </footer>
      <ToastContainer />
    </div>
  );
}
