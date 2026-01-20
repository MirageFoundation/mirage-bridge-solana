#![allow(unexpected_cfgs)]
#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;
use instructions::burn::*;
use instructions::initialize::*;
use instructions::mint::*;
use instructions::pause::*;
use instructions::unpause::*;
use instructions::update_validators::*;

declare_id!("2Qq27EibjxwgaV69WJst2Wxj3TS33DSVV42Gys9pDV8V");

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

#[program]
pub mod mirage_bridge {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        instructions::initialize::initialize(ctx, params)
    }

    pub fn burn(ctx: Context<BurnTokens>, params: BurnParams) -> Result<()> {
        instructions::burn::burn(ctx, params)
    }

    pub fn mint(ctx: Context<MintTokens>, params: MintParams) -> Result<()> {
        instructions::mint::mint(ctx, params)
    }

    pub fn update_validators(
        ctx: Context<UpdateValidators>,
        params: UpdateValidatorsParams,
    ) -> Result<()> {
        instructions::update_validators::update_validators(ctx, params)
    }

    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        instructions::pause::pause(ctx)
    }

    pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
        instructions::unpause::unpause(ctx)
    }
}
