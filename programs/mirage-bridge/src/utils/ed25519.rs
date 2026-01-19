use crate::errors::BridgeError;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked,
};

pub const ED25519_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    0x03, 0x7d, 0x46, 0xd6, 0x7c, 0x93, 0xfb, 0xbe, 0x12, 0xf9, 0x42, 0x8f, 0x83, 0x8d, 0x40, 0xff,
    0x05, 0x70, 0x74, 0x49, 0x27, 0xf4, 0x8a, 0x64, 0xfc, 0xca, 0x70, 0x44, 0x80, 0x00, 0x00, 0x00,
]);

pub fn build_attestation_payload(
    burn_tx_hash: &[u8; 32],
    mirage_sender: &str,
    amount: u64,
    recipient: &Pubkey,
) -> Vec<u8> {
    let mut payload = Vec::new();
    payload.extend_from_slice(burn_tx_hash);
    payload.extend_from_slice(&(mirage_sender.len() as u32).to_le_bytes());
    payload.extend_from_slice(mirage_sender.as_bytes());
    payload.extend_from_slice(&amount.to_le_bytes());
    payload.extend_from_slice(&recipient.to_bytes());
    payload
}

pub fn verify_ed25519_signature(
    instructions_sysvar: &AccountInfo,
    orchestrator: &Pubkey,
    expected_message: &[u8],
) -> Result<()> {
    let current_idx = load_current_index_checked(instructions_sysvar)
        .map_err(|_| BridgeError::InvalidSignatureInstruction)?;

    require!(current_idx > 0, BridgeError::InvalidSignatureInstruction);

    let ed25519_ix = load_instruction_at_checked(current_idx as usize - 1, instructions_sysvar)
        .map_err(|_| BridgeError::InvalidSignatureInstruction)?;

    require!(
        ed25519_ix.program_id == ED25519_PROGRAM_ID,
        BridgeError::InvalidSignatureInstruction
    );

    let data = &ed25519_ix.data;
    require!(data.len() >= 2, BridgeError::InvalidSignatureInstruction);

    let num_signatures = data[0];
    require!(
        num_signatures == 1,
        BridgeError::InvalidSignatureInstruction
    );

    require!(data.len() >= 16, BridgeError::InvalidSignatureInstruction);

    let pubkey_offset = u16::from_le_bytes([data[6], data[7]]) as usize;
    let message_offset = u16::from_le_bytes([data[10], data[11]]) as usize;
    let message_size = u16::from_le_bytes([data[12], data[13]]) as usize;

    require!(
        data.len() >= pubkey_offset + 32,
        BridgeError::InvalidSignatureInstruction
    );
    require!(
        data.len() >= message_offset + message_size,
        BridgeError::InvalidSignatureInstruction
    );

    let pubkey_bytes = &data[pubkey_offset..pubkey_offset + 32];
    let message_bytes = &data[message_offset..message_offset + message_size];

    require!(
        pubkey_bytes == orchestrator.to_bytes().as_ref(),
        BridgeError::SignaturePubkeyMismatch
    );

    require!(
        message_bytes == expected_message,
        BridgeError::SignatureMessageMismatch
    );

    Ok(())
}
