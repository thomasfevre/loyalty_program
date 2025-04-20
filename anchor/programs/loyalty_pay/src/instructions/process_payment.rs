use crate::{constants::*, errors::ErrorCode, state::LoyaltyCard};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::Metadata as Metaplex,
    token::{transfer, Token, TokenAccount, Transfer},
    token_interface::Mint,
};

use super::utils::{init_token, mint_loyalty_token, update_nft_uri};

pub fn process_payment_handler(ctx: Context<ProcessPayment>, amount: u64) -> Result<()> {
    let customer_key = ctx.accounts.customer.key();
    let merchant_key = ctx.accounts.merchant.key();

    // Save the current points
    let previous_points = ctx.accounts.loyalty_card.loyalty_points;

    // Add the new payment amount
    ctx.accounts.loyalty_card.loyalty_points = ctx
        .accounts
        .loyalty_card
        .loyalty_points
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;

    // Main logic for new loyalty card
    if ctx.accounts.loyalty_card.mint_address == Pubkey::default() {
        // Initialize loyalty card details
        ctx.accounts.loyalty_card.merchant = merchant_key;
        ctx.accounts.loyalty_card.customer = customer_key;
        ctx.accounts.loyalty_card.threshold = 100;
        ctx.accounts.loyalty_card.refund_percentage = 15;

        // Initialize token if needed
        if ctx.accounts.token_destination.amount == 0 {
            if ctx.accounts.metadata.lamports() == 0 {
                init_token(
                    &customer_key,
                    &merchant_key,
                    &ctx.accounts.metadata,
                    &ctx.accounts.mint,
                    &ctx.accounts.customer,
                    &ctx.accounts.system_program,
                    &ctx.accounts.token_metadata_program,
                    &ctx.accounts.rent,
                    &ctx.bumps.mint,
                    METADATA_COMMON,
                )?;
            }

            mint_loyalty_token(
                &customer_key,
                &ctx.accounts.customer,
                &merchant_key,
                &ctx.accounts.mint,
                &ctx.accounts.token_destination,
                &ctx.accounts.token_program,
                &ctx.bumps.mint,
            )?;
        }

        ctx.accounts.loyalty_card.mint_address = ctx.accounts.mint.key();
    } else {
        // Logic for updating NFT tier based on points
        handle_nft_upgrade(
            previous_points,
            ctx.accounts.loyalty_card.loyalty_points,
            &ctx.accounts.metadata,
            &ctx.accounts.token_metadata_program,
            &customer_key,
            &merchant_key,
            &ctx.accounts.customer,
            &ctx.bumps.mint,
        )?;
    }

    // Process USDC transfer with potential refund
    let (transfer_amount, updated_points) = process_payment_transfer(
        &ctx.accounts.usdc_mint, 
        amount,
        previous_points,
        ctx.accounts.loyalty_card.threshold,
        ctx.accounts.loyalty_card.refund_percentage,
        ctx.accounts.loyalty_card.loyalty_points,
    )?;
    
    // Update loyalty points if needed
    if updated_points != ctx.accounts.loyalty_card.loyalty_points {
        ctx.accounts.loyalty_card.loyalty_points = updated_points;
    }
    
    // Execute the transfer
    let cpi_accounts = Transfer {
        from: ctx.accounts.customer_usdc_ata.to_account_info(),
        to: ctx.accounts.merchant_usdc_ata.to_account_info(),
        authority: ctx.accounts.customer.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer(cpi_ctx, transfer_amount)?;

    msg!(
        "Loyalty card updated. New loyalty points: {}",
        ctx.accounts.loyalty_card.loyalty_points
    );
    Ok(())
}

fn handle_nft_upgrade<'info>(
    previous_points: u64,
    current_points: u64,
    metadata: &UncheckedAccount<'info>,
    token_metadata_program: &Program<'info, Metaplex>,
    customer_key: &Pubkey,
    merchant_key: &Pubkey,
    customer: &Signer<'info>,
    bump: &u8,
) -> Result<()> {
    match (previous_points, current_points) {
        (prev, curr) if prev >= 100 && curr > prev => {
            msg!("Back to level Common");
            update_nft_uri(
                metadata,
                METADATA_COMMON,
                token_metadata_program,
                customer_key,
                merchant_key,
                customer,
                bump,
            )?;
        }
        (prev, curr) if prev <= 33 && curr > 33 => {
            msg!("Upgrade to level Rare");
            update_nft_uri(
                metadata,
                METADATA_RARE,
                token_metadata_program,
                customer_key,
                merchant_key,
                customer,
                bump,
            )?;
        }
        (prev, curr) if prev <= 66 && curr > 66 => {
            msg!("Upgrade to level Epic");
            update_nft_uri(
                metadata,
                METADATA_EPIC,
                token_metadata_program,
                customer_key,
                merchant_key,
                customer,
                bump,
            )?;
        }
        (prev, curr) if prev < 100 && curr >= 100 => {
            msg!("Upgrade to level Legendary");
            update_nft_uri(
                metadata,
                METADATA_LEGENDARY,
                token_metadata_program,
                customer_key,
                merchant_key,
                customer,
                bump,
            )?;
        }
        _ => {}
    }
    Ok(())
}

fn process_payment_transfer(
    usdc_mint: &InterfaceAccount<Mint>,
    amount: u64,
    previous_points: u64,
    threshold: u64,
    refund_percentage: u8,
    current_points: u64,
) -> Result<(u64, u64)> {
    let usdc_decimals = usdc_mint.decimals as u32;
    
    let mut transfer_amount = amount
        .checked_mul(10u64.pow(usdc_decimals))
        .ok_or(ErrorCode::Overflow)?;
    
    let mut updated_points = current_points;

    // Process refund if applicable
    if previous_points >= threshold && current_points > previous_points {
        let refund_percentage = refund_percentage as u64;
        let amount_decimals = amount.checked_mul(10u64.pow(usdc_decimals)).ok_or(ErrorCode::Overflow)?;
        
        let refund_amount = amount_decimals
            .checked_mul(refund_percentage)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(100)
            .ok_or(ErrorCode::Overflow)?;
            
        transfer_amount = amount_decimals.checked_sub(refund_amount).ok_or(ErrorCode::Overflow)?;
        
        // Calculate the reduced points without modifying the struct directly
        updated_points = current_points
            .checked_sub(threshold)
            .ok_or(ErrorCode::Overflow)?;
            
        msg!("Threshold reached: refunding {} USDC", refund_amount / 10u64.pow(usdc_decimals));
    }
    
    Ok((transfer_amount, updated_points))
}

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(
        init_if_needed,
        payer = customer,
        space = 8 + LoyaltyCard::INIT_SPACE,
        seeds = [b"loyalty", customer.key().as_ref(), merchant.key().as_ref()],
        bump,
    )]
    pub loyalty_card: Account<'info, LoyaltyCard>,

    #[account()]
    pub merchant: UncheckedAccount<'info>,

    #[account(mut, signer)]
    pub customer: Signer<'info>,

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

    #[account(
        address = USDC_MINT,
    )]
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = customer,
        seeds = [b"mint", customer.key().as_ref(), merchant.key().as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = mint,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// CHECK: This account is checked in the instruction
    #[account(
        mut,
        seeds = ["metadata".as_bytes(), token_metadata_program.key().as_ref(), mint.key().as_ref()],
        seeds::program = token_metadata_program.key(),
        bump,
    )]
    pub metadata: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = customer,
        associated_token::mint = mint,
        associated_token::authority = customer,
    )]
    pub token_destination: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub token_metadata_program: Program<'info, Metaplex>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
} 