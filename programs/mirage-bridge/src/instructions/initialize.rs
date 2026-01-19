use anchor_lang::prelude::*;
use anchor_spl::token::Token;

use crate::constants::BASIS_POINTS_DENOMINATOR;
use crate::errors::BridgeError;
use crate::state::{BridgeConfig, ValidatorRegistry};

pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
    require!(
        !params.mirage_chain_id.is_empty(),
        BridgeError::InvalidChainId
    );
    require!(
        params.attestation_threshold > 0 && params.attestation_threshold <= BASIS_POINTS_DENOMINATOR,
        BridgeError::InvalidThreshold
    );

    let bridge_config = &mut ctx.accounts.bridge_config;
    bridge_config.authority = ctx.accounts.authority.key();
    bridge_config.mint = ctx.accounts.token_mint.key();
    bridge_config.mirage_chain_id = params.mirage_chain_id;
    bridge_config.attestation_threshold = params.attestation_threshold;
    bridge_config.total_minted = 0;
    bridge_config.total_burned = 0;
    bridge_config.burn_nonce = 0;
    bridge_config.paused = false;
    bridge_config.bump = ctx.bumps.bridge_config;

    let validator_registry = &mut ctx.accounts.validator_registry;
    validator_registry.validators = Vec::new();
    validator_registry.total_voting_power = 0;
    validator_registry.bump = ctx.bumps.validator_registry;

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeParams {
    pub mirage_chain_id: String,
    pub attestation_threshold: u64,
}

#[derive(Accounts)]
#[instruction(params: InitializeParams)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + BridgeConfig::INIT_SPACE,
        seeds = [b"bridge_config"],
        bump
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + ValidatorRegistry::INIT_SPACE,
        seeds = [b"validator_registry"],
        bump
    )]
    pub validator_registry: Account<'info, ValidatorRegistry>,

    #[account(
        init,
        payer = authority,
        seeds = [b"mint"],
        bump,
        mint::decimals = 6,
        mint::authority = bridge_config
    )]
    pub token_mint: Account<'info, anchor_spl::token::Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}
