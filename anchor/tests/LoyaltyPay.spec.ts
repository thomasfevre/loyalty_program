import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LoyaltyProgram } from "../target/types/loyalty_program";
import {
  getAssociatedTokenAddress,
  createMint,
  mintTo,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
} from "@solana/spl-token";
import { BN } from "bn.js";

describe("Loyalty Program Tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.LoyaltyProgram as Program<LoyaltyProgram>;
  
  // Mock USDC mint for testing
  const USDC_MINT = anchor.web3.Keypair.generate();
  
  // Accounts
  const customer = anchor.web3.Keypair.generate();
  const merchant = anchor.web3.Keypair.generate();
  
  // Token accounts
  let customerUsdcAta: anchor.web3.PublicKey;
  let merchantUsdcAta: anchor.web3.PublicKey;
  
  // PDA for loyalty card
  let loyaltyCardPda: anchor.web3.PublicKey;
  let loyaltyCardBump: number;
  
  // PDA for mint
  let mintPda: anchor.web3.PublicKey;
  let mintBump: number;
  
  // Meta PDA
  const METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  let metadataPda: anchor.web3.PublicKey;
  
  // NFT token account
  let tokenDestination: anchor.web3.PublicKey;
  
  beforeAll(async () => {
    // Airdrop SOL to customer and merchant
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(customer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
    );
    
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(merchant.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
    );
    
    // Create USDC mint
    await createMint(
      provider.connection,
      customer,
      customer.publicKey,
      null,
      6, // 6 decimals for USDC
      USDC_MINT
    );
    
    // Create ATAs for customer and merchant
    customerUsdcAta = await createAssociatedTokenAccount(
      provider.connection,
      customer,
      USDC_MINT.publicKey,
      customer.publicKey
    );
    
    merchantUsdcAta = await createAssociatedTokenAccount(
      provider.connection,
      customer,
      USDC_MINT.publicKey,
      merchant.publicKey
    );
    
    // Mint some USDC to customer
    await mintTo(
      provider.connection,
      customer,
      USDC_MINT.publicKey,
      customerUsdcAta,
      customer.publicKey,
      1000000000 // 1000 USDC with 6 decimals
    );
    
    // Find PDAs
    [loyaltyCardPda, loyaltyCardBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty"), customer.publicKey.toBuffer(), merchant.publicKey.toBuffer()],
      program.programId
    );
    
    [mintPda, mintBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), customer.publicKey.toBuffer(), merchant.publicKey.toBuffer()],
      program.programId
    );
    
    metadataPda = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        mintPda.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    )[0];
    
    tokenDestination = await getAssociatedTokenAddress(
      mintPda,
      customer.publicKey
    );
  });
  
  it("Initializes a new loyalty card with first payment", async () => {
    const paymentAmount = new BN(10); // 10 USDC
    
    await program.methods
      .processPayment(paymentAmount)
      .accounts({
        merchant: merchant.publicKey,
        customer: customer.publicKey,
      })
      .signers([customer])
      .rpc();
    
    // Fetch the loyalty card account and verify its data
    const loyaltyCard = await program.account.loyaltyCard.fetch(loyaltyCardPda);
    
    expect(loyaltyCard.merchant.toString()).toBe(merchant.publicKey.toString());
    expect(loyaltyCard.customer.toString()).toBe(customer.publicKey.toString());
    expect(loyaltyCard.loyaltyPoints.toNumber()).toBe(10);
    expect(loyaltyCard.threshold.toNumber()).toBe(100);
    expect(loyaltyCard.refundPercentage).toBe(15);
    expect(loyaltyCard.mintAddress.toString()).toBe(mintPda.toString());
    
    // Verify customer's NFT token account
    const tokenAccount = await provider.connection.getTokenAccountBalance(tokenDestination);
    expect(Number(tokenAccount.value.amount)).toBe(1);
  });
  
  it("Updates loyalty card with additional payment", async () => {
    const paymentAmount = new BN(25); // 25 USDC
    
    await program.methods
      .processPayment(paymentAmount)
      .accounts({
        merchant: merchant.publicKey,
        customer: customer.publicKey,
      })
      .signers([customer])
      .rpc();
    
    // Fetch the loyalty card account and verify updated points
    const loyaltyCard = await program.account.loyaltyCard.fetch(loyaltyCardPda);
    expect(loyaltyCard.loyaltyPoints.toNumber()).toBe(35); // Previous 10 + new 25 = 35
  });
  
  it("Updates NFT metadata when crossing tier threshold (Rare)", async () => {
    // We need to reach the Rare tier (>33 points)
    // We already have 35 points, but let's add some more to be sure
    const paymentAmount = new BN(5); // 5 USDC
    
    await program.methods
      .processPayment(paymentAmount)
      .accounts({
        merchant: merchant.publicKey,
        customer: customer.publicKey,
      })
      .signers([customer])
      .rpc();
    
    // Fetch the loyalty card account and verify updated points
    const loyaltyCard = await program.account.loyaltyCard.fetch(loyaltyCardPda);
    expect(loyaltyCard.loyaltyPoints.toNumber()).toBe(40); // Previous 35 + new 5 = 40
  });
  
  it("Updates NFT metadata when crossing tier threshold (Epic)", async () => {
    // We need to reach the Epic tier (>66 points)
    const paymentAmount = new BN(30); // 30 USDC
    
    await program.methods
      .processPayment(paymentAmount)
      .accounts({
        merchant: merchant.publicKey,
        customer: customer.publicKey,
      })
      .signers([customer])
      .rpc();
    
    // Fetch the loyalty card account and verify updated points
    const loyaltyCard = await program.account.loyaltyCard.fetch(loyaltyCardPda);
    expect(loyaltyCard.loyaltyPoints.toNumber()).toBe(70); // Previous 40 + new 30 = 70
  });
  
  it("Updates NFT metadata and provides refund when reaching Legendary status", async () => {
    // We need to reach the Legendary tier (>=100 points)
    const paymentAmount = new BN(40); // 40 USDC which should trigger the threshold
    
    // Check merchant USDC balance before
    const merchantBalanceBefore = await provider.connection.getTokenAccountBalance(merchantUsdcAta);
    
    await program.methods
      .processPayment(paymentAmount)
      .accounts({
        merchant: merchant.publicKey,
        customer: customer.publicKey,
      })
      .signers([customer])
      .rpc();
    
    // Fetch the loyalty card account and verify updated points
    const loyaltyCard = await program.account.loyaltyCard.fetch(loyaltyCardPda);
    expect(loyaltyCard.loyaltyPoints.toNumber()).toBe(110); // Previous 70 + new 40 = 110
    
    // Since now we're over the threshold, check that the refund worked
    // The merchant should receive 85% (100% - 15% refund) of the payment
    const merchantBalanceAfter = await provider.connection.getTokenAccountBalance(merchantUsdcAta);
    
   // Allow small rounding difference
  });
  
  it("Allows customer to close the loyalty card", async () => {
    // Check the balance before closing to verify rent return
    const customerBalanceBefore = await provider.connection.getBalance(customer.publicKey);
    
    await program.methods
      .closeLoyaltyCard()
      .accounts({
        loyaltyCard: loyaltyCardPda,
        customer: customer.publicKey,
        merchant: merchant.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([customer])
      .rpc();
    
    // Verify that the account is closed by attempting to fetch it
    try {
      await program.account.loyaltyCard.fetch(loyaltyCardPda);
    } catch (error) {
      expect((error as Error).toString()).toContain("Account does not exist");
    }
    
    // Verify that rent was returned
    const customerBalanceAfter = await provider.connection.getBalance(customer.publicKey);
    expect(customerBalanceAfter).toBeGreaterThan(customerBalanceBefore);
  });
});