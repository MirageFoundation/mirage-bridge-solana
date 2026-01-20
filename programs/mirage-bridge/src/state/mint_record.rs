use anchor_lang::prelude::*;

use crate::constants::MAX_ATTESTORS;

#[account]
#[derive(InitSpace)]
pub struct MintRecord {
    pub payer: Pubkey,           // Who funded this record (gets rent back)
    pub burn_tx_hash: [u8; 32],
    pub recipient: Pubkey,
    pub amount: u64,
    #[max_len(MAX_ATTESTORS)]
    pub attestations: Vec<Pubkey>,
    pub attested_power: u64,
    pub bump: u8,
}

impl MintRecord {
    pub fn has_attested(&self, orchestrator: &Pubkey) -> bool {
        self.attestations.contains(orchestrator)
    }
}
