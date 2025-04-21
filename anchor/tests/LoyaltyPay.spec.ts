import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LoyaltyProgram } from "../target/types/loyalty_program";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction
} from "@solana/spl-token";
import { BN } from "bn.js";
import bs58 from "bs58";
import { config } from 'dotenv';
config();

describe("Loyalty Program Tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  console.log(provider.connection.rpcEndpoint);
  anchor.setProvider(provider);

  const program = anchor.workspace.LoyaltyProgram as Program<LoyaltyProgram>;

  // Mock USDC mint for testing
  const USDC_MINT = new anchor.web3.PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");

  // Accounts
  const merchantSecretKey = process.env.MERCHANT_SECRET_KEY ?? '';
  const customerSecretKey = process.env.CUSTOMER_SECRET_KEY ?? '';
  const customer = anchor.web3.Keypair.fromSecretKey(bs58.decode(customerSecretKey));
  const merchant = anchor.web3.Keypair.fromSecretKey(bs58.decode(merchantSecretKey));

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

  // Instead of airdropping, transfer SOL from provider wallet to customer and merchant
  async function sendLamports(to: anchor.web3.PublicKey, amount: number) {
    const transaction = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: to,
        lamports: amount,
      })
    );

    await provider.sendAndConfirm(transaction);
  }

  // Function to send SPL tokens
  async function sendSplToken(
    tokenMint: anchor.web3.PublicKey,
    to: anchor.web3.PublicKey,
    amount: number,
    decimals: number = 6
  ) {
    // Get the associated token accounts
    const fromAta = await getAssociatedTokenAddress(
      tokenMint,
      provider.wallet.publicKey
    );

    // Create destination ATA if it doesn't exist
    let toAta = await getAssociatedTokenAddress(
      tokenMint,
      to
    );

    console.log("toAta:", toAta.toString());

    try {
      // Check if destination ATA exists
      const balance = await provider.connection.getTokenAccountBalance(toAta);
      console.log("balance:", balance);
    } catch (e) {
      // Create the ATA if it doesn't exist
      const createAtaIx = createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey, // payer
        toAta,
        to,
        tokenMint
      );
      const tx = new anchor.web3.Transaction().add(createAtaIx);
      await provider.sendAndConfirm(tx);
    }

    // Calculate amount with decimals
    const adjustedAmount = amount * Math.pow(10, decimals);

    // Create the transfer instruction
    const transferIx = createTransferInstruction(
      fromAta,
      toAta,
      provider.wallet.publicKey,
      adjustedAmount
    );

    // Send the transaction
    const transaction = new anchor.web3.Transaction().add(transferIx);
    await provider.sendAndConfirm(transaction);

    return toAta;
  }

  beforeAll(async () => {
    console.log("BeforeAll - Starting");
    // await sendLamports(customer.publicKey, 0.1 * anchor.web3.LAMPORTS_PER_SOL);
    // await sendLamports(merchant.publicKey, 0.1 * anchor.web3.LAMPORTS_PER_SOL);

    // Make sure your wallet has USDC tokens !
    customerUsdcAta = await getAssociatedTokenAddress(
      USDC_MINT,
      customer.publicKey
    );
    console.log("Customer PubKey:", customer.publicKey.toString());
    console.log("Customer USDC ATA:", customerUsdcAta.toString());
    console.log("customer USDC balance:", await provider.connection.getTokenAccountBalance(customerUsdcAta));

    merchantUsdcAta = await getAssociatedTokenAddress(
      USDC_MINT,
      merchant.publicKey
    );
    console.log("Merchant PubKey:", merchant.publicKey.toString());
    console.log("Merchant USDC ATA:", merchantUsdcAta.toString());
    console.log("merchant USDC balance:", await provider.connection.getTokenAccountBalance(merchantUsdcAta));

    // Find PDAs
    [loyaltyCardPda, loyaltyCardBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty"), customer.publicKey.toBuffer(), merchant.publicKey.toBuffer()],
      program.programId
    );
    console.log("loyaltyCardPda:", loyaltyCardPda.toString());

    [mintPda, mintBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), customer.publicKey.toBuffer(), merchant.publicKey.toBuffer()],
      program.programId
    );
    console.log("mintPda:", mintPda.toString());

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
  }, 60000);

  it("Initializes a new loyalty card with first payment", async () => {
    console.log("Starting test...");
    // Check the balance before
    const customerBalanceBefore = await provider.connection.getBalance(customer.publicKey);
    const merchantBalanceBefore = await provider.connection.getBalance(merchant.publicKey);
    console.log("Customer balance before:", customerBalanceBefore);
    console.log("Merchant balance before:", merchantBalanceBefore);

    const paymentAmount = new BN(1); // 10 USDC
    // Check if the account exists and is initialized
    const accountInfo = await provider.connection.getAccountInfo(customerUsdcAta);
    if (!accountInfo) {
      throw new Error("Customer USDC ATA is not initialized!");
    } else {
      console.log("Customer USDC ATA:", customerUsdcAta.toString());
    }

    try {
      await program.account.loyaltyCard.fetch(loyaltyCardPda);
      //  if test acounts have already a pda close it 
      await program.methods
        .closeLoyaltyCard()
        .accounts({
          customer: customer.publicKey,
          merchant: merchant.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          loyaltyCard: loyaltyCardPda,
        })
        .signers([customer])
        .rpc();

      // add delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e) {
      console.log("No loyalty card found, continuing...");
    }

    console.log("#2 processPayment");
    try {

      await program.methods
        .processPayment(paymentAmount)
        .accounts({
          merchant: merchant.publicKey,
          customer: customer.publicKey,
        })
        .signers([customer])
        .rpc();
    } catch (error) {
      console.log("Error:", error);
      throw error;
    }

    console.log("#3 processPayment done");
    // Fetch the loyalty card account and verify its data
    const loyaltyCard = await program.account.loyaltyCard.fetch(loyaltyCardPda);

    expect(loyaltyCard.merchant.toString()).toBe(merchant.publicKey.toString());
    expect(loyaltyCard.customer.toString()).toBe(customer.publicKey.toString());
    expect(loyaltyCard.loyaltyPoints.toNumber()).toBe(1);
    expect(loyaltyCard.threshold.toNumber()).toBe(100);
    expect(loyaltyCard.refundPercentage).toBe(15);
    expect(loyaltyCard.mintAddress.toString()).toBe(mintPda.toString());

    // Verify customer's NFT token account
    const tokenAccount = await provider.connection.getTokenAccountBalance(tokenDestination);
    expect(Number(tokenAccount.value.amount)).toBe(1);
  }, 60000);

  it("Updates loyalty card with additional payment", async () => {
    // add delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const paymentAmount = new BN(2); // 25 USDC

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
    expect(loyaltyCard.loyaltyPoints.toNumber()).toBe(3); // Previous 1 + new 2 = 3
  }, 60000);

  it("Updates NFT metadata when crossing tier threshold (Rare)", async () => {
    // add delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // We need to reach the Rare tier (>33 points)
    // We already have 35 points, but let's add some more to be sure
    const paymentAmount = new BN(35); // 5 USDC

    try {
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
      expect(loyaltyCard.loyaltyPoints.toNumber()).toBe(38); // Previous 35 + new 3 = 38
    } catch (error) {
      console.log("Error:", error);
      throw error;
    }

  }, 60000);

  it("Updates NFT metadata when crossing tier threshold (Epic)", async () => {
    // add delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // We need to reach the Epic tier (>66 points)
    const paymentAmount = new BN(32); // 32 USDC

    try {
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
      expect(loyaltyCard.loyaltyPoints.toNumber()).toBe(70); // Previous 38 + new 32 = 70
    } catch (error) {
      console.log("Error:", error);
      throw error;
    }
  }, 60000);

  it("Updates NFT metadata and provides refund when reaching Legendary status", async () => {
    // add delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // We need to reach the Legendary tier (>=100 points)
    const paymentAmount = new BN(40); // 40 USDC which should trigger the threshold

    try {
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

      // We need to reach the Legendary tier (>=100 points)

      // Check merchant USDC balance before
      const merchantBalanceBefore = await provider.connection.getTokenAccountBalance(merchantUsdcAta);
      console.log("balance before :", Number(merchantBalanceBefore.value.amount))
      const paymentAmountForRefund = new BN(10); // 10 USDC (1.5 refunded) because we are > 100 with previous amount, so this will be this tx that will be refunded
      const RealAmountTransferedToMerchant = paymentAmountForRefund.mul(new BN(10 ** (merchantBalanceBefore.value.decimals))).mul(new BN(85)).div(new BN(100));
      await program.methods
        .processPayment(paymentAmountForRefund)
        .accounts({
          merchant: merchant.publicKey,
          customer: customer.publicKey,
        })
        .signers([customer])
        .rpc();

      // Since now we're over the threshold, check that the refund worked
      // The merchant should receive 85% (100% - 15% refund) of the payment
      const merchantBalanceAfter = await provider.connection.getTokenAccountBalance(merchantUsdcAta);
      console.log("balance after :", Number(merchantBalanceAfter.value.amount))
      // Check that the merchant balance has increased by 85% of the payment
      const expectedMerchantBalance = new BN((merchantBalanceBefore.value.uiAmount || 0) * Math.pow(10, 6)).add(RealAmountTransferedToMerchant);
      expect(Number(merchantBalanceAfter.value.amount)).toEqual(Number(expectedMerchantBalance));
    } catch (error) {
      console.log("Error:", error);
      throw error;
    }
  }, 60000);

  it("Allows customer to close the loyalty card", async () => {
    // add delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Check the balance before closing to verify rent return
    const customerBalanceBefore = await provider.connection.getBalance(customer.publicKey);

    await program.methods
      .closeLoyaltyCard()
      .accounts({
        customer: customer.publicKey,
        merchant: merchant.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        loyaltyCard: loyaltyCardPda,
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
  }, 60000);
});