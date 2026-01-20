use anchor_lang::prelude::*;

use crate::constants::MAX_ATTESTORS;

#[account]
#[derive(InitSpace)]
pub struct MintRecord {
    pub discriminator: [u8; 8],
    pub payer: Pubkey,
    pub burn_tx_hash: [u8; 32],
    pub recipient: Pubkey,
    pub amount: u64,
    #[max_len(MAX_ATTESTORS)]
    pub attestations: Vec<Pubkey>,
    pub attested_power: u64,
    pub completed: bool,
    pub completed_at: Option<i64>,
    pub bump: u8,
}
