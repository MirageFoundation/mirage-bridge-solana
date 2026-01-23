use anchor_lang::prelude::*;

#[event]
pub struct BurnInitiated {
    pub burn_id: u64,
    pub solana_sender: Pubkey,
    pub mirage_recipient: String,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct MintAttested {
    pub burn_tx_hash: [u8; 32],
    pub orchestrator: Pubkey,
    pub current_power: u64,
    pub threshold: u64,
}

#[event]
pub struct MintCompleted {
    pub burn_tx_hash: [u8; 32],
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct BridgePaused {
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BridgeUnpaused {
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AuthorityTransferred {
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
    pub timestamp: i64,
}
