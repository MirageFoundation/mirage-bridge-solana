use anchor_lang::prelude::*;

use crate::constants::MAX_RECIPIENT_LEN;

#[account]
#[derive(InitSpace)]
pub struct BurnRecord {
    pub burn_id: u64,
    pub solana_sender: Pubkey,
    #[max_len(MAX_RECIPIENT_LEN)]
    pub mirage_recipient: String,
    pub amount: u64,
    pub timestamp: i64,
    pub bump: u8,
}
