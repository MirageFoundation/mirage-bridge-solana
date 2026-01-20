use anchor_lang::prelude::*;

#[account]
pub struct BridgeState {
    pub bump: u8,
    pub authority: Pubkey,       // Who can update config
    pub orchestrator: Pubkey,    // Who can mint
    pub last_sequence: u64,      // Highest sequence number seen
    // Bitmap for replay protection (window of 1024 transactions)
    // 0 = not processed, 1 = processed
    // Bit 0 corresponds to (last_sequence), Bit 1 to (last_sequence - 1), etc.
    pub replay_bitmap: [u128; 8], 
}

impl BridgeState {
    // 8 + 1 + 32 + 32 + 8 + (16 * 8) = 8 + 1 + 32 + 32 + 8 + 128 = 209
    pub const LEN: usize = 8 + 1 + 32 + 32 + 8 + 128;
}
