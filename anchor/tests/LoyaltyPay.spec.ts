import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LoyaltyProgram } from "../target/types/loyalty_program";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createMint,
  createAssociatedTokenAccountInstruction,
  mintTo,
  getAccount,
  Account,
} from "@solana/spl-token";
import { BN } from "bn.js";

// Utiliser l'ID Metaplex Core cloné dans Anchor.toml
const MPL_CORE_ID = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

describe("loyalty_program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.LoyaltyProgram as Program<LoyaltyProgram>;
  const connection = provider.connection;

  const merchant = Keypair.generate();
  const customer = Keypair.generate();
  const mintAuthority = Keypair.generate();

  let usdcMint: PublicKey;
  let merchantUsdcAta: PublicKey;
  let customerUsdcAta: PublicKey;
  let loyaltyCardPda: PublicKey;
  let loyaltyCardBump: number;
  let nftAssetPda: PublicKey;
  let nftAssetBump: number;

  const airdrop = async (account: PublicKey, amount = 2 * LAMPORTS_PER_SOL) => {
    const sig = await connection.requestAirdrop(account, amount);
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: sig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }, "confirmed");
    console.log(`Airdropped ${amount / LAMPORTS_PER_SOL} SOL to ${account.toBase58()}`);
  };

  const getTokenBalance = async (tokenAccount: PublicKey): Promise<bigint> => {
    try {
      const accountInfo = await getAccount(connection, tokenAccount);
      return accountInfo.amount;
    } catch (e: any) {
      if (e.name === 'TokenAccountNotFoundError' || e.message?.includes("could not find account")) {
        return BigInt(0);
      }
      console.error(`Error fetching token balance for ${tokenAccount.toBase58()}:`, e);
      throw e;
    }
  };

  // Jest uses beforeAll instead of before
  beforeAll(async () => {
    await airdrop(merchant.publicKey);
    await airdrop(customer.publicKey);
    await airdrop(mintAuthority.publicKey);

    console.log(`Merchant: ${merchant.publicKey.toBase58()}`);
    console.log(`Customer: ${customer.publicKey.toBase58()}`);

    // @ts-ignore
    usdcMint = await createMint(connection, provider.wallet.payer, mintAuthority.publicKey, null, 6);
    console.log(`Mock USDC Mint créé: ${usdcMint.toBase58()}`);

    [loyaltyCardPda, loyaltyCardBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty"), customer.publicKey.toBuffer(), merchant.publicKey.toBuffer()], program.programId);
    console.log(`LoyaltyCard PDA: ${loyaltyCardPda.toBase58()}`);

    [nftAssetPda, nftAssetBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft"), customer.publicKey.toBuffer(), merchant.publicKey.toBuffer()], program.programId);
    console.log(`NFT Asset PDA: ${nftAssetPda.toBase58()}`);

    merchantUsdcAta = getAssociatedTokenAddressSync(usdcMint, merchant.publicKey);
    customerUsdcAta = getAssociatedTokenAddressSync(usdcMint, customer.publicKey);
    console.log(`Merchant USDC ATA: ${merchantUsdcAta.toBase58()}`);
    console.log(`Customer USDC ATA: ${customerUsdcAta.toBase58()}`);

    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(provider.wallet.publicKey, customerUsdcAta, customer.publicKey, usdcMint),
      createAssociatedTokenAccountInstruction(provider.wallet.publicKey, merchantUsdcAta, merchant.publicKey, usdcMint)
    );
    await provider.sendAndConfirm(tx, [], { skipPreflight: false, commitment: "confirmed" });
    console.log("ATAs créés");

    const mintAmount = new BN(1000 * 10 ** 6);
    // @ts-ignore
    await mintTo(connection, provider.wallet.payer, usdcMint, customerUsdcAta, mintAuthority, BigInt(mintAmount.toString()));
    console.log(`Minted ${mintAmount.div(new BN(10 ** 6)).toString()} mock USDC to Customer ATA`);

    const initialCustomerBalance = await getTokenBalance(customerUsdcAta);
    // Using Jest expect instead of Chai assert
    expect(initialCustomerBalance.toString()).toBe(mintAmount.toString());
  });

  test("Initialise la carte de fidélité et traite le premier paiement", async () => {
    const paymentAmount = new BN(50 * 10 ** 6);

    const customerBalanceBefore = await getTokenBalance(customerUsdcAta);
    const merchantBalanceBefore = await getTokenBalance(merchantUsdcAta);

    await program.methods
      .processPayment(paymentAmount, usdcMint)
      .accounts({
        customer: customer.publicKey,
        merchant: merchant.publicKey,
      })
      .signers([customer])
      .rpc({ skipPreflight: true });

    // --- Assertions with Jest ---
    const loyaltyCardAccount = await program.account.loyaltyCard.fetch(loyaltyCardPda);
    expect(loyaltyCardAccount.merchant.equals(merchant.publicKey)).toBeTruthy();
    expect(loyaltyCardAccount.customer.equals(customer.publicKey)).toBeTruthy();
    expect(loyaltyCardAccount.loyaltyPoints.toString()).toBe(paymentAmount.toString());
    expect(loyaltyCardAccount.threshold.toString()).toBe("100");
    expect(loyaltyCardAccount.refundPercentage).toBe(15);
    expect(loyaltyCardAccount.mintAddress.equals(usdcMint)).toBeTruthy();

    const customerBalanceAfter = await getTokenBalance(customerUsdcAta);
    const merchantBalanceAfter = await getTokenBalance(merchantUsdcAta);

    expect((customerBalanceBefore - customerBalanceAfter).toString()).toBe(paymentAmount.toString());
    expect((merchantBalanceAfter - merchantBalanceBefore).toString()).toBe(paymentAmount.toString());

    const nftAssetInfo = await connection.getAccountInfo(nftAssetPda);
    expect(nftAssetInfo).toBeTruthy();
    expect(nftAssetInfo?.owner.equals(MPL_CORE_ID)).toBeTruthy();
  });

  test("Met à jour la carte de fidélité avec un paiement supplémentaire", async () => {
    const additionalPaymentAmount = new BN(75 * 10 ** 6);
    const initialPoints = new BN(50 * 10 ** 6);
    const expectedTotalPoints = initialPoints.add(additionalPaymentAmount);

    const customerBalanceBefore = await getTokenBalance(customerUsdcAta);
    const merchantBalanceBefore = await getTokenBalance(merchantUsdcAta);

    await program.methods
      .processPayment(additionalPaymentAmount, usdcMint)
      .accounts({
        customer: customer.publicKey,
        merchant: merchant.publicKey,
      })
      .signers([customer])
      .rpc({ skipPreflight: true });

    // --- Assertions with Jest ---
    const loyaltyCardAccount = await program.account.loyaltyCard.fetch(loyaltyCardPda);
    expect(loyaltyCardAccount.loyaltyPoints.toString()).toBe(expectedTotalPoints.toString());

    const customerBalanceAfter = await getTokenBalance(customerUsdcAta);
    const merchantBalanceAfter = await getTokenBalance(merchantUsdcAta);
    expect((customerBalanceBefore - customerBalanceAfter).toString()).toBe(additionalPaymentAmount.toString());
    expect((merchantBalanceAfter - merchantBalanceBefore).toString()).toBe(additionalPaymentAmount.toString());

    const nftAssetInfo = await connection.getAccountInfo(nftAssetPda);
    expect(nftAssetInfo).toBeTruthy();
  });

  test("Ferme la carte de fidélité et rembourse le loyer au marchand", async () => {
    const merchantSolBalanceBefore = await connection.getBalance(merchant.publicKey);

    await program.methods
      .closeLoyaltyCard()
      .accounts({
        loyaltyCard: loyaltyCardPda,
        customer: customer.publicKey,
        merchant: merchant.publicKey,
      })
      .signers([customer])
      .rpc();

    // --- Assertions with Jest ---
    // Vérifier que fetch échoue (l'account n'existe plus)
    await expect(
      program.account.loyaltyCard.fetch(loyaltyCardPda)
    ).rejects.toThrow();

    const merchantSolBalanceAfter = await connection.getBalance(merchant.publicKey);
    expect(merchantSolBalanceAfter).toBeGreaterThan(merchantSolBalanceBefore);
    console.log(`Solde Merchant Avant: ${merchantSolBalanceBefore}, Après: ${merchantSolBalanceAfter}`);
  });

  test("Ne doit pas permettre de fermer la carte par un tiers", async () => {
    // Setup: Recréer une carte
    const anotherCustomer = Keypair.generate();
    await airdrop(anotherCustomer.publicKey);
    const [newCardPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty"), anotherCustomer.publicKey.toBuffer(), merchant.publicKey.toBuffer()], program.programId);
    const anotherCustomerUsdcAta = getAssociatedTokenAddressSync(usdcMint, anotherCustomer.publicKey);

    const tx = new Transaction().add(createAssociatedTokenAccountInstruction(provider.wallet.publicKey, anotherCustomerUsdcAta, anotherCustomer.publicKey, usdcMint));
    await provider.sendAndConfirm(tx);
    // @ts-ignore
    await mintTo(connection, provider.wallet.payer, usdcMint, anotherCustomerUsdcAta, mintAuthority, BigInt(10 * 10 ** 6));

    await program.methods
      .processPayment(new BN(10 * 10 ** 6), usdcMint)
      .accounts({
        customer: anotherCustomer.publicKey,
        merchant: merchant.publicKey,
      })
      .signers([anotherCustomer])
      .rpc({ skipPreflight: true });

    // Tentative de fermeture par le tiers (wrong customer)
    await expect(
      program.methods
        .closeLoyaltyCard()
        .accounts({
          loyaltyCard: newCardPda,
          customer: anotherCustomer.publicKey, // Le vrai client associé
          merchant: merchant.publicKey,
        })
        .signers([customer]) // <<< Tiers signataire non autorisé par has_one=customer
        .rpc()
    ).rejects.toThrow();

    // Nettoyage: Fermeture correcte par le client
    await program.methods
      .closeLoyaltyCard()
      .accounts({ loyaltyCard: newCardPda, customer: anotherCustomer.publicKey, merchant: merchant.publicKey })
      .signers([anotherCustomer])
      .rpc();
  });
});