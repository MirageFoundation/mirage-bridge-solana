use anchor_lang::prelude::*;

use crate::constants::MAX_VALIDATORS;
use crate::errors::BridgeError;
use crate::state::{BridgeConfig, ValidatorInfo, ValidatorRegistry};

pub fn update_validators(ctx: Context<UpdateValidators>, params: UpdateValidatorsParams) -> Result<()> {
    require!(!params.validators.is_empty(), BridgeError::EmptyValidatorSet);
    require!(
        params.validators.len() <= MAX_VALIDATORS,
        BridgeError::TooManyValidators
    );

    let total_voting_power: u64 = params
        .validators
        .iter()
        .map(|v| v.voting_power)
        .try_fold(0u64, |acc, power| acc.checked_add(power))
        .ok_or(BridgeError::PowerOverflow)?;

    let validator_registry = &mut ctx.accounts.validator_registry;
    validator_registry.validators = params.validators;
    validator_registry.total_voting_power = total_voting_power;

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateValidatorsParams {
    pub validators: Vec<ValidatorInfo>,
}

#[derive(Accounts)]
pub struct UpdateValidators<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"bridge_config"],
        bump = bridge_config.bump,
        has_one = authority @ BridgeError::Unauthorized
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        mut,
        seeds = [b"validator_registry"],
        bump = validator_registry.bump
    )]
    pub validator_registry: Account<'info, ValidatorRegistry>,
}
