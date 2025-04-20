use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{
        update_metadata_accounts_v2,create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
        UpdateMetadataAccountsV2,CreateMetadataAccountsV3, Metadata as Metaplex,
    },
    token::{mint_to, MintTo, Token, TokenAccount},
    token_interface::Mint,
};

use crate::errors::ErrorCode;

// Helper function to initialize the token metadata
pub fn init_token<'info>(
    customer_key: &Pubkey,
    merchant_key: &Pubkey,
    metadata: &UncheckedAccount<'info>,
    mint: &InterfaceAccount<'info, Mint>,
    customer: &Signer<'info>,
    system_program: &Program<'info, System>,
    token_metadata_program: &Program<'info, Metaplex>,
    rent: &Sysvar<'info, Rent>,
    bump: &u8,
    metadata_uri: &str,
) -> Result<()> {
    let token_metadata = DataV2 {
        name: "Loyalty Card NFT - COMMON".to_string(),
        symbol: "BAGUETTE".to_string(),
        uri: metadata_uri.to_string(),
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    let seeds = &[
        b"mint",
        customer_key.as_ref(),
        merchant_key.as_ref(),
        &[*bump],
    ];
    let signer = &[&seeds[..]];

    let metadata_ctx = CpiContext::new_with_signer(
        token_metadata_program.to_account_info(),
        CreateMetadataAccountsV3 {
            metadata: metadata.to_account_info(),
            mint: mint.to_account_info(),
            mint_authority: mint.to_account_info(),
            payer: customer.to_account_info(),
            update_authority: customer.to_account_info(),
            system_program: system_program.to_account_info(),
            rent: rent.to_account_info(),
        },
        signer
    );

    create_metadata_accounts_v3(metadata_ctx, token_metadata, true, true, None)?;

    msg!("Token metadata created successfully.");

    Ok(())
}

// Helper function to mint tokens to customer
pub fn mint_loyalty_token<'info>(
    customer_key: &Pubkey,
    customer: &Signer<'info>,
    merchant_key: &Pubkey,
    mint: &InterfaceAccount<'info, Mint>,
    token_destination: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    bump: &u8,
) -> Result<()> {
    let seeds = &[
        b"mint",
        customer_key.as_ref(),
        merchant_key.as_ref(),
        &[*bump],
    ];
    let signer = &[&seeds[..]];

    // Verify the token destination is owned by the customer
    if token_destination.owner != customer.key() {
        return Err(ErrorCode::ConstraintTokenOwner.into());
    }

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

pub fn update_nft_uri<'info>(
    metadata: &UncheckedAccount<'info>,
    new_uri: &str,
    token_metadata_program: &Program<'info, Metaplex>,
    customer_key: &Pubkey,
    merchant_key: &Pubkey,
    customer: &Signer<'info>,
    bump: &u8,
) -> Result<()> {
    let seeds = &[
        b"mint",
        customer_key.as_ref(),
        merchant_key.as_ref(),
        &[*bump],
    ];
    let signer = &[&seeds[..]];

    let update_ctx = CpiContext::new_with_signer(
        token_metadata_program.to_account_info(),
        UpdateMetadataAccountsV2 {
            metadata: metadata.to_account_info(),
            update_authority: customer.to_account_info(),
        },
        signer,
    );

    update_metadata_accounts_v2(
        update_ctx,
        None,
        Some(DataV2 {
            name: "Loyalty Card NFT".to_string(),
            symbol: "BAGUETTE".to_string(),
            uri: new_uri.to_string(),
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        }),
        None,
        Some(true),
    )?;

    msg!("Updated NFT metadata URI to: {}", new_uri);
    Ok(())
} 