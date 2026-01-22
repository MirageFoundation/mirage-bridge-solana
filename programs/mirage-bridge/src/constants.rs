pub const MAX_VALIDATORS: usize = 100;
pub const MAX_VALIDATOR_ADDR_LEN: usize = 52; // miragevaloper1... is ~52 chars
pub const MAX_RECIPIENT_LEN: usize = 64; // mirage1... is ~45 chars
pub const MAX_CHAIN_ID_LEN: usize = 32;
pub const BASIS_POINTS_DENOMINATOR: u64 = 10000;

// Account size calculation for ValidatorRegistry:
// - discriminator: 8 bytes
// - validators vec length: 4 bytes
// - validators: MAX_VALIDATORS * (32 pubkey + 4 string_len + MAX_VALIDATOR_ADDR_LEN + 8 u64)
//             = 100 * (32 + 4 + 52 + 8) = 100 * 96 = 9,600 bytes
// - total_stake: 8 bytes
// - bump: 1 byte
// Total: 8 + 4 + 9,600 + 8 + 1 = 9,621 bytes (under 10,240 limit)
