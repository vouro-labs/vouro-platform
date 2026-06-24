// Color codes and configurations for the VOURO design system

export const COLORS = {
  background: '#000000',
  deepSurface: '#0D0D0D',
  voxelGround: '#262626',
  primaryLime: '#FFFFFF',
  electricCyan: '#E5E5E5',
  vaultGold: '#D4D4D4',
  proofBlue: '#A3A3A3',
  warningOrange: '#737373',
  rejectedRed: '#525252',
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',
};

export const CAMPAIGN_RULES = {
  RULE_01_REWARD_FIRST: 'Creators must deposit all rewards into the Vault PDA before the campaign can be published.',
  RULE_02_CLEAR_PROOF_SCHEMA: 'Every campaign must define accepted proof types, required fields, verification methods, acceptance criteria, rejection criteria, deadlines, revision limits, and dispute duration.',
  RULE_03_NO_SILENT_REJECTION: 'Reviewers cannot reject a proof without selecting a valid rejection code and providing a detailed explanation.',
  RULE_04_LIMITED_REVISION: 'Creators select a maximum revision limit (0, 1, or 2). This limit cannot be decreased once a submission is active.',
  RULE_05_REVIEW_DEADLINE: 'Creators must specify a review SLA (24h, 48h, or 72h). If expired, the submission enters the escalation queue.',
  RULE_06_IMMUTABLE_SUBMISSION: 'Once a proof is submitted, its content and SHA-256 hash reference are permanently locked. Revisions are created as new versions.',
  RULE_07_DISPUTE_WINDOW: 'A dispute lock window (default 48 hours) is provided following any proof rejection or approval.',
  RULE_08_CREATOR_CANNOT_DRAIN_VAULT: 'Rewards allocated for approved submissions are locked and cannot be withdrawn by the campaign creator.',
  RULE_09_ONE_CLAIM_PER_APPROVED_SUBMISSION: 'Double claims are strictly prevented on-chain using unique validation constraints and PDA state checks.',
  RULE_10_AI_IS_NOT_FINAL_AUTHORITY: 'AI models only generate risk and duplication signals; all final decisions are resolved manually or programmatically.',
  RULE_11_EXPLICIT_DATA_SOURCE: 'All metric readings and transaction states must store their data source, fetch timestamp, blocktime, slot, and provider.',
  RULE_12_PROHIBITED_MISSIONS: 'Campaigns asking for illegal actions, violence, mass spam, phishing, doxxing, or fake engagement are strictly prohibited.',
};

export const REJECTION_CODES = {
  INCOMPLETE: 'PR_INCOMPLETE',
  WRONG_SIGNER: 'WRONG_SIGNER',
  INSUFFICIENT_AMOUNT: 'INSUFFICIENT_AMOUNT',
  WRONG_PROGRAM: 'WRONG_PROGRAM',
  DUPLICATE_PROOF: 'DUPLICATE_PROOF',
  QUALITY_UNSATISFACTORY: 'QUALITY_UNSATISFACTORY',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
  MISSING_REQUIREMENTS: 'MISSING_REQUIREMENTS',
};
