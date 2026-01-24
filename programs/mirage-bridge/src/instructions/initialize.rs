use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use mpl_token_metadata::{
    instructions::CreateMetadataAccountV3CpiBuilder,
    types::DataV2,
    ID as METADATA_PROGRAM_ID,
};

use crate::constants::BASIS_POINTS_DENOMINATOR;
use crate::errors::BridgeError;
use crate::state::{BridgeConfig, BridgeState, ValidatorRegistry};

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
    validator_registry.total_stake = 0;
    validator_registry.bump = ctx.bumps.validator_registry;

    let bridge_state = &mut ctx.accounts.bridge_state;
    bridge_state.bump = ctx.bumps.bridge_state;
    bridge_state.authority = ctx.accounts.authority.key();
    bridge_state.last_sequence = 0;
    bridge_state.replay_bitmap = [0; 8];

    // Create token metadata
    let metadata_data = DataV2 {
        name: params.token_name,
        symbol: params.token_symbol,
        uri: params.token_uri,
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    let bridge_config_seeds = &[b"bridge_config".as_ref(), &[ctx.bumps.bridge_config]];

    CreateMetadataAccountV3CpiBuilder::new(&ctx.accounts.token_metadata_program)
        .metadata(&ctx.accounts.metadata)
        .mint(&ctx.accounts.token_mint.to_account_info())
        .mint_authority(&ctx.accounts.bridge_config.to_account_info())
        .payer(&ctx.accounts.authority)
        .update_authority(&ctx.accounts.bridge_config.to_account_info(), true)
        .system_program(&ctx.accounts.system_program)
        .data(metadata_data)
        .is_mutable(true)
        .invoke_signed(&[bridge_config_seeds])?;

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeParams {
    pub mirage_chain_id: String,
    pub attestation_threshold: u64,
    pub token_name: String,
    pub token_symbol: String,
    pub token_uri: String,
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
        space = BridgeState::LEN,
        seeds = [b"bridge_state"],
        bump
    )]
    pub bridge_state: Account<'info, BridgeState>,

    #[account(
        init,
        payer = authority,
        seeds = [b"mint"],
        bump,
        mint::decimals = 6,
        mint::authority = bridge_config
    )]
    pub token_mint: Account<'info, anchor_spl::token::Mint>,

    /// CHECK: Created by token metadata program via CPI
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Token Metadata program
    #[account(address = METADATA_PROGRAM_ID)]
    pub token_metadata_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}
