'use client' 
import { useState, useEffect } from "react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import {QRCodeSVG} from 'qrcode.react';
import { generateSolanaPayURL, waitForPayment, getProvider, getProgram, PROGRAM_ID } from "./utils/solana";
import toast from "react-hot-toast";
import { BN } from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Home() {
  const wallet = useWallet();
  const [amount, setAmount] = useState(1000000); // 0.001 SOL in lamports
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [status, setStatus] = useState("Set the amount to be paid :");
  const [reference, setReference] = useState<PublicKey | null>(null);
  const connection = getProvider(wallet).connection;

  const generatePaymentQR = () => {
    if (!wallet.publicKey) {
      toast.error("Wallet not connected");
      return;
    }

    const referenceKey = new PublicKey(Keypair.generate().publicKey); // Unique reference
    setReference(referenceKey);

    const url = generateSolanaPayURL(wallet.publicKey, amount, referenceKey).toString();
    setQRCode(url);
    setStatus("Scan the QR Code to pay.");
  };

  const processLoyaltyUpdate = async (payerPubKey: PublicKey) => {
    if (!wallet.publicKey || !payerPubKey) return;
    console.log("TODO Processing loyalty update...", wallet.publicKey, payerPubKey);
    const program = getProgram(wallet);

    const [loyaltyPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty"), payerPubKey.toBuffer(), wallet.publicKey.toBuffer()],
      PROGRAM_ID
    );

    try {
      const tx = await program.methods.processPayment(new BN(amount)).accounts({
        customer: wallet.publicKey,
        merchant: wallet.publicKey,
      }).rpc();

      toast.success(`Loyalty updated! TX: ${tx}`);
      setStatus("Loyalty updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update loyalty program");
    }
  };

  useEffect(() => {
    if (!reference) return;

    (async () => {
      try {
        const signatureInfo = await waitForPayment(reference, connection, wallet.publicKey!, amount);
        toast.success("Payment received! Updating loyalty points...");
        setStatus("Payment received! Updating blockchain...");
        processLoyaltyUpdate(signatureInfo);
      } catch (error) {
        toast.error("Error detecting payment");
      }
    })();
  }, [reference, connection, wallet.publicKey, amount, processLoyaltyUpdate]);

 

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Solana Loyalty Program</h1>
      
      <WalletMultiButton />
      {wallet.publicKey ? (
        <>
          <div>
          <p>{status}</p>
            <label>Amount (lamports): </label>
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <button onClick={generatePaymentQR}>Generate Payment QR</button>
          {qrCode && <QRCodeSVG value={qrCode} size={256} />}
        </>
      ) : (
        <p>Please connect your wallet.</p>
      )}
    </div>
  );
}
