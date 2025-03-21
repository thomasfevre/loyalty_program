'use client' 
import { useState, useEffect } from "react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import {QRCodeSVG} from 'qrcode.react';
import { generateSolanaPayURL, waitForPayment, getProvider, getProgram, PROGRAM_ID, deriveLoyaltyPDA } from "../program/solana";
import toast from "react-hot-toast";
import { BN } from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { doesCustomerOwnMerchantAsset, getCustomerAssets } from "../services/metaplex/utils";
import { mintAndTransferCustomerNft } from "../services/metaplex/mint";
import { updateNft } from "../services/metaplex/update";

const MerchantPage: React.FC = () => {
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

    try {
      
      // Check if the customer already own an NFT from the merchant
      const customerNft = await doesCustomerOwnMerchantAsset(payerPubKey);
      console.log("Customer nft ?: ", customerNft);
      // If not, mint a new NFT
      if (customerNft === null) {
        const mintAddress = await mintAndTransferCustomerNft(wallet, payerPubKey.toString());
        console.log("Minted NFT:", mintAddress);
        const tx = await program.methods.processPayment(new BN(amount), mintAddress).accounts({
          customer: wallet.publicKey,
          merchant: wallet.publicKey,
        }).rpc();
        toast.success(`Loyalty updated! TX: ${tx}`);
        setStatus("Loyalty updated successfully!");

      } else {
        // If yes, upgrade the NFT

        // const update = await updateNft(1, customerNft., wallet);
        console.log("Updated NFT:", customerNft);
      }
    
      // else upgrade the nft uri a new reward tier is reached
      // Get the loyalty card PDA
      // const loyaltyCardPDA = deriveLoyaltyPDA(wallet.publicKey, payerPubKey);
      // const loyaltyCard = await program.account.loyaltyCard.fetch(loyaltyCardPDA);

      
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
};
export default MerchantPage;