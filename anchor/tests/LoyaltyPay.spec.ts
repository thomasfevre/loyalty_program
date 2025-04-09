import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LoyaltyProgram } from "../target/types/loyalty_program";
import { setupUSDC } from "./setup-usdc";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("loyalty-program", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.LoyaltyProgram as Program<LoyaltyProgram>;

  const customer = anchor.web3.Keypair.generate();
  const merchant = anchor.web3.Keypair.generate();
  console.log("customer:", customer.publicKey.toBase58());
  console.log("merchant:", merchant.publicKey.toBase58());

  // Variables to store USDC-related information
  let usdcMint: anchor.web3.PublicKey;
  let customerUsdcAta: anchor.web3.PublicKey;
  let merchantUsdcAta: anchor.web3.PublicKey;

  it("Funds customer & merchant and sets up USDC", async () => {
    // Airdrop SOL to customer and merchant
    const tx1 = await provider.connection.requestAirdrop(customer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    const tx2 = await provider.connection.requestAirdrop(merchant.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(tx1);
    await provider.connection.confirmTransaction(tx2);
    
    // Set up USDC token on localnet
    const usdcSetup = await setupUSDC(provider, customer, merchant);
    usdcMint = usdcSetup.usdcMint;
    customerUsdcAta = usdcSetup.customerTokenAccount.address;
    merchantUsdcAta = usdcSetup.merchantTokenAccount.address;
    
    console.log("USDC mint:", usdcMint.toBase58());
    console.log("Customer USDC ATA:", customerUsdcAta.toBase58());
    console.log("Merchant USDC ATA:", merchantUsdcAta.toBase58());
  });

  it("Processes a payment", async () => {
    const [loyaltyCardPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty"), customer.publicKey.toBuffer(), merchant.publicKey.toBuffer()],
      program.programId
    );
    console.log("loyaltyCardPDA:", loyaltyCardPDA.toBase58());
    console.log("customer balance:", (await provider.connection.getBalance(customer.publicKey)).toString());

    await program.methods.processPayment(new anchor.BN(50), usdcMint)
      .accounts({
        customer: customer.publicKey,
        merchant: merchant.publicKey,
        merchantUsdcAta: merchantUsdcAta,
        customerUsdcAta: customerUsdcAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .signers([merchant])
      .rpc();

    const loyaltyCard = await program.account.loyaltyCard.fetch(loyaltyCardPDA);
    console.log("Loyalty Points:", loyaltyCard.loyaltyPoints.toString());
  });

  it("Reaches the treshold", async () => {
    const [loyaltyCardPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty"), customer.publicKey.toBuffer(), merchant.publicKey.toBuffer()],
      program.programId
    );
    console.log("loyaltyCardPDA:", loyaltyCardPDA.toBase58());

    await program.methods.processPayment(new anchor.BN(51), usdcMint)
      .accounts({
        customer: customer.publicKey,
        merchant: merchant.publicKey,
        merchantUsdcAta: merchantUsdcAta,
        customerUsdcAta: customerUsdcAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .signers([merchant])
      .rpc();

    const loyaltyCard = await program.account.loyaltyCard.fetch(loyaltyCardPDA);
    console.log("Loyalty Points:", loyaltyCard.loyaltyPoints.toString());
    console.log("Final customer balance:", (await provider.connection.getBalance(customer.publicKey)).toString());
  });

  it("Closes loyalty card", async () => {
    // Make sure the loyalty PDA is already initialized
    const [loyaltyPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("loyalty"),
        customer.publicKey.toBuffer(),
        merchant.publicKey.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .closeLoyaltyCard()
      .accounts({
        loyaltyCard: loyaltyPda,
        customer: customer.publicKey,
        merchant: merchant.publicKey,
      })
      .signers([customer]) // make sure the customer is signing, as they are signer in context
      .rpc();

    console.log("Closed loyalty card with tx:", tx);
  });

});
