use crate::errors::BridgeError;
use anchor_lang::prelude::*;
use bech32::Hrp;

pub fn validate_mirage_address(address: &str) -> Result<()> {
    let hrp = Hrp::parse("mirage").map_err(|_| BridgeError::InvalidMirageRecipient)?;

    let (parsed_hrp, _data) =
        bech32::decode(address).map_err(|_| BridgeError::InvalidMirageRecipient)?;

    require!(parsed_hrp == hrp, BridgeError::InvalidMirageRecipient);

    Ok(())
}
