import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LoyaltyProgram } from "../target/types/loyalty_program";

describe("loyalty-program", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.LoyaltyProgram as Program<LoyaltyProgram>;

  const customer = anchor.web3.Keypair.generate();
  const merchant = anchor.web3.Keypair.generate();

  it("Funds customer & merchant", async () => {
    const tx1 = await provider.connection.requestAirdrop(customer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    const tx2 = await provider.connection.requestAirdrop(merchant.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(tx1);
    await provider.connection.confirmTransaction(tx2);
  });

  it("Processes a payment", async () => {
    const [loyaltyCardPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty"), customer.publicKey.toBuffer(), merchant.publicKey.toBuffer()],
      program.programId
    );

    await program.methods.processPayment(new anchor.BN(50))
      .accounts({
        customer: customer.publicKey,
        merchant: merchant.publicKey,
      })
      .signers([merchant])
      .rpc();

    const loyaltyCard = await program.account.loyaltyCard.fetch(loyaltyCardPDA);
    console.log("Loyalty Points:", loyaltyCard.loyaltyPoints.toString());
  });
});
