use crate::constants::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount as TokenAccountInterface},
    token::{mint_to, MintTo, transfer, Token, TokenAccount, Transfer},
    metadata::{
        create_metadata_accounts_v3,
        mpl_token_metadata::types::DataV2,
        CreateMetadataAccountsV3, 
        Metadata as Metaplex,
        update_metadata_accounts_v2, UpdateMetadataAccountsV2
    },
};

declare_id!("GFPe3K8jXQ7aJDq9yQ82y85EruUkXr4EXdp3SQ6XUp4");

#[program]
pub mod loyalty_program {
    use super::*;

    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        amount: u64,
    ) -> Result<()> {
        let customer_key = ctx.accounts.customer.key();
        let merchant_key = ctx.accounts.merchant.key();

        // Save the current points
        let previous_points = ctx.accounts.loyalty_card.loyalty_points;
        
        // Add the new payment amount
        ctx.accounts.loyalty_card.loyalty_points = ctx.accounts.loyalty_card
            .loyalty_points
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        
        // Check if this is a new loyalty card
        let is_new = ctx.accounts.loyalty_card.mint_address == Pubkey::default();
        if is_new {
            msg!("Creating new loyalty card for customer: {}", customer_key);
        } else {
            msg!("Updating existing loyalty card for customer: {}", customer_key);
        }
        
        // If this is a new loyalty card, initialize it
        if is_new {
            ctx.accounts.loyalty_card.merchant = merchant_key;
            ctx.accounts.loyalty_card.customer = customer_key;
            ctx.accounts.loyalty_card.threshold = 100; // Example threshold value (adjust as needed)
            ctx.accounts.loyalty_card.refund_percentage = 15; // 15% refund

            // Initialize token metadata
            let token_metadata = DataV2 {
                name: "Loyalty Token".to_string(),
                symbol: "LOYAL".to_string(),
                uri: "https://example.com/metadata.json".to_string(),
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            };

            // Initialize and mint the token (passing individual accounts to avoid borrowing issues)
            init_token(
                &customer_key,
                &merchant_key,
                &ctx.accounts.metadata,
                &ctx.accounts.mint,
                &ctx.accounts.merchant,
                &ctx.accounts.system_program,
                &ctx.accounts.token_metadata_program,
                &ctx.accounts.rent,
                &ctx.bumps.mint,
                token_metadata,
            )?;
            
            mint_loyalty_token(
                &customer_key,
                &merchant_key,
                &ctx.accounts.mint,
                &ctx.accounts.token_destination,
                &ctx.accounts.token_program,
                &ctx.bumps.mint,
            )?;

            // Set the mint address in the loyalty card
            ctx.accounts.loyalty_card.mint_address = ctx.accounts.mint.key();
        } else {
            match (previous_points, ctx.accounts.loyalty_card.loyalty_points) {
                (prev, curr) if prev >= 100 && curr < 100 => {
                    msg!("Back to level Common");
                    update_nft_uri(
                        &ctx.accounts.metadata,
                        &ctx.accounts.mint,
                        METADATA_COMMON,
                        &ctx.accounts.token_metadata_program,
                        &ctx.accounts.merchant,
                        &ctx.bumps.mint,
                    )?;
                }
                (prev, curr) if prev <= 33 && curr > 33 => {
                    msg!("Upgrade to level Rare");
                    update_nft_uri(
                        &ctx.accounts.metadata,
                        &ctx.accounts.mint,
                        METADATA_RARE,
                        &ctx.accounts.token_metadata_program,
                        &ctx.accounts.merchant,
                        &ctx.bumps.mint,
                    )?;
                }
                (prev, curr) if prev <= 66 && curr > 66 => {
                    msg!("Upgrade to level Epic");
                    update_nft_uri(
                        &ctx.accounts.metadata,
                        &ctx.accounts.mint,
                        METADATA_EPIC,
                        &ctx.accounts.token_metadata_program,
                        &ctx.accounts.merchant,
                        &ctx.bumps.mint,
                    )?;
                }
                (prev, curr) if prev < 100 && curr >= 100 => {
                    msg!("Upgrade to level Legendary");
                    update_nft_uri(
                        &ctx.accounts.metadata,
                        &ctx.accounts.mint,
                        METADATA_LEGENDARY,
                        &ctx.accounts.token_metadata_program,
                        &ctx.accounts.merchant,
                        &ctx.bumps.mint,
                    )?;
                }
                _ => {}
            }

        }
        

        // Check if threshold is just reached or exceeded
        if previous_points >= ctx.accounts.loyalty_card.threshold 
            && ctx.accounts.loyalty_card.loyalty_points > previous_points
        {
            // Calculate refund (15% of the current payment amount)
            let refund = (amount as u128 * ctx.accounts.loyalty_card.refund_percentage as u128 / 100) as u64;
            msg!("Threshold reached: refunding {} USDC", refund);
            
            // Fixed decimal calculation
            let usdc_decimals = ctx.accounts.usdc_mint.decimals as u32;
            let refund_amount = refund
                .checked_mul(10u64.pow(usdc_decimals))
                .ok_or(ErrorCode::Overflow)?;

            // Perform USDC refund transfer
            let cpi_accounts = Transfer {
                from: ctx.accounts.merchant_usdc_ata.to_account_info(),
                to: ctx.accounts.customer_usdc_ata.to_account_info(),
                authority: ctx.accounts.merchant.to_account_info(),
            };

            let cpi_ctx =
                CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

            transfer(cpi_ctx, refund_amount)?;

            // Update loyalty points after refund --> set to 0
            ctx.accounts.loyalty_card.loyalty_points = ctx.accounts.loyalty_card
                .loyalty_points
                .checked_sub(ctx.accounts.loyalty_card.threshold)
                .ok_or(ErrorCode::Overflow)?;
        }

        msg!(
            "Loyalty card updated. New loyalty points: {}",
            ctx.accounts.loyalty_card.loyalty_points
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

// Helper function to initialize the token - restructured to avoid borrowing context
fn init_token<'info>(
    customer_key: &Pubkey,
    merchant_key: &Pubkey,
    metadata: &UncheckedAccount<'info>,
    mint: &InterfaceAccount<'info, Mint>,
    merchant: &Signer<'info>,
    system_program: &Program<'info, System>,
    token_metadata_program: &Program<'info, Metaplex>,
    rent: &Sysvar<'info, Rent>,
    bump: &u8,
    token_metadata: DataV2,
) -> Result<()> {
    let seeds = &[b"mint", customer_key.as_ref(), merchant_key.as_ref(), &[*bump]];
    let signer = &[&seeds[..]];

    let metadata_ctx = CpiContext::new_with_signer(
        token_metadata_program.to_account_info(),
        CreateMetadataAccountsV3 {
            metadata: metadata.to_account_info(),
            mint: mint.to_account_info(),
            mint_authority: mint.to_account_info(),
            payer: merchant.to_account_info(),
            update_authority: mint.to_account_info(),
            system_program: system_program.to_account_info(),
            rent: rent.to_account_info(),
        },
        signer,
    );

    create_metadata_accounts_v3(
        metadata_ctx,
        token_metadata,
        false,
        true,
        None,
    )?;

    msg!("Token metadata created successfully.");

    Ok(())
}

// Helper function to mint tokens to customer - restructured to avoid borrowing context
fn mint_loyalty_token<'info>(
    customer_key: &Pubkey,
    merchant_key: &Pubkey,
    mint: &InterfaceAccount<'info, Mint>,
    token_destination: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    bump: &u8,
) -> Result<()> {
    let seeds = &[b"mint", customer_key.as_ref(), merchant_key.as_ref(), &[*bump]];
    let signer = &[&seeds[..]];

    let mint_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        MintTo {
            mint: mint.to_account_info(),
            to: token_destination.to_account_info(),
            authority: mint.to_account_info(),
        },
        signer,
    );

    mint_to(mint_ctx, 1)?;
    msg!("Loyalty token minted successfully.");

    Ok(())
}

fn update_nft_uri<'info>(
    metadata: &UncheckedAccount<'info>,
    mint: &InterfaceAccount<'info, Mint>,
    new_uri: &str,
    token_metadata_program: &Program<'info, Metaplex>,
    merchant: &Signer<'info>,
    bump: &u8,
) -> Result<()> {
    let seeds = &[b"mint", merchant.key.as_ref(), &[*bump]];
    let signer = &[&seeds[..]];

    let update_ctx = CpiContext::new_with_signer(
        token_metadata_program.to_account_info(),
        UpdateMetadataAccountsV2 {
            metadata: metadata.to_account_info(),
            update_authority: mint.to_account_info(),
        },
        signer,
    );

    update_metadata_accounts_v2(
        update_ctx,
        Some(DataV2 {
            name: "Loyalty Token".to_string(),
            symbol: "LOYAL".to_string(),
            uri: new_uri.to_string(),
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        }),
        None,
        None,
    )?;

    msg!("Updated NFT metadata URI to: {}", new_uri);
    Ok(())
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

    #[account()]
    pub customer: SystemAccount<'info>,

    #[account(mut, signer)]
    pub merchant: Signer<'info>,

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
        payer = merchant,
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
        payer = merchant,
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
    pub customer: Signer<'info>,

    #[account(mut)]
    pub merchant: SystemAccount<'info>,

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

    #[msg("Only the merchant who owns this card can close it.")]
    Unauthorized,
}

pub mod constants {
    use super::*;
    pub const USDC_MINT: Pubkey = pubkey!("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
    pub const METADATA_COMMON: &str = "https://ipfs.io/ipfs/bafybeifr2u6mbkc5v7luqcg5a4gmn5fpch7klnphs42z4blu6w42p7cyj4/metadata_common.json";
    pub const METADATA_RARE: &str = "https://ipfs.io/ipfs/bafybeifr2u6mbkc5v7luqcg5a4gmn5fpch7klnphs42z4blu6w42p7cyj4/metadata_rare.json";
    pub const METADATA_EPIC: &str = "https://ipfs.io/ipfs/bafybeifr2u6mbkc5v7luqcg5a4gmn5fpch7klnphs42z4blu6w42p7cyj4/metadata_epic.json";
    pub const METADATA_LEGENDARY: &str = "https://ipfs.io/ipfs/bafybeifr2u6mbkc5v7luqcg5a4gmn5fpch7klnphs42z4blu6w42p7cyj4/metadata_legendary.json";
}


