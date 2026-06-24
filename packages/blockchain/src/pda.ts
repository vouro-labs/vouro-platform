import { PublicKey } from '@solana/web3.js';

export function getPlatformConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  );
}

export function getDistrictPda(districtId: string, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('district'), Buffer.from(districtId)],
    programId
  );
}

export function getCampaignPda(campaignId: string, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('campaign'), Buffer.from(campaignId)],
    programId
  );
}

export function getCampaignVaultPda(campaignPda: PublicKey, mint: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), campaignPda.toBuffer(), mint.toBuffer()],
    programId
  );
}

export function getSubmissionPda(submissionId: string, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('submission'), Buffer.from(submissionId)],
    programId
  );
}

export function getReputationPda(wallet: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('reputation'), wallet.toBuffer()],
    programId
  );
}

export function getDisputePda(disputeId: string, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('dispute'), Buffer.from(disputeId)],
    programId
  );
}
