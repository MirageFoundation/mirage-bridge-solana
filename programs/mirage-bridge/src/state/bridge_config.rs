use anchor_lang::prelude::*;

use crate::constants::MAX_CHAIN_ID_LEN;

#[account]
#[derive(InitSpace)]
pub struct BridgeConfig {
    pub authority: Pubkey,
    pub mint: Pubkey,
    #[max_len(MAX_CHAIN_ID_LEN)]
    pub mirage_chain_id: String,
    pub attestation_threshold: u64,
    pub total_minted: u64,
    pub total_burned: u64,
    pub burn_nonce: u64,
    pub paused: bool,
    pub bump: u8,
}
