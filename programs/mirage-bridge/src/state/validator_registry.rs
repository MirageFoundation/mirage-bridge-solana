use anchor_lang::prelude::*;

use crate::constants::{MAX_VALIDATORS, MAX_VALIDATOR_ADDR_LEN};

#[account]
#[derive(InitSpace)]
pub struct ValidatorRegistry {
    #[max_len(MAX_VALIDATORS)]
    pub validators: Vec<ValidatorInfo>,
    pub total_voting_power: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, InitSpace)]
pub struct ValidatorInfo {
    pub orchestrator_pubkey: Pubkey,
    #[max_len(MAX_VALIDATOR_ADDR_LEN)]
    pub mirage_validator: String,
    pub voting_power: u64,
}

impl ValidatorRegistry {
    pub fn get_validator_power(&self, orchestrator: &Pubkey) -> Option<u64> {
        self.validators
            .iter()
            .find(|v| v.orchestrator_pubkey == *orchestrator)
            .map(|v| v.voting_power)
    }
}
