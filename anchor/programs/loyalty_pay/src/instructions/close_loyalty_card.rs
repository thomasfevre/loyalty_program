use crate::state::LoyaltyCard;
use anchor_lang::prelude::*;

pub fn close_loyalty_card_handler(ctx: Context<CloseLoyaltyCard>) -> Result<()> {
    msg!("Loyalty card closed and rent refunded to customer.");
    Ok(())
}

#[derive(Accounts)]
pub struct CloseLoyaltyCard<'info> {
    #[account(
        mut,
        close = customer, // refund rent to customer
        seeds = [b"loyalty", customer.key().as_ref(), merchant.key().as_ref()],
        bump,
        has_one = customer,
        has_one = merchant
    )]
    pub loyalty_card: Account<'info, LoyaltyCard>,

    #[account(mut, signer)]
    pub customer: Signer<'info>,

    #[account()]
    pub merchant: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
} 