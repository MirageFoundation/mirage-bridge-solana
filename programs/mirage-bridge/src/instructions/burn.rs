use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Token, TokenAccount};

use crate::errors::BridgeError;
use crate::events::BurnInitiated;
use crate::state::{BridgeConfig, BurnRecord};
use crate::utils::validate_mirage_address;

pub fn burn(ctx: Context<BurnTokens>, params: BurnParams) -> Result<()> {
    let bridge_config = &ctx.accounts.bridge_config;

    require!(!bridge_config.paused, BridgeError::BridgePaused);
    require!(params.amount > 0, BridgeError::InvalidAmount);

    validate_mirage_address(&params.mirage_recipient)?;

    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        params.amount,
    )?;

    let bridge_config = &mut ctx.accounts.bridge_config;
    let current_nonce = bridge_config.burn_nonce;
    bridge_config.burn_nonce = bridge_config
        .burn_nonce
        .checked_add(1)
        .ok_or(BridgeError::NonceOverflow)?;
    bridge_config.total_burned = bridge_config
        .total_burned
        .checked_add(params.amount)
        .ok_or(BridgeError::AmountOverflow)?;

    let clock = Clock::get()?;
    let burn_record = &mut ctx.accounts.burn_record;
    burn_record.burn_id = current_nonce;
    burn_record.solana_sender = ctx.accounts.user.key();
    burn_record.mirage_recipient = params.mirage_recipient.clone();
    burn_record.amount = params.amount;
    burn_record.timestamp = clock.unix_timestamp;
    burn_record.bump = ctx.bumps.burn_record;

    emit!(BurnInitiated {
        burn_id: current_nonce,
        solana_sender: ctx.accounts.user.key(),
        mirage_recipient: params.mirage_recipient,
        amount: params.amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct BurnParams {
    pub mirage_recipient: String,
    pub amount: u64,
}

#[derive(Accounts)]
#[instruction(params: BurnParams)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

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
       init,
       payer = user,
        space = 8 + BurnRecord::INIT_SPACE,
       seeds = [b"burn_record", &bridge_config.burn_nonce.to_le_bytes()[..]],
       bump
   )]
    pub burn_record: Account<'info, BurnRecord>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
