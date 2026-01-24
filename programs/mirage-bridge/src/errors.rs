use anchor_lang::prelude::*;

#[error_code]
pub enum BridgeError {
    #[msg("Chain ID cannot be empty")]
    InvalidChainId,
    #[msg("Attestation threshold must be between 1 and 10000")]
    InvalidThreshold,

    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    #[msg("Bridge is paused")]
    BridgePaused,
    #[msg("Invalid Mirage recipient address")]
    InvalidMirageRecipient,
    #[msg("Burn nonce overflow")]
    NonceOverflow,
    #[msg("Amount overflow")]
    AmountOverflow,

    #[msg("Unauthorized orchestrator")]
    UnauthorizedOrchestrator,
    #[msg("Invalid validator set (zero total power)")]
    InvalidValidatorSet,
    #[msg("Burn hash mismatch with existing record")]
    BurnHashMismatch,
    #[msg("Recipient mismatch with existing record")]
    RecipientMismatch,
    #[msg("Amount mismatch with existing record")]
    AmountMismatch,
    #[msg("Too many attestors")]
    TooManyAttestors,
    #[msg("Power overflow")]
    PowerOverflow,
    #[msg("Invalid Ed25519 signature instruction")]
    InvalidSignatureInstruction,
    #[msg("Signature pubkey mismatch")]
    SignaturePubkeyMismatch,
    #[msg("Signature message mismatch")]
    SignatureMessageMismatch,

    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid authority (same as current)")]
    InvalidAuthority,
    #[msg("Validator set cannot be empty")]
    EmptyValidatorSet,
    #[msg("Too many validators")]
    TooManyValidators,

    // Replay protection errors
    #[msg("Transaction sequence too old (outside 1024-tx window)")]
    TransactionTooOld,
    #[msg("Transaction already minted (replay detected)")]
    AlreadyMinted,
    #[msg("Invalid mint address")]
    InvalidMint,
}
