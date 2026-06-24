import { z } from 'zod';

// Helper for Solana address validation
const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const solanaAddressSchema = z.string().regex(solanaAddressRegex, {
  message: 'Invalid Solana wallet address format',
});

// Prohibited terms for Rule 12: Anti-violence, illegal acts, fake engagement, phishing, doxxing
const prohibitedKeywords = [
  'violence', 'illegal', 'harass', 'doxx', 'phish', 'spam', 'fake reviews', 
  'fake engagement', 'exploit', 'theft', 'manipulate', 'kekerasan', 'ilegal', 
  'pelecehan', 'pencurian', 'penipuan', 'manipulasi pasar', 'fake review', 'fake follower'
];

export const createMissionSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long').max(100)
    .refine(
      (val) => !prohibitedKeywords.some(keyword => val.toLowerCase().includes(keyword)),
      { message: 'Title contains terms violating Rule 12 (Prohibited Missions)' }
    ),
  description: z.string().min(10, 'Description must be at least 10 characters long').max(2000)
    .refine(
      (val) => !prohibitedKeywords.some(keyword => val.toLowerCase().includes(keyword)),
      { message: 'Description contains terms violating Rule 12 (Prohibited Missions)' }
    ),
  districtId: z.string().uuid('Invalid district ID format')
    .or(z.string().min(1, 'District ID is required')),
  rewardAmount: z.number().positive('Reward amount must be greater than zero'),
  rewardToken: z.string().min(1, 'Reward token is required'),
  slots: z.number().int().positive('Participant slots must be at least 1'),
  deadline: z.string().datetime({ message: 'Deadline must be a valid ISO datetime' }),
  proofType: z.enum(['solana', 'github', 'url', 'document', 'custom']),
  verificationRules: z.string().min(10, 'Verification rules must detail validation criteria'),
  revisionLimit: z.number().int().min(0).max(2, 'Revision limit must be between 0 and 2 (Rule 04)'),
  disputePeriod: z.number().int().min(24).max(168).default(48), // default 48h (Rule 07)
  requiredVouchScore: z.number().int().min(0).max(100).default(0),
  requiredBadges: z.array(z.string()).default([]),
  txSignature: z.string().min(32, 'Solana transaction signature is required for funding validation (Rule 01)'),
  creator: solanaAddressSchema,
});

export const submitProofSchema = z.object({
  missionId: z.string().min(1, 'Mission ID is required'),
  builderWallet: solanaAddressSchema,
  proofType: z.enum(['solana', 'github', 'url', 'document', 'custom']),
  content: z.object({
    signature: z.string().min(32, 'Valid Solana signature is required').optional(),
    repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'Format must be owner/repository').optional(),
    pullRequestNumber: z.number().int().positive().optional(),
    url: z.string().url('Must be a valid URL').optional(),
    text: z.string().min(10, 'Written report must be at least 10 characters').optional(),
    fileUrl: z.string().url('Must be a valid file storage URL').optional(),
  }).refine((data) => {
    return data.signature || (data.repository && data.pullRequestNumber) || data.url || data.text || data.fileUrl;
  }, {
    message: 'Proof content must match the selected proof type requirements',
  }),
});

export const reviewProofSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionCode: z.string().min(1, 'Rejection code is required when rejecting (Rule 03)').optional(),
  rejectionReason: z.string().min(5, 'Rejection reason must be specified (Rule 03)').optional(),
  reviewerWallet: solanaAddressSchema,
}).refine((data) => {
  if (data.status === 'rejected') {
    return !!data.rejectionCode && !!data.rejectionReason;
  }
  return true;
}, {
  message: 'Rejection code and detailed explanation are mandatory for rejected status',
  path: ['rejectionReason'],
});

export const disputeSchema = z.object({
  reason: z.string().min(10, 'Dispute reason must be at least 10 characters long'),
  openedBy: solanaAddressSchema,
});

export const githubValidateSchema = z.object({
  repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'Format must be owner/repository'),
  pullRequestNumber: z.number().int().positive(),
  expectedWallet: solanaAddressSchema,
  campaignId: z.string().min(1),
});

export const solanaValidateSchema = z.object({
  signature: z.string().min(32, 'Signature required'),
  expectedProgram: solanaAddressSchema,
  expectedToken: z.string().optional(),
  minimumAmount: z.number().min(0).optional(),
  requiredInstruction: z.string().optional(),
  requiredWallet: solanaAddressSchema.optional(),
});
