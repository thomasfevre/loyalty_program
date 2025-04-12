use crate::constants::USDC_MINT;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};
use mpl_core::{
    accounts::{AssetSigner, BaseCollectionV1},
    instructions::CreateV2CpiBuilder,
    programs::MPL_CORE_ID,
    types::UpdateAuthority,
};
use anchor_spl::token_interface::Mint;

declare_id!("7YXA7HHr9UGXYA3cFC72s9ZUVbHDJbUojGz6puNrDu47");

#[program]
pub mod loyalty_program {

    use super::*;

    // pub fn create_collection(ctx: Context<CreateCollection>) -> Result<()> {
    //     CreateCollectionV2CpiBuilder::new(&ctx.accounts.system_program)
    //         .payer(&ctx.accounts.payer)
    //         .collection(&ctx.accounts.collection)
    //         .system_program(&ctx.accounts.system_program)
    //         .name("LoyaltyPay".to_string())
    //         .uri("test bite".to_string())
    //         .invoke()?;

    //     msg!("NFT Collection created successfully");
    //     Ok(())
    // }

    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        amount: u64,
        mint_address: Pubkey,
    ) -> Result<()> {
        let loyalty_card = &mut ctx.accounts.loyalty_card;
        let customer = &ctx.accounts.customer;
        let merchant = &ctx.accounts.merchant;

        // If this is a new loyalty card, initialize it.
        if loyalty_card.customer == Pubkey::default() {
            loyalty_card.merchant = merchant.key();
            loyalty_card.customer = customer.key();
            loyalty_card.threshold = 100; // Example threshold value (adjust as needed)
            loyalty_card.refund_percentage = 15; // 15% refund
            loyalty_card.mint_address = mint_address;
        }

        loyalty_card.loyalty_points = loyalty_card
            .loyalty_points
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
            .payer(&ctx.accounts.customer)
            .owner(Some(&ctx.accounts.customer))
            .name("loyalty pay".to_string())
            .uri("test bite".to_string())
            .asset(&ctx.accounts.nft_asset.to_account_info())
            // TODO: Investigate authority. Collection owner can only update
            .authority(Some(&ctx.accounts.customer.to_account_info()))
            .system_program(&ctx.accounts.system_program.to_account_info())
            .invoke_signed(&[&[
                b"loyalty",
                ctx.accounts.customer.key().as_ref(),
                ctx.accounts.merchant.key().as_ref(),
                &[ctx.bumps.loyalty_card],
            ]])?;

            let refund = (amount as u128 * loyalty_card.refund_percentage as u128 / 100) as u64;
            msg!("Threshold reached: refunding {} USDC", refund);
            let decimals = 10 * ctx.accounts.usdc_account.decimals;
            let refund_amount = refund
                .checked_mul(decimals.into())
                .ok_or(ErrorCode::Overflow)?;

        // Perform USDC refund transfer
        let cpi_accounts = Transfer {
            from: ctx.accounts.customer_usdc_ata.to_account_info(),
            to: ctx.accounts.merchant_usdc_ata.to_account_info(),
            authority: ctx.accounts.merchant.to_account_info(),
        };

            let cpi_ctx =
                CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

            transfer(cpi_ctx, refund_amount)?;

        // We need to move this logic to a dedicated fn
        // // Update loyalty points after refund --> set to 0
        // loyalty_card.loyalty_points = loyalty_card
        //     .loyalty_points
        //     .checked_sub(loyalty_card.threshold)
        //     .ok_or(ErrorCode::Overflow)?;

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

    #[account(mut, signer)]
    pub customer: SystemAccount<'info>,

    #[account(mut)]
    pub merchant: AccountInfo<'info>,

    #[account(
        mut,
        associated_token::mint = &USDC_MINT,
        associated_token::authority = merchant,
    )]
    pub merchant_usdc_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = &USDC_MINT,
        associated_token::authority = customer,
    )]
    pub customer_usdc_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = USDC_MINT,
    )]
    pub usdc_account: InterfaceAccount<'info, Mint>,

    /// CHECK: This is the NFT asset account
    #[account(
        init_if_needed,
        payer = merchant,
        space = 8 + 1336,
        seeds = [b"nft", customer.key().as_ref(),merchant.key().as_ref()],
        bump,
    )]
    pub nft_asset: AccountInfo<'info>,

    #[account(address = MPL_CORE_ID)]
    pub mpl_core_program: Program<'info, Token>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// #[derive(Accounts)]
// pub struct CreateCollection<'info> {
//     #[account(mut)]
//     pub payer: AccountInfo<'info>,

//     pub system_program: Program<'info, System>,

//     #[Account(
//         mut,
//         constraint = event.update_authority == manager.key(),
//     )]
//     pub collection: Account<'info, BaseCollectionV1>,
// }

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

    #[msg("Failed to create NFT collection.")]
    FailedToCreateCollection,
}

pub mod constants {
    use super::*;
    pub const USDC_MINT: Pubkey = pubkey!("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
}
