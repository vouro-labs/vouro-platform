import { PublicKey } from '@solana/web3.js';
export * from './pda';

export const VOURO_PROGRAM_ID = new PublicKey('VouRo11111111111111111111111111111111111111');
export const VOURO_MINT_ADDRESS = new PublicKey('VouRoMint1111111111111111111111111111111111');

export const INSTRUCTIONS = {
  initializePlatform: 'initialize_platform',
  createDistrict: 'create_district',
  createCampaign: 'create_campaign',
  fundCampaign: 'fund_campaign',
  acceptMission: 'accept_mission',
  submitProofHash: 'submit_proof_hash',
  approveSubmission: 'approve_submission',
  rejectSubmission: 'reject_submission',
  markDisputed: 'mark_disputed',
  resolveDispute: 'resolve_dispute',
  claimReward: 'claim_reward',
  closeCampaign: 'close_campaign',
  refundUnallocatedReward: 'refund_unallocated_reward',
};
