"use client";

import { useCluster } from "@/components/cluster/cluster-data-access";
import { getLoyaltyPayProgramId } from "@project/anchor";
import { encodeURL, findReference, validateTransfer } from "@solana/pay";
import {
  Cluster,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { BigNumber } from "bignumber.js";

export const deriveLoyaltyPDA = (customer: PublicKey, merchant: PublicKey, network: Cluster) => {
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
  while (Date.now() - start < 30000) {
    try {
      console.log("Checking for payment...");
      const signatureInfo = await findReference(connection, reference, {
        finality: "confirmed",
      });
      console.log("Payment detected:", signatureInfo);
      const validateTransferTX = await validateTransfer(
        connection,
        signatureInfo.signature,
        {
          recipient: merchantPubKey,
          amount: new BigNumber(amount / LAMPORTS_PER_SOL),
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("Payment not detected within the timeout period.");
};

export const generateSolanaPayURL = (
  merchant: PublicKey,
  amount: number,
  reference: PublicKey
) => {
  return encodeURL({
    recipient: merchant,
    amount: new BigNumber(amount / LAMPORTS_PER_SOL), // Convert to SOL
    reference: [reference], // Used to track payment
    label: "Solana Merchant",
    message: "Loyalty Payment",
  });
};
