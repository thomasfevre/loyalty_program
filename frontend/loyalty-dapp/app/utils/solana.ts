'use client' 
import { PublicKey, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { encodeURL, findReference, validateTransfer } from "@solana/pay";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import BigNumber from "bignumber.js";
import loyalty_program from "./loyalty_program.json"; // Ensure IDL is in place
import {LoyaltyProgram} from "./loyalty_program"
import { WalletContextState } from "@solana/wallet-adapter-react";

export const PROGRAM_ID = new PublicKey("4TuyQzPMELkUEmsqg1K5yxTyrzXpekDXw6HZnDZTRhxi");
export const NETWORK = process.env.NEXT_PUBLIC_RPC_URL; 
console.log("Network:", NETWORK);
export const connection = new Connection(NETWORK!, "confirmed");
let provider: AnchorProvider | null = null;

export const getProvider = (wallet: WalletContextState) => {
  if (!provider) {
    const compatibleWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction!,
      signAllTransactions: wallet.signAllTransactions!,
    } as Wallet;
    provider = new AnchorProvider(connection, compatibleWallet, {});
  }
  return provider;
};

export const getProgram = (wallet:WalletContextState )  => {
  return new Program<LoyaltyProgram>(loyalty_program, getProvider(wallet));
}

export const generateSolanaPayURL = (merchant: PublicKey, amount: number, reference: PublicKey) => {
  return encodeURL({
    recipient: merchant,
    amount: new BigNumber(amount / LAMPORTS_PER_SOL), // Convert to SOL
    reference: [reference], // Used to track payment
    label: "Solana Merchant",
    message: "Loyalty Payment",
  });
};

export const waitForPayment = async (reference: PublicKey, connection: Connection, merchantPubKey: PublicKey, amount: number) => {
  const start = Date.now();
  while (Date.now() - start < 30000) {
    try {
      console.log("Checking for payment...");
      const signatureInfo = await findReference(connection, reference, { finality: "confirmed" });
      console.log("Payment detected:", signatureInfo);
      const validateTransferTX = await validateTransfer(connection, signatureInfo.signature, {
        recipient: merchantPubKey,
        amount: new BN(amount / LAMPORTS_PER_SOL),
        reference: [reference],
      });
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

export const deriveLoyaltyPDA = (customer: PublicKey, merchant: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("loyalty"), customer.toBuffer(), merchant.toBuffer()],
    PROGRAM_ID
  )[0];
};
