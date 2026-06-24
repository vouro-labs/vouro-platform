import { describe, it, expect } from 'vitest';
import { 
  solanaAddressSchema, 
  createMissionSchema, 
  reviewProofSchema, 
  submitProofSchema 
} from './schemas';

describe('Validation Schemas & Campaign Rules', () => {
  describe('Solana Address Validation', () => {
    it('should validate valid Solana base58 addresses', () => {
      const validAddress = 'VouRo11111111111111111111111111111111111111';
      expect(solanaAddressSchema.safeParse(validAddress).success).toBe(true);
    });

    it('should reject invalid Solana address formats', () => {
      const invalidShort = 'shortAddress';
      const invalidChars = 'VouRo11111111111111111111111111111111111110'; // '0' is invalid in Base58
      expect(solanaAddressSchema.safeParse(invalidShort).success).toBe(false);
      expect(solanaAddressSchema.safeParse(invalidChars).success).toBe(false);
    });
  });

  describe('Rule 12: Content Moderation (createMissionSchema)', () => {
    const baseMission = {
      title: 'Build Voxel Marketplace Dashboard',
      description: 'Implement a gorgeous dark-theme interface for user assets trading.',
      districtId: 'district-1',
      rewardAmount: 5.5,
      rewardToken: 'SOL',
      slots: 3,
      deadline: '2026-12-31T23:59:59Z',
      proofType: 'github',
      verificationRules: 'Must merge a clean PR with fully working unit tests.',
      revisionLimit: 1,
      disputePeriod: 48,
      requiredVouchScore: 20,
      requiredBadges: [],
      txSignature: '3N2u9x8vPq1WvJm...longer...signature...value',
      creator: 'VouRo11111111111111111111111111111111111111',
    };

    it('should approve valid mission inputs', () => {
      expect(createMissionSchema.safeParse(baseMission).success).toBe(true);
    });

    it('should enforce Rule 12 and block prohibited keywords', () => {
      const illegalMission = {
        ...baseMission,
        title: 'Launch an illegal phish campaign',
      };
      const result = createMissionSchema.safeParse(illegalMission);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('violating Rule 12');
      }
    });

    it('should enforce Rule 04: Revision Limit between 0 and 2', () => {
      const invalidRevisionMission = {
        ...baseMission,
        revisionLimit: 3, // exceeds maximum of 2
      };
      expect(createMissionSchema.safeParse(invalidRevisionMission).success).toBe(false);
    });
  });

  describe('Rule 03: No Silent Rejection (reviewProofSchema)', () => {
    const validApproval = {
      status: 'approved',
      reviewerWallet: 'VouRo11111111111111111111111111111111111111',
    };

    const validRejection = {
      status: 'rejected',
      rejectionCode: 'PR_INCOMPLETE',
      rejectionReason: 'The code is missing index.css variables',
      reviewerWallet: 'VouRo11111111111111111111111111111111111111',
    };

    const silentRejection = {
      status: 'rejected',
      reviewerWallet: 'VouRo11111111111111111111111111111111111111',
    };

    it('should accept straightforward approvals', () => {
      expect(reviewProofSchema.safeParse(validApproval).success).toBe(true);
    });

    it('should accept detailed rejections', () => {
      expect(reviewProofSchema.safeParse(validRejection).success).toBe(true);
    });

    it('should block silent rejections without code or reason', () => {
      const result = reviewProofSchema.safeParse(silentRejection);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('explanation are mandatory');
      }
    });
  });
});
