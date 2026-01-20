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
    #[msg("Already attested")]
    AlreadyAttested,
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
    #[msg("Already completed")]
    AlreadyCompleted,

    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Validator set cannot be empty")]
    EmptyValidatorSet,
    #[msg("Too many validators")]
    TooManyValidators,

    // Close mint record errors
    #[msg("Mint record not completed yet")]
    MintNotCompleted,
    #[msg("Cooldown period not elapsed (7 days after completion)")]
    CooldownNotElapsed,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,

    #[msg("Transaction sequence too old")]
    TransactionTooOld,
    #[msg("Transaction already minted")]
    AlreadyMinted,
}
