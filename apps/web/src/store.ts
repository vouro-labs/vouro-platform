/// <reference types="vite/client" />
import { create } from 'zustand';
import { District, Mission, Submission, Dispute, Builder, WorldEvent, HealthResponse, MissionStatus } from '@vouro/shared';

// API BASE URL from env or proxy
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface VouroStore {
  // Navigation & Routing
  currentView: 'landing' | 'app';
  appRoute: string; // 'world' | 'missions' | 'my-missions' | 'proof-lab' | 'rewards' | 'builder-profile' | 'districts' | 'create-mission' | 'verification-queue' | 'disputes' | 'settings'
  selectedDistrictId: string | null;
  selectedMissionId: string | null;
  selectedSubmissionId: string | null;
  
  // Wallet state
  walletConnected: boolean;
  walletAddress: string | null;
  walletBalance: number; // in SOL
  connectingWallet: boolean;
  walletRegistered: boolean;
  walletRegSignature: string | null;
  
  // Viewport Settings
  lightweightMode: boolean; // low-end devices or prefers-reduced-motion
  
  // Live Sync Data
  districts: District[];
  missions: Mission[];
  submissions: Submission[];
  disputes: Dispute[];
  events: WorldEvent[];
  builders: Builder[];
  
  // Health Indicators
  health: HealthResponse | null;
  isDevMode: boolean;

  // Toast Notifications
  toasts: Toast[];
  triggerToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  dismissToast: (id: string) => void;
  
  // Actions
  setView: (view: 'landing' | 'app') => void;
  setAppRoute: (route: string) => void;
  selectDistrict: (id: string | null) => void;
  selectMission: (id: string | null) => void;
  selectSubmission: (id: string | null) => void;
  connectWallet: (provider: string) => Promise<void>;
  disconnectWallet: () => void;
  setLightweightMode: (val: boolean) => void;
  gpuLagDetected: boolean;
  setGpuLagDetected: (detected: boolean) => void;
  
  // Fetch Actions
  fetchWorldData: () => Promise<void>;
  fetchMissions: () => Promise<void>;
  fetchSubmissions: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  
  // Mutation Actions
  createMission: (data: any) => Promise<boolean>;
  fundMission: (missionId: string, signature: string) => Promise<boolean>;
  acceptMission: (missionId: string, wallet: string) => Promise<boolean>;
  submitProof: (missionId: string, wallet: string, proofType: string, content: any) => Promise<boolean>;
  reviewSubmission: (submissionId: string, status: 'approved' | 'rejected', code?: string, reason?: string, reviewerWallet?: string) => Promise<boolean>;
  submitRevision: (submissionId: string, content: any) => Promise<boolean>;
  disputeSubmission: (submissionId: string, reason: string, wallet: string) => Promise<boolean>;
  claimReward: (submissionId: string) => Promise<boolean>;
  checkWalletRegistration: (walletAddress: string) => Promise<boolean>;
  registerWallet: (walletAddress: string, signature: string) => Promise<boolean>;
}

export const useVouroStore = create<VouroStore>((set, get) => {
  // Check for prefers-reduced-motion to default to Lightweight Mode
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Check mock data flag
  const isDevMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

  return {
    currentView: 'landing',
    appRoute: 'world',
    selectedDistrictId: null,
    selectedMissionId: null,
    selectedSubmissionId: null,
    
    walletConnected: false,
    walletAddress: null,
    walletBalance: 0,
    connectingWallet: false,
    walletRegistered: false,
    walletRegSignature: null,
    
    lightweightMode: prefersReducedMotion,
    gpuLagDetected: false,
    
    districts: [],
    missions: [],
    submissions: [],
    disputes: [],
    events: [],
    builders: [],
    health: null,
    isDevMode,
    toasts: [],

    setView: (view) => set({ currentView: view }),
    triggerToast: (message, type = 'info') => {
      const id = `toast-${Math.random().toString(36).substring(2, 9)}`;
      set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
      setTimeout(() => {
        get().dismissToast(id);
      }, 4000);
    },
    dismissToast: (id) => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    },
    setAppRoute: (route) => set({ appRoute: route, selectedMissionId: null, selectedSubmissionId: null }),
    selectDistrict: (id) => set({ selectedDistrictId: id }),
    selectMission: (id) => set({ selectedMissionId: id }),
    selectSubmission: (id) => set({ selectedSubmissionId: id }),
    
    connectWallet: async (provider) => {
      set({ connectingWallet: true });
      try {
        let address = '';
        let balance = 12.45; // Default fallback balance
        
        if (provider === 'phantom') {
          const ph = (window as any).phantom?.solana || (window as any).solana;
          if (ph && ph.isPhantom) {
            const resp = await ph.connect();
            address = resp.publicKey.toString();
          } else {
            get().triggerToast('Phantom Wallet extension is not installed! Please install it from phantom.app.', 'warning');
            set({ connectingWallet: false });
            return;
          }
        } else if (provider === 'solflare') {
          const sf = (window as any).solflare;
          if (sf) {
            await sf.connect();
            address = sf.publicKey.toString();
          } else {
            get().triggerToast('Solflare Wallet extension is not installed! Please install it from solflare.com.', 'warning');
            set({ connectingWallet: false });
            return;
          }
        } else if (provider === 'backpack') {
          const bp = (window as any).backpack || (window as any).backpack?.solana;
          if (bp) {
            await bp.connect();
            address = bp.publicKey ? bp.publicKey.toString() : '';
          } else {
            get().triggerToast('Backpack Wallet extension is not installed! Please install it from backpack.app.', 'warning');
            set({ connectingWallet: false });
            return;
          }
        } else {
          // Fallback or generic window.solana
          const sol = (window as any).solana;
          if (sol) {
            const resp = await sol.connect();
            address = resp.publicKey.toString();
          } else {
            get().triggerToast('No Solana wallet extension detected!', 'error');
            set({ connectingWallet: false });
            return;
          }
        }

        if (!address) {
          throw new Error('No public key returned from wallet');
        }

        // Fetch real SOL balance from Solana JSON-RPC mainnet
        try {
          const rpcRes = await fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getBalance',
              params: [address]
            })
          });
          const rpcData = await rpcRes.json();
          if (rpcData?.result?.value !== undefined) {
            balance = rpcData.result.value / 1_000_000_000;
          }
        } catch (rpcErr) {
          console.warn('Could not fetch real wallet balance, using mock:', rpcErr);
        }

        set({
          walletConnected: true,
          walletAddress: address,
          walletBalance: parseFloat(balance.toFixed(4)),
          connectingWallet: false,
        });

        // Check registration
        await get().checkWalletRegistration(address);

        // Add connecting event
        const welcomeEvent: WorldEvent = {
          id: `evt-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          type: 'mission_accepted',
          wallet: address,
          missionId: '',
          missionTitle: '',
          dataSource: 'database',
          confirmationStatus: 'processed',
          details: `Wallet ${address.substring(0, 6)}... connected via ${provider.toUpperCase()}.`,
        };
        set((state) => ({ events: [welcomeEvent, ...state.events] }));
      } catch (err: any) {
        console.error('Wallet connection failed:', err);
        get().triggerToast(`Connection failed: ${err.message || err}`, 'error');
        set({ connectingWallet: false });
      }
    },
    
    disconnectWallet: () => {
      set({
        walletConnected: false,
        walletAddress: null,
        walletBalance: 0,
        walletRegistered: false,
        walletRegSignature: null,
      });
    },

    checkWalletRegistration: async (walletAddress) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/builders/${walletAddress}`);
        if (!res.ok) throw new Error('Failed to fetch builder profile');
        const data = await res.json();
        const isReg = !!data.registered;
        set({ 
          walletRegistered: isReg,
          walletRegSignature: data.regTxSignature || null 
        });
        return isReg;
      } catch (err) {
        console.error('Error checking wallet registration:', err);
        return false;
      }
    },

    registerWallet: async (walletAddress, signature) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: walletAddress, signature })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Registration failed');
        }
        set({ 
          walletRegistered: true, 
          walletRegSignature: signature 
        });
        // Add register event to history
        const regEvent: WorldEvent = {
          id: `evt-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          type: 'mission_accepted',
          wallet: walletAddress,
          missionId: '',
          missionTitle: '',
          dataSource: 'solana',
          confirmationStatus: 'confirmed',
          details: `Builder wallet registered with SQLite. Tx signature: ${signature.substring(0, 10)}...`
        };
        set((state) => ({ events: [regEvent, ...state.events] }));
        return true;
      } catch (err: any) {
        get().triggerToast(`Registration failed: ${err.message}`, 'error');
        return false;
      }
    },
    
    setLightweightMode: (val) => set({ lightweightMode: val }),
    setGpuLagDetected: (val) => set({ gpuLagDetected: val }),

    fetchWorldData: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/world`);
        if (!res.ok) throw new Error('API down');
        const data = await res.json();
        set({
          districts: data.districts || [],
          builders: data.builders || [],
        });
      } catch (err) {
        if (get().isDevMode) {
          // Load dev fallback
          set({
            districts: [
              {
                id: 'dist-1-proof-frontier',
                name: 'Proof Frontier',
                creator: '5W34n2k12pD14vSgQrtA71F6JzE8g9sK7qX9wY2z1t',
                trustScore: 98,
                activeMissions: 3,
                rewardLocked: 45000,
                builders: 142,
                verificationMethod: 'Multi-Sig + Helius',
                status: 'active',
                description: 'The central district of VOURO.',
              },
              {
                id: 'dist-2-defi-plaza',
                name: 'DeFi Plaza',
                creator: '7KqZ2d812pD14vSgQrtA71F6JzE8g9sK7qX9wY2z3r',
                trustScore: 95,
                activeMissions: 2,
                rewardLocked: 120000,
                builders: 89,
                verificationMethod: 'On-Chain Oracle Validation',
                status: 'active',
                description: 'Voxel buildings dedicated to decentralized finance integrations.',
              }
            ],
            builders: [
              {
                wallet: 'GqK5z1111111111111111111111111111111111111',
                vouchScore: 88,
                rank: 1,
                completedMissions: 34,
                approvalRate: 94.4,
                totalRewardEarned: 12450,
                activeStreak: 12,
                specializations: ['Solana Program', 'TypeScript'],
                badges: ['Genesis Builder'],
                tier: 'Apex',
                joinedAt: new Date(Date.now() - 86400000 * 300).toISOString(),
                totalSubmissions: 36,
                rejectedSubmissions: 2,
                disputesOpened: 1,
                disputesLost: 0,
                avgResponseTimeHours: 4.2,
                monthlyHistory: [
                  { month: 'Jan', vouchScore: 62, missionsCompleted: 2, approvalRate: 85, rewardsEarned: 800, disputesReceived: 0 },
                  { month: 'Feb', vouchScore: 66, missionsCompleted: 3, approvalRate: 88, rewardsEarned: 1200, disputesReceived: 0 },
                  { month: 'Mar', vouchScore: 71, missionsCompleted: 4, approvalRate: 90, rewardsEarned: 1450, disputesReceived: 1 },
                  { month: 'Apr', vouchScore: 74, missionsCompleted: 3, approvalRate: 91, rewardsEarned: 1100, disputesReceived: 0 },
                  { month: 'May', vouchScore: 79, missionsCompleted: 5, approvalRate: 92, rewardsEarned: 2200, disputesReceived: 0 },
                  { month: 'Jun', vouchScore: 82, missionsCompleted: 4, approvalRate: 93, rewardsEarned: 1800, disputesReceived: 0 },
                  { month: 'Jul', vouchScore: 84, missionsCompleted: 3, approvalRate: 93.5, rewardsEarned: 1350, disputesReceived: 0 },
                  { month: 'Aug', vouchScore: 85, missionsCompleted: 4, approvalRate: 94, rewardsEarned: 1000, disputesReceived: 0 },
                  { month: 'Sep', vouchScore: 86, missionsCompleted: 2, approvalRate: 94.2, rewardsEarned: 650, disputesReceived: 0 },
                  { month: 'Oct', vouchScore: 87, missionsCompleted: 2, approvalRate: 94.3, rewardsEarned: 450, disputesReceived: 0 },
                  { month: 'Nov', vouchScore: 87, missionsCompleted: 1, approvalRate: 94.3, rewardsEarned: 200, disputesReceived: 0 },
                  { month: 'Dec', vouchScore: 88, missionsCompleted: 1, approvalRate: 94.4, rewardsEarned: 250, disputesReceived: 0 },
                ],
                categoryBreakdown: [
                  { category: 'Solana Program', completed: 14, approved: 13, rejected: 1 },
                  { category: 'GitHub PR', completed: 12, approved: 12, rejected: 0 },
                ],
                recentMissions: [
                  { title: 'Implement VOURO Smart Contract instructions in Anchor', status: 'approved', reward: 2500, token: 'USDC', date: '2026-06-20' },
                ]
              }
            ]
          });
        }
      }
    },

    fetchMissions: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/missions`);
        if (!res.ok) throw new Error('API down');
        const data = await res.json();
        set({ missions: data });
      } catch (err) {
        if (get().isDevMode) {
          set({
            missions: [
              {
                id: 'mission-1',
                title: 'Implement VOURO Smart Contract instructions in Anchor',
                description: 'Implement the core on-chain instructions for creating campaigns, depositing rewards, submitting proof hashes, and resolving disputes. Ensure checked arithmetic and owner validation.',
                districtId: 'dist-1-proof-frontier',
                districtName: 'Proof Frontier',
                creator: '5W34n2k12pD14vSgQrtA71F6JzE8g9sK7qX9wY2z1t',
                rewardAmount: 2500,
                rewardToken: 'USDC',
                usdEstimate: 2500,
                slots: 3,
                acceptedCount: 2,
                deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
                proofType: 'solana',
                verificationRules: 'Must provide valid Solana transaction signature showing deployment or interactions.',
                revisionLimit: 2,
                disputePeriod: 48,
                requiredVouchScore: 40,
                requiredBadges: ['Solana Auditor'],
                txSignature: '3N2u9x8y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c',
                status: 'active',
                createdAt: new Date().toISOString(),
              },
              {
                id: 'mission-2',
                title: 'Optimize Voxel mesh rendering inside R3F scene',
                description: 'Optimize the Three.js viewport performance. Use InstancedMesh and Level of Detail (LOD) to support 300+ animated voxel buildings without visual stutter.',
                districtId: 'dist-3-builders-hub',
                districtName: 'Builders Hub',
                creator: '8Mtx2v312pD14vSgQrtA71F6JzE8g9sK7qX9wY2z5p',
                rewardAmount: 15,
                rewardToken: 'SOL',
                usdEstimate: 2100,
                slots: 2,
                acceptedCount: 1,
                deadline: new Date(Date.now() + 43200000).toISOString(), // Under 24h
                proofType: 'github',
                verificationRules: 'Submit GitHub PR linked to vouro-monorepo. Must show changes implementing InstancedMesh.',
                revisionLimit: 1,
                disputePeriod: 24,
                requiredVouchScore: 20,
                requiredBadges: [],
                txSignature: '4V8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d',
                status: 'expiring',
                createdAt: new Date().toISOString(),
              }
            ]
          });
        }
      }
    },

    fetchSubmissions: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/submissions`);
        if (!res.ok) throw new Error('API down');
        const data = await res.json();
        set({ submissions: Array.isArray(data) ? data : [data] });
      } catch (err) {
        if (get().isDevMode) {
          set({
            submissions: [
              {
                id: 'sub-1',
                missionId: 'mission-3',
                missionTitle: 'Jupiter Pricing V3 Cache Endpoint Implementation',
                builderWallet: '9zP7w3333333333333333333333333333333333333',
                status: 'pending',
                proofHash: '4a8f9c2d1b0a8e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5c',
                proofType: 'github',
                content: {
                  repository: 'vouro-frontier/vouro-monorepo',
                  pullRequestNumber: 12,
                },
                reasons: [],
                timestamp: new Date().toISOString(),
                revisionIndex: 0,
              },
              {
                id: 'sub-2',
                missionId: 'mission-2',
                missionTitle: 'Optimize Voxel mesh rendering inside R3F scene',
                builderWallet: 'GqK5z1111111111111111111111111111111111111',
                status: 'approved',
                proofHash: '7f8c9b2d1b0a8e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5e',
                proofType: 'github',
                content: {
                  repository: 'vouro-frontier/vouro-monorepo',
                  pullRequestNumber: 15,
                },
                reasons: [],
                timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
                revisionIndex: 0,
              }
            ]
          });
        }
      }
    },

    fetchEvents: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/world/events`);
        if (!res.ok) throw new Error('API down');
        const data = await res.json();
        set({ events: data });
      } catch (err) {
        if (get().isDevMode) {
          set({
            events: [
              {
                id: 'evt-1',
                timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
                type: 'mission_created',
                wallet: '5W34n2k12pD14vSgQrtA71F6JzE8g9sK7qX9wY2z1t',
                missionId: 'mission-1',
                missionTitle: 'Implement VOURO Smart Contract instructions in Anchor',
                signature: '3tZ2vFpH7f3mQ9zX4e8d2Lq1m6YwU5aB3C9vM8xP7e1o4N8r3k9m2b8s1a6f7g4h',
                dataSource: 'solana',
                confirmationStatus: 'finalized',
                details: 'Mission funded with 7,500 USDC locked in Vault.',
              },
              {
                id: 'evt-2',
                timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
                type: 'mission_accepted',
                wallet: 'GqK5z1111111111111111111111111111111111111',
                missionId: 'mission-1',
                missionTitle: 'Implement VOURO Smart Contract instructions in Anchor',
                signature: '4yF4g7rB1uD2K8pYc9a3m6h4f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6',
                dataSource: 'database',
                confirmationStatus: 'processed',
                details: 'Builder GqK5z... accepted mission.',
              }
            ]
          });
        }
      }
    },

    fetchHealth: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/health`);
        if (!res.ok) throw new Error('API down');
        const data = await res.json();
        set({ health: data });
      } catch (err) {
        set({
          health: {
            status: 'degraded',
            providers: {
              solana: { status: 'degraded', latencyMs: 320, slot: 283920150 },
              helius: { status: 'offline' },
              jupiter: { status: 'operational', lastUpdated: new Date().toISOString() },
              dexscreener: { status: 'operational', lastUpdated: new Date().toISOString() },
              database: { status: 'offline' }
            }
          }
        });
      }
    },

    createMission: async (data) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/missions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) return false;
        await get().fetchMissions();
        await get().fetchEvents();
        return true;
      } catch (e) {
        if (get().isDevMode) {
          const newMission: Mission = {
            id: `mission-${Math.random().toString(36).substr(2, 9)}`,
            title: data.title,
            description: data.description,
            districtId: data.districtId,
            districtName: 'Proof Frontier',
            creator: data.creator,
            rewardAmount: data.rewardAmount,
            rewardToken: data.rewardToken,
            usdEstimate: data.rewardAmount,
            slots: data.slots,
            acceptedCount: 0,
            deadline: data.deadline,
            proofType: data.proofType,
            verificationRules: data.verificationRules,
            revisionLimit: data.revisionLimit,
            disputePeriod: data.disputePeriod,
            requiredVouchScore: data.requiredVouchScore,
            requiredBadges: [],
            txSignature: data.txSignature,
            status: 'active',
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            missions: [newMission, ...state.missions],
            events: [{
              id: `evt-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              type: 'mission_created',
              wallet: data.creator,
              missionId: newMission.id,
              missionTitle: newMission.title,
              signature: data.txSignature,
              dataSource: 'solana',
              confirmationStatus: 'confirmed',
              details: `New campaign created and funded locally.`
            }, ...state.events]
          }));
          return true;
        }
        return false;
      }
    },

    fundMission: async (missionId, signature) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/missions/${missionId}/fund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signature }),
        });
        return res.ok;
      } catch (e) {
        return false;
      }
    },

    acceptMission: async (missionId, wallet) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/missions/${missionId}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ builderWallet: wallet }),
        });
        if (!res.ok) return false;
        await get().fetchMissions();
        await get().fetchEvents();
        return true;
      } catch (e) {
        if (get().isDevMode) {
          set((state) => ({
            missions: state.missions.map((m) =>
              m.id === missionId ? { ...m, acceptedCount: m.acceptedCount + 1 } : m
            ),
            events: [{
              id: `evt-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              type: 'mission_accepted',
              wallet,
              missionId,
              missionTitle: state.missions.find((m) => m.id === missionId)?.title || '',
              dataSource: 'database',
              confirmationStatus: 'processed',
              details: `Builder ${wallet.substring(0, 6)}... accepted campaign locally.`
            }, ...state.events]
          }));
          return true;
        }
        return false;
      }
    },

    submitProof: async (missionId, wallet, proofType, content) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/missions/${missionId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ builderWallet: wallet, proofType, content }),
        });
        if (!res.ok) return false;
        await get().fetchSubmissions();
        await get().fetchMissions();
        await get().fetchEvents();
        return true;
      } catch (e) {
        if (get().isDevMode) {
          const hash = '4a8f9c2d1b0a8e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5c';
          const newSub: Submission = {
            id: `sub-${Math.random().toString(36).substr(2, 9)}`,
            missionId,
            missionTitle: get().missions.find((m) => m.id === missionId)?.title || '',
            builderWallet: wallet,
            status: 'pending',
            proofHash: hash,
            proofType,
            content,
            reasons: [],
            timestamp: new Date().toISOString(),
            revisionIndex: 0,
          };
          set((state) => ({
            submissions: [newSub, ...state.submissions],
            missions: state.missions.map((m) => m.id === missionId ? { ...m, status: 'verifying' } : m),
            events: [{
              id: `evt-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              type: 'submission_created',
              wallet,
              missionId,
              missionTitle: newSub.missionTitle,
              dataSource: 'database',
              confirmationStatus: 'processed',
              details: `Proof Cube submitted! Hash: ${hash.substring(0, 16)}...`
            }, ...state.events]
          }));
          return true;
        }
        return false;
      }
    },

    reviewSubmission: async (submissionId, status, code, reason, reviewerWallet) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, rejectionCode: code, rejectionReason: reason, reviewerWallet }),
        });
        if (!res.ok) return false;
        await get().fetchSubmissions();
        await get().fetchMissions();
        await get().fetchEvents();
        await get().fetchWorldData();
        return true;
      } catch (e) {
        if (get().isDevMode) {
          set((state) => {
            const sub = state.submissions.find((s) => s.id === submissionId);
            if (!sub) return {};
            const missionId = sub.missionId;
            const updatedSub: Submission = {
              ...sub,
              status: status === 'approved' ? 'approved' : 'rejected',
              rejectionCode: code,
              rejectionReason: reason,
            };
            const updatedMissions = state.missions.map((m) =>
              m.id === missionId ? { ...m, status: (status === 'approved' ? 'completed' : 'active') as MissionStatus } : m
            );

            return {
              submissions: state.submissions.map((s) => s.id === submissionId ? updatedSub : s),
              missions: updatedMissions,
              events: [{
                id: `evt-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                type: status === 'approved' ? 'proof_approved' : 'proof_rejected',
                wallet: sub.builderWallet,
                missionId,
                missionTitle: sub.missionTitle,
                dataSource: 'database',
                confirmationStatus: 'processed',
                details: status === 'approved' ? 'Proof Cube verified and accepted!' : `Proof Cube rejected: ${reason}`
              }, ...state.events]
            };
          });
          return true;
        }
        return false;
      }
    },

    submitRevision: async (submissionId, content) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}/revise`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        return res.ok;
      } catch (e) {
        return false;
      }
    },

    disputeSubmission: async (submissionId, reason, wallet) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}/dispute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, openedBy: wallet }),
        });
        if (!res.ok) return false;
        await get().fetchSubmissions();
        await get().fetchMissions();
        await get().fetchEvents();
        return true;
      } catch (e) {
        if (get().isDevMode) {
          set((state) => {
            const sub = state.submissions.find((s) => s.id === submissionId);
            if (!sub) return {};
            return {
              submissions: state.submissions.map((s) => s.id === submissionId ? { ...s, status: 'disputed' } : s),
              missions: state.missions.map((m) => m.id === sub.missionId ? { ...m, status: 'disputed' } : m),
              events: [{
                id: `evt-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                type: 'dispute_opened',
                wallet,
                missionId: sub.missionId,
                missionTitle: sub.missionTitle,
                dataSource: 'database',
                confirmationStatus: 'processed',
                details: `Dispute opened for "${sub.missionTitle}": ${reason.substring(0, 20)}...`
              }, ...state.events]
            };
          });
          return true;
        }
        return false;
      }
    },

    claimReward: async (submissionId) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/rewards/${submissionId}/claim`, {
          method: 'POST',
        });
        if (!res.ok) return false;
        await get().fetchSubmissions();
        await get().fetchEvents();
        return true;
      } catch (e) {
        if (get().isDevMode) {
          set((state) => {
            const sub = state.submissions.find((s) => s.id === submissionId);
            if (!sub) return {};
            return {
              events: [{
                id: `evt-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                type: 'reward_claimed',
                wallet: sub.builderWallet,
                missionId: sub.missionId,
                missionTitle: sub.missionTitle,
                dataSource: 'solana',
                confirmationStatus: 'finalized',
                details: `Reward claimed! Golden voxels sent from Vault to builder's wallet.`
              }, ...state.events]
            };
          });
          return true;
        }
        return false;
      }
    }
  };
});
