use anchor_lang::prelude::*;

use crate::errors::BridgeError;
use crate::events::AuthorityTransferred;
use crate::state::{BridgeConfig, BridgeState};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TransferAuthorityParams {
    pub new_authority: Pubkey,
}

pub fn transfer_authority(
    ctx: Context<TransferAuthority>,
    params: TransferAuthorityParams,
) -> Result<()> {
    let old_authority = ctx.accounts.authority.key();
    let new_authority = params.new_authority;

    require!(
        old_authority != new_authority,
        BridgeError::InvalidAuthority
    );

    // Update authority in both accounts
    ctx.accounts.bridge_config.authority = new_authority;
    ctx.accounts.bridge_state.authority = new_authority;

    let clock = Clock::get()?;
    emit!(AuthorityTransferred {
        old_authority,
        new_authority,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Authority transferred from {} to {}",
        old_authority,
        new_authority
    );

    Ok(())
}

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"bridge_config"],
        bump = bridge_config.bump,
        has_one = authority @ BridgeError::Unauthorized
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        mut,
        seeds = [b"bridge_state"],
        bump = bridge_state.bump,
        has_one = authority @ BridgeError::Unauthorized
    )]
    pub bridge_state: Account<'info, BridgeState>,
}
