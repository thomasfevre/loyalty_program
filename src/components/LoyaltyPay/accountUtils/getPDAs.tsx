"use client";

import { getLoyaltyPayProgramId, USDC_MINT_ADDRESS } from "@project/anchor";
import {
  createQR,
  encodeURL,
  findReference,
  validateTransfer,
  ValidateTransferError,
} from "@solana/pay";
import {
  Cluster,
  ConfirmedSignatureInfo,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { BigNumber } from "bignumber.js";
import {
  decodeInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

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

      // Get the right reference array from the transaction
      const referenceArray = await handlePaymentReferences(
        connection,
        signatureInfo,
        reference
      );
      console.log("Reference array:", referenceArray);

      const validateTransferTX = await validateTransfer(
        connection,
        signatureInfo.signature,
        {
          recipient: merchantPubKey,
          amount: new BigNumber(amount),
          reference: referenceArray,
          splToken: USDC_MINT_ADDRESS,
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
      if (!`${error}`.includes("FindReferenceError: not found"))
        console.log(error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error("Payment not detected within the timeout period.");
};

const handlePaymentReferences = async (
  connection: Connection,
  signatureInfo: ConfirmedSignatureInfo,
  reference: PublicKey
) => {
  const response = await connection.getTransaction(signatureInfo.signature, {
    commitment: "finalized",
  });
  if (!response?.transaction) {
    throw new Error("Transaction response is undefined.");
  }
  const { message: testmessage, signatures } = response.transaction;
  const transaction = Transaction.populate(testmessage, signatures);
  const instructions = transaction.instructions.slice();
  const instruction = instructions.pop();
  const decodedInstruction = decodeInstruction(instruction!);
  const extraKeys = decodedInstruction.keys;
  console.log("Decoded instruction:", decodedInstruction);
  console.log("Extra keys:", extraKeys);
  // log the extraKeys.multiSsigners
  if ("multiSigners" in extraKeys) {
    extraKeys.multiSigners.forEach((key) => {
      console.log(
        "Key:",
        key.pubkey.toString(),
        "isSigner:",
        key.isSigner,
        "isWritable:",
        key.isWritable
      );
    });
    return extraKeys.multiSigners.map((key) => key.pubkey);
  } else {
    console.log("No multiSigners found in extraKeys.");
    return [reference];
  }
};

export const generateSolanaPayURL = (
  merchant: PublicKey,
  amount: number,
  reference: PublicKey
) => {
  const usdcMint = new PublicKey(
    "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
  );

  return encodeURL({
    recipient: merchant,
    amount: new BigNumber(amount),
    splToken: usdcMint,
    reference,
    label: "My Shop",
    message: "Thanks for your purchase!",
  });
};
