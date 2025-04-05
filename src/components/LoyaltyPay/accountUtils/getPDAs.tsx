"use client";

import { getLoyaltyPayProgramId } from "@project/anchor";
import { encodeURL, findReference, validateTransfer } from "@solana/pay";
import {
  Cluster,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { BigNumber } from "bignumber.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

/**
 * Derive the Associated Token Account (ATA) address
 * for a given wallet and token mint.
 */
export const getAssociatedTokenAddress = (
  wallet: PublicKey,
  mint: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      wallet.toBuffer(),                       // Owner of the ATA
      TOKEN_PROGRAM_ID.toBuffer(),             // Token program
      mint.toBuffer(),                         // Mint address
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID                // Program that owns all ATAs
  )[0];
};

export const deriveLoyaltyPDA = (
  customer: PublicKey,
  merchant: PublicKey,
  network: Cluster
) => {
  const programId = getLoyaltyPayProgramId(network);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("loyalty"), customer.toBytes(), merchant.toBytes()],
    programId
  )[0];
};

export const waitForPayment = async (
  reference: PublicKey,
  connection: Connection,
  merchantPubKey: PublicKey,
  amount: number
) => {
  const start = Date.now();
  while (Date.now() - start < 60000) {
    try {
      console.log("Checking for payment...");
      const signatureInfo = await findReference(connection, reference, {
        finality: "finalized",
      });
      console.log("Payment detected:", signatureInfo);
      console.log({ amount });
      const validateTransferTX = await validateTransfer(
        connection,
        signatureInfo.signature,
        {
          recipient: merchantPubKey,
          amount: new BigNumber(amount),
          reference: [reference],
        }
      );
      console.log("Validating transfer...", validateTransferTX);
      // Get the pubkey of the payer
      const message = validateTransferTX.transaction.message;
      const payer = message.accountKeys[0];
      const feePayerAddress = payer.toString();
      console.log("Payer address:", feePayerAddress);
      return payer;
    } catch (error) {
      // Wait for 1 second before checking again.
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  throw new Error("Payment not detected within the timeout period.");
};

export const generateSolanaPayURL = (
  merchant: PublicKey,
  amount: number,
  reference: PublicKey
) => {
  const usdcMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");

return encodeURL({
  recipient: merchant,
  amount: new BigNumber(amount),
  splToken: usdcMint,
  reference,
  label: "My Shop",
  message: "Thanks for your purchase!",
});
};
