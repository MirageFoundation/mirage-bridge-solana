use anchor_lang::prelude::*;
use mpl_token_metadata::{
    instructions::CreateMetadataAccountV3CpiBuilder,
    types::DataV2,
    ID as METADATA_PROGRAM_ID,
};

use crate::errors::BridgeError;
use crate::events::MetadataCreated;
use crate::state::BridgeConfig;

pub fn create_metadata(ctx: Context<CreateMetadata>, params: CreateMetadataParams) -> Result<()> {
    let metadata_data = DataV2 {
        name: params.token_name,
        symbol: params.token_symbol,
        uri: params.token_uri,
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    let bridge_config_seeds = &[b"bridge_config".as_ref(), &[ctx.accounts.bridge_config.bump]];

    CreateMetadataAccountV3CpiBuilder::new(&ctx.accounts.token_metadata_program)
        .metadata(&ctx.accounts.metadata)
        .mint(&ctx.accounts.mint.to_account_info())
        .mint_authority(&ctx.accounts.bridge_config.to_account_info())
        .payer(&ctx.accounts.authority)
        .update_authority(&ctx.accounts.bridge_config.to_account_info(), true)
        .system_program(&ctx.accounts.system_program)
        .data(metadata_data)
        .is_mutable(true)
        .invoke_signed(&[bridge_config_seeds])?;

    let clock = Clock::get()?;
    emit!(MetadataCreated {
        authority: ctx.accounts.authority.key(),
        mint: ctx.accounts.mint.key(),
        metadata: ctx.accounts.metadata.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateMetadataParams {
    pub token_name: String,
    pub token_symbol: String,
    pub token_uri: String,
}

#[derive(Accounts)]
pub struct CreateMetadata<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"bridge_config"],
        bump = bridge_config.bump,
        has_one = authority @ BridgeError::Unauthorized,
        has_one = mint @ BridgeError::InvalidMint
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        seeds = [b"mint"],
        bump
    )]
    pub mint: Account<'info, anchor_spl::token::Mint>,

    /// CHECK: Created by token metadata program via CPI
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Token Metadata program
    #[account(address = METADATA_PROGRAM_ID)]
    pub token_metadata_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
