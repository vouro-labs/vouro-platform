use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("VouRo11111111111111111111111111111111111111");

#[program]
pub mod vouro_platform {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>, admin: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.platform_config;
        config.admin = admin;
        config.is_paused = false;
        config.total_districts = 0;
        config.total_campaigns = 0;
        emit!(PlatformInitialized { admin });
        Ok(())
    }

    pub fn create_district(ctx: Context<CreateDistrict>, district_id: String, name: String) -> Result<()> {
        let district = &mut ctx.accounts.district;
        district.creator = ctx.accounts.creator.key();
        district.district_id = district_id.clone();
        district.name = name;
        district.trust_score = 100;
        district.total_campaigns = 0;
        
        let config = &mut ctx.accounts.platform_config;
        config.total_districts = config.total_districts.checked_add(1).ok_or(error!(VouroError::ArithmeticOverflow))?;

        emit!(DistrictCreated {
            district_id,
            creator: district.creator,
        });
        Ok(())
    }

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: String,
        reward_amount: u64,
        slots: u32,
        deadline: i64,
        revision_limit: u8,
        dispute_period: u16,
    ) -> Result<()> {
        let clock = Clock::get()?;
        require!(deadline > clock.unix_timestamp, VouroError::InvalidDeadline);
        require!(revision_limit <= 2, VouroError::InvalidRevisionLimit);

        let campaign = &mut ctx.accounts.campaign;
        campaign.creator = ctx.accounts.creator.key();
        campaign.campaign_id = campaign_id.clone();
        campaign.reward_amount = reward_amount;
        campaign.slots = slots;
        campaign.deadline = deadline;
        campaign.revision_limit = revision_limit;
        campaign.dispute_period = dispute_period;
        campaign.is_funded = false;
        campaign.status = CampaignStatus::Created;
        campaign.mint = ctx.accounts.mint.key();
        campaign.accepted_count = 0;
        campaign.approved_count = 0;

        let config = &mut ctx.accounts.platform_config;
        config.total_campaigns = config.total_campaigns.checked_add(1).ok_or(error!(VouroError::ArithmeticOverflow))?;

        emit!(CampaignCreated {
            campaign_id,
            creator: campaign.creator,
            reward_amount,
        });
        Ok(())
    }

    pub fn fund_campaign(ctx: Context<FundCampaign>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(!campaign.is_funded, VouroError::AlreadyFunded);

        // Perform token transfer from creator to Vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.creator_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        );
        
        let total_funding = campaign.reward_amount
            .checked_mul(campaign.slots as u64)
            .ok_or(error!(VouroError::ArithmeticOverflow))?;

        token::transfer(transfer_ctx, total_funding)?;

        campaign.is_funded = true;
        campaign.status = CampaignStatus::Active;

        emit!(CampaignFunded {
            campaign_id: campaign.campaign_id.clone(),
            amount: total_funding,
        });
        Ok(())
    }

    pub fn accept_mission(ctx: Context<AcceptMission>, builder: Pubkey) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(campaign.status == CampaignStatus::Active, VouroError::CampaignNotActive);
        
        let clock = Clock::get()?;
        require!(campaign.deadline > clock.unix_timestamp, VouroError::CampaignExpired);
        require!(campaign.accepted_count < campaign.slots, VouroError::CampaignFull);

        campaign.accepted_count = campaign.accepted_count.checked_add(1).ok_or(error!(VouroError::ArithmeticOverflow))?;

        emit!(MissionAccepted {
            campaign_id: campaign.campaign_id.clone(),
            builder,
        });
        Ok(())
    }

    pub fn submit_proof_hash(ctx: Context<SubmitProofHash>, submission_id: String, proof_hash: [u8; 32]) -> Result<()> {
        let submission = &mut ctx.accounts.submission;
        submission.builder = ctx.accounts.builder.key();
        submission.campaign = ctx.accounts.campaign.key();
        submission.submission_id = submission_id.clone();
        submission.proof_hash = proof_hash;
        submission.revision_count = 0;
        submission.status = SubmissionState::Pending;
        submission.is_disputed = false;

        emit!(ProofSubmitted {
            submission_id,
            campaign_id: ctx.accounts.campaign.campaign_id.clone(),
            builder: submission.builder,
            proof_hash,
        });
        Ok(())
    }

    pub fn approve_submission(ctx: Context<ApproveSubmission>) -> Result<()> {
        let submission = &mut ctx.accounts.submission;
        let campaign = &mut ctx.accounts.campaign;

        require!(submission.status == SubmissionState::Pending, VouroError::InvalidSubmissionState);
        
        submission.status = SubmissionState::Approved;
        campaign.approved_count = campaign.approved_count.checked_add(1).ok_or(error!(VouroError::ArithmeticOverflow))?;

        emit!(SubmissionApproved {
            submission_id: submission.submission_id.clone(),
            campaign_id: campaign.campaign_id.clone(),
        });
        Ok(())
    }

    pub fn reject_submission(ctx: Context<RejectSubmission>, rejection_code: String) -> Result<()> {
        let submission = &mut ctx.accounts.submission;
        let campaign = &ctx.accounts.campaign;

        require!(submission.status == SubmissionState::Pending, VouroError::InvalidSubmissionState);
        require!(submission.revision_count < campaign.revision_limit, VouroError::RevisionLimitReached);

        submission.status = SubmissionState::Rejected;

        emit!(SubmissionRejected {
            submission_id: submission.submission_id.clone(),
            rejection_code,
        });
        Ok(())
    }

    pub fn mark_disputed(ctx: Context<MarkDisputed>) -> Result<()> {
        let submission = &mut ctx.accounts.submission;
        let dispute = &mut ctx.accounts.dispute;

        require!(
            submission.status == SubmissionState::Approved || submission.status == SubmissionState::Rejected,
            VouroError::InvalidSubmissionState
        );
        require!(!submission.is_disputed, VouroError::AlreadyDisputed);

        submission.is_disputed = true;
        dispute.submission = submission.key();
        dispute.resolved = false;

        emit!(SubmissionDisputed {
            submission_id: submission.submission_id.clone(),
        });
        Ok(())
    }

    pub fn resolve_dispute(ctx: Context<ResolveDispute>, approve: bool) -> Result<()> {
        let dispute = &mut ctx.accounts.dispute;
        let submission = &mut ctx.accounts.submission;
        let campaign = &mut ctx.accounts.campaign;

        require!(!dispute.resolved, VouroError::DisputeAlreadyResolved);

        dispute.resolved = true;
        submission.is_disputed = false;

        if approve {
            if submission.status != SubmissionState::Approved {
                submission.status = SubmissionState::Approved;
                campaign.approved_count = campaign.approved_count.checked_add(1).ok_or(error!(VouroError::ArithmeticOverflow))?;
            }
        } else {
            if submission.status == SubmissionState::Approved {
                submission.status = SubmissionState::Rejected;
                campaign.approved_count = campaign.approved_count.checked_sub(1).ok_or(error!(VouroError::ArithmeticOverflow))?;
            }
        }

        emit!(DisputeResolved {
            submission_id: submission.submission_id.clone(),
            approved: approve,
        });
        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let submission = &mut ctx.accounts.submission;
        let campaign = &ctx.accounts.campaign;
        
        require!(submission.status == SubmissionState::Approved, VouroError::SubmissionNotApproved);
        require!(!submission.is_disputed, VouroError::CannotClaimDisputed);
        require!(!submission.claimed, VouroError::DoubleClaimPrevented);

        let campaign_pda_seeds = &[
            b"campaign",
            campaign.campaign_id.as_bytes(),
            &[ctx.bumps.campaign],
        ];
        let signer_seeds = &[&campaign_pda_seeds[..]];

        // Transfer reward from Vault to builder's token account
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.builder_token_account.to_account_info(),
                authority: ctx.accounts.campaign.to_account_info(),
            },
            signer_seeds,
        );

        token::transfer(transfer_ctx, campaign.reward_amount)?;
        submission.claimed = true;

        emit!(RewardClaimed {
            submission_id: submission.submission_id.clone(),
            builder: submission.builder,
            amount: campaign.reward_amount,
        });
        Ok(())
    }

    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let clock = Clock::get()?;

        require!(
            campaign.deadline < clock.unix_timestamp || campaign.approved_count == campaign.slots,
            VouroError::CampaignOngoing
        );

        campaign.status = CampaignStatus::Closed;

        emit!(CampaignClosed {
            campaign_id: campaign.campaign_id.clone(),
        });
        Ok(())
    }

    pub fn refund_unallocated_reward(ctx: Context<RefundUnallocatedReward>) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        require!(campaign.status == CampaignStatus::Closed, VouroError::CampaignNotClosed);

        let total_slots = campaign.slots as u64;
        let approved_slots = campaign.approved_count as u64;
        let unallocated_slots = total_slots.checked_sub(approved_slots).ok_or(error!(VouroError::ArithmeticOverflow))?;
        
        let refund_amount = campaign.reward_amount
            .checked_mul(unallocated_slots)
            .ok_or(error!(VouroError::ArithmeticOverflow))?;

        require!(refund_amount > 0, VouroError::NoRefundAvailable);

        let campaign_pda_seeds = &[
            b"campaign",
            campaign.campaign_id.as_bytes(),
            &[ctx.bumps.campaign],
        ];
        let signer_seeds = &[&campaign_pda_seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.creator_token_account.to_account_info(),
                authority: ctx.accounts.campaign.to_account_info(),
            },
            signer_seeds,
        );

        token::transfer(transfer_ctx, refund_amount)?;

        emit!(RefundIssued {
            campaign_id: campaign.campaign_id.clone(),
            creator: campaign.creator,
            amount: refund_amount,
        });
        Ok(())
    }
}

// Data Structures & Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CampaignStatus {
    Created,
    Active,
    Closed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SubmissionState {
    Pending,
    Approved,
    Rejected,
}

#[account]
pub struct PlatformConfig {
    pub admin: Pubkey,
    pub is_paused: bool,
    pub total_districts: u64,
    pub total_campaigns: u64,
}

#[account]
pub struct District {
    pub creator: Pubkey,
    pub district_id: String,
    pub name: String,
    pub trust_score: u8,
    pub total_campaigns: u64,
}

#[account]
pub struct Campaign {
    pub creator: Pubkey,
    pub campaign_id: String,
    pub reward_amount: u64,
    pub slots: u32,
    pub deadline: i64,
    pub revision_limit: u8,
    pub dispute_period: u16,
    pub is_funded: bool,
    pub status: CampaignStatus,
    pub mint: Pubkey,
    pub accepted_count: u32,
    pub approved_count: u32,
}

#[account]
pub struct Submission {
    pub builder: Pubkey,
    pub campaign: Pubkey,
    pub submission_id: String,
    pub proof_hash: [u8; 32],
    pub revision_count: u8,
    pub status: SubmissionState,
    pub is_disputed: bool,
    pub claimed: bool,
}

#[account]
pub struct Dispute {
    pub submission: Pubkey,
    pub resolved: bool,
}

// Instruction Contexts
#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 1 + 8 + 8,
        seeds = [b"config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(district_id: String)]
pub struct CreateDistrict<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 4 + district_id.len() + 4 + 64 + 1 + 8,
        seeds = [b"district", district_id.as_bytes()],
        bump
    )]
    pub district: Account<'info, District>,
    #[account(mut)]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(campaign_id: String)]
pub struct CreateCampaign<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 4 + campaign_id.len() + 8 + 4 + 8 + 1 + 2 + 1 + 1 + 32 + 4 + 4,
        seeds = [b"campaign", campaign_id.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub platform_config: Account<'info, PlatformConfig>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundCampaign<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(
        init,
        payer = creator,
        token::mint = mint,
        token::authority = campaign,
        seeds = [b"vault", campaign.key().as_bytes(), mint.key().as_bytes()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptMission<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub builder: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(submission_id: String)]
pub struct SubmitProofHash<'info> {
    #[account(
        init,
        payer = builder,
        space = 8 + 32 + 32 + 4 + submission_id.len() + 32 + 1 + 1 + 1 + 1,
        seeds = [b"submission", submission_id.as_bytes()],
        bump
    )]
    pub submission: Account<'info, Submission>,
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub builder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveSubmission<'info> {
    #[account(mut)]
    pub submission: Account<'info, Submission>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub reviewer: Signer<'info>,
}

#[derive(Accounts)]
pub struct RejectSubmission<'info> {
    #[account(mut)]
    pub submission: Account<'info, Submission>,
    pub campaign: Account<'info, Campaign>,
    pub reviewer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(dispute_id: String)]
pub struct MarkDisputed<'info> {
    #[account(mut)]
    pub submission: Account<'info, Submission>,
    #[account(
        init,
        payer = challenger,
        space = 8 + 32 + 1,
        seeds = [b"dispute", dispute_id.as_bytes()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,
    #[account(mut)]
    pub challenger: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(mut)]
    pub dispute: Account<'info, Dispute>,
    #[account(mut)]
    pub submission: Account<'info, Submission>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub submission: Account<'info, Submission>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub builder_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub builder: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct RefundUnallocatedReward<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// Custom errors
#[error_code]
pub enum VouroError {
    #[msg("Arithmetic overflow detected.")]
    ArithmeticOverflow,
    #[msg("Invalid deadline. Must be in the future.")]
    InvalidDeadline,
    #[msg("Revision limit exceeds the maximum limit of 2.")]
    InvalidRevisionLimit,
    #[msg("Campaign is already funded.")]
    AlreadyFunded,
    #[msg("Campaign is not in active state.")]
    CampaignNotActive,
    #[msg("Campaign deadline has expired.")]
    CampaignExpired,
    #[msg("Campaign participant slots are full.")]
    CampaignFull,
    #[msg("Invalid submission state for this operation.")]
    InvalidSubmissionState,
    #[msg("Maximum revision count exceeded.")]
    RevisionLimitReached,
    #[msg("This submission is already disputed.")]
    AlreadyDisputed,
    #[msg("Dispute is already resolved.")]
    DisputeAlreadyResolved,
    #[msg("Submission is not approved.")]
    SubmissionNotApproved,
    #[msg("Cannot claim reward for disputed submissions.")]
    CannotClaimDisputed,
    #[msg("Double claim detected. Claim state check failed.")]
    DoubleClaimPrevented,
    #[msg("Campaign cannot be closed yet.")]
    CampaignOngoing,
    #[msg("Campaign must be closed before issuing refunds.")]
    CampaignNotClosed,
    #[msg("No refund available since all slots were approved.")]
    NoRefundAvailable,
}

// Events
#[event]
pub struct PlatformInitialized {
    pub admin: Pubkey,
}
#[event]
pub struct DistrictCreated {
    pub district_id: String,
    pub creator: Pubkey,
}
#[event]
pub struct CampaignCreated {
    pub campaign_id: String,
    pub creator: Pubkey,
    pub reward_amount: u64,
}
#[event]
pub struct CampaignFunded {
    pub campaign_id: String,
    pub amount: u64,
}
#[event]
pub struct MissionAccepted {
    pub campaign_id: String,
    pub builder: Pubkey,
}
#[event]
pub struct ProofSubmitted {
    pub submission_id: String,
    pub campaign_id: String,
    pub builder: Pubkey,
    pub proof_hash: [u8; 32],
}
#[event]
pub struct SubmissionApproved {
    pub submission_id: String,
    pub campaign_id: String,
}
#[event]
pub struct SubmissionRejected {
    pub submission_id: String,
    pub rejection_code: String,
}
#[event]
pub struct SubmissionDisputed {
    pub submission_id: String,
}
#[event]
pub struct DisputeResolved {
    pub submission_id: String,
    pub approved: bool,
}
#[event]
pub struct RewardClaimed {
    pub submission_id: String,
    pub builder: Pubkey,
    pub amount: u64,
}
#[event]
pub struct CampaignClosed {
    pub campaign_id: String,
}
#[event]
pub struct RefundIssued {
    pub campaign_id: String,
    pub creator: Pubkey,
    pub amount: u64,
}
