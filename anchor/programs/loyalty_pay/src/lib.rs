use crate::constants::USDC_MINT;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

declare_id!("DG415jpPKStJC9uUb77e4UUXVnQ843P1dLB7F9v9sjSc");

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
            msg!("Threshold reached: refunding {} USDC", refund);

            // Perform USDC refund transfer
            let cpi_accounts = Transfer {
                from: ctx.accounts.merchant_usdc_ata.to_account_info(),
                to: ctx.accounts.customer_usdc_ata.to_account_info(),
                authority: ctx.accounts.merchant.to_account_info(),
            };

            let cpi_ctx =
                CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

            transfer(cpi_ctx, refund)?;

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

    /**
    The account will be closed automatically by Anchor.
    No additional logic is needed here.
    docs: https://docs.rs/anchor-lang/latest/anchor_lang/trait.AccountsClose.html
    */
    pub fn close_loyalty_card(_ctx: Context<CloseLoyaltyCard>) -> Result<()> {
        msg!("Loyalty card closed and rent refunded to merchant.");
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

    #[account(mut)]
    pub customer: SystemAccount<'info>,

    #[account(mut, signer)]
    pub merchant: AccountInfo<'info>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = merchant,
    )]
    pub merchant_usdc_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = customer,
    )]
    pub customer_usdc_ata: Account<'info, TokenAccount>,

    /// CHECK: verified by constraint
    #[account(
        address = USDC_MINT
    )]
    pub usdc_mint: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseLoyaltyCard<'info> {
    #[account(
        mut,
        close = merchant, // refund rent to merchant
        seeds = [b"loyalty", customer.key().as_ref(), merchant.key().as_ref()],
        bump,
        has_one = customer,
        has_one = merchant
    )]
    pub loyalty_card: Account<'info, LoyaltyCard>,

    #[account(mut, signer)]
    pub customer: SystemAccount<'info>,

    #[account(mut)]
    pub merchant: SystemAccount<'info>,
}

#[account]
pub struct LoyaltyCard {
    /// CHECK: The merchant account is verified and signed by the merchant, so it's safe.
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

    #[msg("Only the merchant who owns this card can close it.")]
    Unauthorized,
}

pub mod constants {
    use super::*;
    pub const USDC_MINT: Pubkey = pubkey!("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
}
