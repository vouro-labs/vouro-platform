// Core models and provider interfaces for VOURO

export interface District {
  id: string;
  name: string;
  creator: string;
  trustScore: number;
  activeMissions: number;
  rewardLocked: number; // in USD or native tokens
  builders: number;
  verificationMethod: string;
  status: 'active' | 'inactive';
  description: string;
}

export type MissionStatus = 'active' | 'verifying' | 'expiring' | 'disputed' | 'completed';

export interface Mission {
  id: string;
  title: string;
  description: string;
  districtId: string;
  districtName: string;
  creator: string;
  rewardAmount: number;
  rewardToken: string;
  usdEstimate: number;
  slots: number;
  acceptedCount: number;
  deadline: string; // ISO String
  proofType: 'solana' | 'github' | 'url' | 'document' | 'custom';
  verificationRules: string;
  revisionLimit: number;
  disputePeriod: number; // hours, default 48
  requiredVouchScore: number;
  requiredBadges: string[];
  txSignature: string; // Funding tx
  status: MissionStatus;
  createdAt: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'disputed';

export interface Submission {
  id: string;
  missionId: string;
  missionTitle: string;
  builderWallet: string;
  status: SubmissionStatus;
  proofHash: string;
  proofType: string;
  content: {
    signature?: string;
    repository?: string;
    pullRequestNumber?: number;
    url?: string;
    text?: string;
    fileUrl?: string;
  };
  reasons: string[];
  rejectionCode?: string;
  rejectionReason?: string;
  reviewerWallet?: string;
  timestamp: string;
  revisionIndex: number;
}

export interface Dispute {
  id: string;
  submissionId: string;
  missionId: string;
  openedBy: string;
  reason: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolution?: 'approved' | 'rejected';
  resolvedBy?: string;
}

export interface BuilderMonthlyStats {
  month: string;           // e.g. 'Jan', 'Feb'
  vouchScore: number;
  missionsCompleted: number;
  approvalRate: number;
  rewardsEarned: number;
  disputesReceived: number;
}

export interface BuilderCategoryBreakdown {
  category: string;        // e.g. 'Solana Program', 'GitHub PR'
  completed: number;
  approved: number;
  rejected: number;
}

export type ReputationTier = 'Apex' | 'Vanguard' | 'Proven' | 'Rising' | 'Novice';

export interface Builder {
  wallet: string;
  vouchScore: number;
  rank: number;
  completedMissions: number;
  approvalRate: number;
  totalRewardEarned: number;
  activeStreak: number;
  specializations: string[];
  badges: string[];
  avatarUrl?: string;
  // Detailed reputation data
  tier: ReputationTier;
  joinedAt: string;                         // ISO date
  totalSubmissions: number;
  rejectedSubmissions: number;
  disputesOpened: number;
  disputesLost: number;
  avgResponseTimeHours: number;
  monthlyHistory: BuilderMonthlyStats[];
  categoryBreakdown: BuilderCategoryBreakdown[];
  recentMissions: { title: string; status: 'approved' | 'rejected' | 'pending'; reward: number; token: string; date: string }[];
  registered?: boolean;
  regTxSignature?: string;
}

// Service Provider Interfaces (Required by VOURO specs)
export interface TransactionResult {
  signature: string;
  slot: number;
  blockTime: number;
  success: boolean;
  signer: string;
  instructions: string[];
  programId: string;
  tokenMint?: string;
  tokenAmount?: number;
}

export interface WalletActivity {
  signature: string;
  timestamp: number;
  type: string;
  description: string;
  success: boolean;
}

export interface TokenBalance {
  address: string;
  mint: string;
  amount: number;
  uiAmount: number;
  decimals: number;
}

export interface TokenPrice {
  mint: string;
  priceUsd: number;
  fetchedAt: number;
}

export interface TokenPair {
  pairAddress: string;
  baseToken: { address: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  dexId: string;
  url: string;
}

export interface LiquidityResult {
  usd: number;
  base: number;
  quote: number;
}

export interface VolumeResult {
  h24: number;
  h6: number;
  h1: number;
  m5: number;
}

export interface ProofInput {
  type: 'solana' | 'github' | 'url' | 'document' | 'custom';
  solana?: {
    signature: string;
    expectedProgram: string;
    expectedToken: string;
    minimumAmount: number;
    requiredInstruction?: string;
    requiredWallet?: string;
  };
  github?: {
    repository: string;
    pullRequestNumber: number;
    expectedWallet: string;
    campaignId: string;
  };
  url?: {
    link: string;
  };
}

export interface ProofValidationResult {
  valid: boolean;
  source: string;
  author?: string;
  checkedAt: string;
  reasons: string[];
  // GitHub specific
  merged?: boolean;
  commitCount?: number;
  changedFiles?: number;
}

export interface BlockchainProvider {
  getTransaction(signature: string): Promise<TransactionResult>;
  getWalletActivity(address: string): Promise<WalletActivity[]>;
  subscribeToAddress(address: string, callback: (event: any) => void): { unsubscribe: () => void };
  subscribeToProgram(programId: string, callback: (event: any) => void): { unsubscribe: () => void };
  getTokenBalance(address: string, mint: string): Promise<TokenBalance>;
}

export interface PriceProvider {
  getTokenPrice(mint: string): Promise<TokenPrice>;
  getMultipleTokenPrices(mints: string[]): Promise<TokenPrice[]>;
}

export interface MarketProvider {
  getTokenPairs(mint: string): Promise<TokenPair[]>;
  getLiquidity(mint: string): Promise<LiquidityResult>;
  getVolume(mint: string): Promise<VolumeResult>;
}

export interface ProofProvider {
  validate(input: ProofInput): Promise<ProofValidationResult>;
}

// Live Health Status types
export interface ProviderHealth {
  status: 'operational' | 'degraded' | 'offline';
  latencyMs?: number;
  slot?: number;
  lastUpdated?: string;
}

export interface HealthResponse {
  status: 'operational' | 'degraded' | 'offline';
  providers: {
    solana: ProviderHealth;
    helius: ProviderHealth;
    jupiter: ProviderHealth;
    dexscreener: ProviderHealth;
    database: ProviderHealth;
  };
}

// Live Webhook and WS updates
export type WorldEventType =
  | 'mission_created'
  | 'mission_funded'
  | 'mission_accepted'
  | 'submission_created'
  | 'submission_updated'
  | 'proof_approved'
  | 'proof_rejected'
  | 'dispute_opened'
  | 'reward_claimable'
  | 'reward_claimed';

export interface WorldEvent {
  id: string;
  timestamp: string;
  type: WorldEventType;
  wallet: string;
  missionId: string;
  missionTitle: string;
  signature?: string;
  dataSource: 'solana' | 'github' | 'database';
  confirmationStatus: 'processed' | 'confirmed' | 'finalized';
  details: string;
}
