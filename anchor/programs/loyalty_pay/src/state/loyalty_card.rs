use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LoyaltyCard {
    pub merchant: Pubkey,
    pub customer: Pubkey,
    pub loyalty_points: u64,
    pub threshold: u64,
    pub refund_percentage: u8,
    pub mint_address: Pubkey,
}
