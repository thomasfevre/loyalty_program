'use client'
import { useState, useEffect } from "react";
import { PublicKey, Connection, SystemProgram, Keypair } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { QRCodeSVG } from 'qrcode.react';
import { generateSolanaPayURL, waitForPayment, getProgram } from "./utils/solana";
import toast from "react-hot-toast";
import '@solana/wallet-adapter-react-ui/styles.css'; // Import the CSS for the wallet adapter

export default function Home() {
  const wallet = useWallet();
  const [amount, setAmount] = useState(1000000); // 0.001 SOL in lamports
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [status, setStatus] = useState("Awaiting payment...");
  const [reference, setReference] = useState<PublicKey | null>(null);
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

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

  useEffect(() => {
    if (!reference) return;

    (async () => {
      try {
        await waitForPayment(reference, connection);
        toast.success("Payment received! Updating loyalty points...");
        setStatus("Payment received! Updating blockchain...");
        processLoyaltyUpdate();
      } catch (error) {
        toast.error("Error detecting payment");
      }
    })();
  }, [reference]);

  const processLoyaltyUpdate = async () => {
    if (!wallet.publicKey) return;
    const program = getProgram(wallet);

    const [loyaltyPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty"), wallet.publicKey.toBuffer()],
      program.programId
    );

    try {
      const tx = await program.methods
        .processPayment(amount)
        .accounts({
          loyaltyCard: loyaltyPDA,
          customer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success(`Loyalty updated! TX: ${tx}`);
      setStatus("Loyalty updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update loyalty program");
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Solana Loyalty Program</h1>
      <p>{status}</p>
      <WalletMultiButton />
      {wallet.publicKey ? (
        <>
          <div>
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
