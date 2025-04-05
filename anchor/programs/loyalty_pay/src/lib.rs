use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};
use mpl_token_metadata::ID as mpl_metadata_id;
declare_id!("6WQoS7AUSzB9dBC1QKCbKRySxZuj6oVYUdTNHtkXYVio");

#[program]
pub mod loyalty_program {
    use super::*;

    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        amount: u64,
        mint_address: Pubkey,
    ) -> Result<()> {
        let loyalty_card = &mut ctx.accounts.loyalty_card;
        let customer = &ctx.accounts.customer;
        let merchant = &ctx.accounts.merchant;
        let system_program = &ctx.accounts.system_program;
        // If this is a new loyalty card, initialize it.
        if loyalty_card.loyalty_points == 0 {
            loyalty_card.merchant = merchant.key();
            loyalty_card.customer = customer.key();
            loyalty_card.threshold = 100; // Example threshold value (adjust as needed)
            loyalty_card.refund_percentage = 15; // 15% refund
            loyalty_card.mint_address = mint_address;
        }

        // Save the current points, then add the new payment amount.
        let previous_points = loyalty_card.loyalty_points;
        loyalty_card.loyalty_points = loyalty_card
            .loyalty_points
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        // Check if threshold is just reached or exceeded.
        if previous_points < loyalty_card.threshold
            && loyalty_card.loyalty_points >= loyalty_card.threshold
        {
            // Calculate refund (15% of the current payment amount).
            let refund = (amount as u128 * loyalty_card.refund_percentage as u128 / 100) as u64;
            msg!("Threshold reached: refunding {} lamports", refund);

            let ix = system_instruction::transfer(&merchant.key(), &customer.key(), refund);
            invoke(
                &ix,
                &[
                    merchant.to_account_info(), // Ensure it's mutable and signed
                    customer.to_account_info(),
                    system_program.to_account_info(),
                ],
            )?;

            // Update loyalty points after refund --> set to 0
            loyalty_card.loyalty_points = loyalty_card
                .loyalty_points
                .checked_sub(loyalty_card.threshold)
                .ok_or(ErrorCode::Overflow)?;
        }

        msg!(
            "Loyalty card updated. New loyalty points: {}",
            loyalty_card.loyalty_points
        );
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(
        init_if_needed,
        payer = merchant,
        space = 8 + LoyaltyCard::SIZE,
        seeds = [b"loyalty", customer.key().as_ref(), merchant.key().as_ref()],
        bump,
    )]
    pub loyalty_card: Account<'info, LoyaltyCard>,

    #[account(mut, signer)] // Ensure merchant is a signer
    pub merchant: Signer<'info>,

    #[account(mut)] // Ensure customer is mutable
    pub customer: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct LoyaltyCard {
    pub merchant: Pubkey,
    pub customer: Pubkey,
    pub loyalty_points: u64,
    pub threshold: u64,
    pub refund_percentage: u8,
    pub mint_address: Pubkey,
}

impl LoyaltyCard {
    // Total size in bytes:
    // 32 (merchant) + 32 (customer) + 8 (loyalty_points) + 8 (threshold) + 1 (refund_percentage) + 32 (mintAddress)
    const SIZE: usize = 32 + 32 + 8 + 8 + 1 + 32;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Arithmetic overflow occurred.")]
    Overflow,
}
