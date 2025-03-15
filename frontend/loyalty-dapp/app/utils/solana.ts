import { PublicKey, Transaction, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { encodeURL, findReference, validateTransfer } from "@solana/pay";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import BigNumber from "bignumber.js";
import idl from "./idl.json"; // Ensure IDL is in place

const PROGRAM_ID = new PublicKey("4TuyQzPMELkUEmsqg1K5yxTyrzXpekDXw6HZnDZTRhxi");
const NETWORK = "https://api.devnet.solana.com"; // Change to mainnet-beta if needed

export const getProvider = (wallet: any) => {
  const connection = new Connection(NETWORK, "confirmed");
  return new AnchorProvider(connection, wallet, {});
};

export const getProgram = (wallet: any) => {
  const provider = getProvider(wallet);
  return new Program(idl, provider);
};

export const generateSolanaPayURL = (merchant: PublicKey, amount: number, reference: PublicKey) => {
  return encodeURL({
    recipient: merchant,
    amount: new BigNumber(amount / LAMPORTS_PER_SOL), // Convert to SOL
    reference: [reference], // Used to track payment
    label: "Solana Merchant",
    message: "Loyalty Payment",
  });
};

export const waitForPayment = async (reference: PublicKey, connection: Connection, RecipientPublicKey: PublicKey, amount: number) => {
  console.log("Waiting for payment...");
  const signatureInfo = await findReference(connection, reference, { finality: "confirmed" });
  return validateTransfer(connection, signatureInfo.signature, {
    recipient: RecipientPublicKey, // Replace with actual recipient public key
    amount: new BigNumber(amount), // Replace with actual amount and convert to BigNumber
    reference: [reference] // Use the reference passed to the function
  });
};
