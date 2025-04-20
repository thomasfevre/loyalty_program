use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("24rAgLg6RkxhkrS6rp9N7cTZC1GJuembSxha5gJd81tL");

#[program]
pub mod loyalty_program {
    use super::*;

    pub fn process_payment(ctx: Context<ProcessPayment>, amount: u64) -> Result<()> {
        instructions::process_payment::process_payment_handler(ctx, amount)
    }

    pub fn close_loyalty_card(ctx: Context<CloseLoyaltyCard>) -> Result<()> {
        instructions::close_loyalty_card::close_loyalty_card_handler(ctx)
    }
}