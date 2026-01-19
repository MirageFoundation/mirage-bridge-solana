use anchor_lang::prelude::*;

use crate::errors::BridgeError;
use crate::events::BridgePaused;
use crate::state::BridgeConfig;

pub fn pause(ctx: Context<Pause>) -> Result<()> {
    let bridge_config = &mut ctx.accounts.bridge_config;
    bridge_config.paused = true;

    let clock = Clock::get()?;
    emit!(BridgePaused {
        authority: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct Pause<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"bridge_config"],
        bump = bridge_config.bump,
        has_one = authority @ BridgeError::Unauthorized
    )]
    pub bridge_config: Account<'info, BridgeConfig>,
}
