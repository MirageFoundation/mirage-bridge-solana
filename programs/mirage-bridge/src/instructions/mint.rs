use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions as ix_sysvar;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, MintTo, Token, TokenAccount};

use crate::constants::{BASIS_POINTS_DENOMINATOR, MAX_ATTESTORS};
use crate::errors::BridgeError;
use crate::events::{MintAttested, MintCompleted};
use crate::state::{BridgeConfig, BridgeState, MintRecord, ValidatorRegistry};
use crate::utils::{build_attestation_payload, verify_ed25519_signature, is_bit_set, set_bit, shift_bitmap};

pub fn mint(ctx: Context<MintTokens>, params: MintParams) -> Result<()> {
    let bridge_config = &ctx.accounts.bridge_config;

    require!(!bridge_config.paused, BridgeError::BridgePaused);
    require!(params.amount > 0, BridgeError::InvalidAmount);

    // Replay protection check
    let bridge_state = &mut ctx.accounts.bridge_state;
    let sequence = params.sequence;

    if sequence <= bridge_state.last_sequence {
        let diff = (bridge_state.last_sequence - sequence) as usize;
        if diff >= 1024 {
            return err!(BridgeError::TransactionTooOld);
        }
        if is_bit_set(&bridge_state.replay_bitmap, diff) {
            return err!(BridgeError::AlreadyMinted);
        }
    }
    // Note: If sequence > last_sequence, it's valid (new tip)

    let validator_registry = &ctx.accounts.validator_registry;
    require!(
        validator_registry.total_stake > 0,
        BridgeError::InvalidValidatorSet
    );

    let stake = validator_registry
        .get_validator_stake(&ctx.accounts.orchestrator.key())
        .ok_or(BridgeError::UnauthorizedOrchestrator)?;

    let expected_message = build_attestation_payload(
        &params.burn_tx_hash,
        &params.mirage_sender,
        params.amount,
        &ctx.accounts.recipient.key(),
        "solana", // destination chain bound to prevent cross-chain replay
    );

    verify_ed25519_signature(
        &ctx.accounts.instructions_sysvar,
        &ctx.accounts.orchestrator.key(),
        &expected_message,
    )?;

    let mint_record = &mut ctx.accounts.mint_record;

    if mint_record.attestations.is_empty() {
        mint_record.payer = ctx.accounts.orchestrator.key();
        mint_record.burn_tx_hash = params.burn_tx_hash;
        mint_record.recipient = ctx.accounts.recipient.key();
        mint_record.amount = params.amount;
        mint_record.attestations = Vec::new();
        mint_record.attested_power = 0;
        mint_record.bump = ctx.bumps.mint_record;
    } else {
        require!(
            mint_record.burn_tx_hash == params.burn_tx_hash,
            BridgeError::BurnHashMismatch
        );
        require!(
            mint_record.recipient == ctx.accounts.recipient.key(),
            BridgeError::RecipientMismatch
        );
        require!(
            mint_record.amount == params.amount,
            BridgeError::AmountMismatch
        );
    }

    if mint_record.has_attested(&ctx.accounts.orchestrator.key()) {
        return Ok(());
    }

    require!(
        mint_record.attestations.len() < MAX_ATTESTORS,
        BridgeError::TooManyAttestors
    );

    mint_record
        .attestations
        .push(ctx.accounts.orchestrator.key());
    mint_record.attested_power = mint_record
        .attested_power
        .checked_add(stake)
        .ok_or(BridgeError::PowerOverflow)?;

    let required_stake = validator_registry
        .total_stake
        .checked_mul(bridge_config.attestation_threshold)
        .ok_or(BridgeError::PowerOverflow)?
        .checked_div(BASIS_POINTS_DENOMINATOR)
        .ok_or(BridgeError::PowerOverflow)?;

    emit!(MintAttested {
        burn_tx_hash: params.burn_tx_hash,
        orchestrator: ctx.accounts.orchestrator.key(),
        current_power: mint_record.attested_power,
        threshold: required_stake,
    });

    if mint_record.attested_power >= required_stake {
        let signer_seeds: &[&[&[u8]]] = &[&[b"bridge_config", &[bridge_config.bump]]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.token_mint.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: ctx.accounts.bridge_config.to_account_info(),
                },
                signer_seeds,
            ),
            params.amount,
        )?;

        let clock = Clock::get()?;
        let timestamp = clock.unix_timestamp;

        // Update BridgeState (bitmap)
        if sequence > bridge_state.last_sequence {
            let diff = (sequence - bridge_state.last_sequence) as usize;
            shift_bitmap(&mut bridge_state.replay_bitmap, diff);
            bridge_state.last_sequence = sequence;
            set_bit(&mut bridge_state.replay_bitmap, 0);
        } else {
            let diff = (bridge_state.last_sequence - sequence) as usize;
            set_bit(&mut bridge_state.replay_bitmap, diff);
        }

        let bridge_config = &mut ctx.accounts.bridge_config;
        bridge_config.total_minted = bridge_config
            .total_minted
            .checked_add(params.amount)
            .ok_or(BridgeError::AmountOverflow)?;

        emit!(MintCompleted {
            burn_tx_hash: params.burn_tx_hash,
            recipient: ctx.accounts.recipient.key(),
            amount: params.amount,
            timestamp,
        });

        // Close MintRecord and refund rent to original payer
        require!(
            mint_record.payer == ctx.accounts.mint_record_payer.key(),
            BridgeError::Unauthorized
        );

        let dest_account_info = ctx.accounts.mint_record_payer.to_account_info();
        let record_account_info = mint_record.to_account_info();

        // Transfer lamports
        let dest_lamports = dest_account_info.lamports();
        **dest_account_info.try_borrow_mut_lamports()? = dest_lamports
            .checked_add(record_account_info.lamports())
            .unwrap();
        **record_account_info.try_borrow_mut_lamports()? = 0;
        
        // No need to set data to empty, runtime handles it when lamports are 0
    }

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct MintParams {
    pub burn_tx_hash: [u8; 32],
    pub mirage_sender: String,
    pub amount: u64,
    pub sequence: u64,
}

#[derive(Accounts)]
#[instruction(params: MintParams)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub orchestrator: Signer<'info>,

    /// CHECK: Recipient wallet, no constraints needed
    pub recipient: AccountInfo<'info>,

    /// CHECK: Payer that funded MintRecord (rent refund target)
    #[account(mut)]
    pub mint_record_payer: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = orchestrator,
        associated_token::mint = token_mint,
        associated_token::authority = recipient
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"mint"],
        bump
    )]
    pub token_mint: Account<'info, anchor_spl::token::Mint>,

    #[account(
        mut,
        seeds = [b"bridge_config"],
        bump = bridge_config.bump
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        mut,
        seeds = [b"bridge_state"],
        bump = bridge_state.bump
    )]
    pub bridge_state: Account<'info, BridgeState>,

   #[account(
       init_if_needed,
       payer = orchestrator,
        space = 8 + MintRecord::INIT_SPACE,
       seeds = [b"mint_record", &params.burn_tx_hash[..]],
        bump
    )]
    pub mint_record: Account<'info, MintRecord>,

    #[account(
        seeds = [b"validator_registry"],
        bump = validator_registry.bump
    )]
    pub validator_registry: Account<'info, ValidatorRegistry>,

    /// CHECK: Instructions sysvar for Ed25519 verification
    #[account(address = ix_sysvar::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
