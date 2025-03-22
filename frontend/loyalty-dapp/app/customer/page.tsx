'use client'
import React, { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import toast from "react-hot-toast";
import { getProgram, deriveLoyaltyPDA } from "../program/solana";
import '@solana/wallet-adapter-react-ui/styles.css'; // Import the CSS for the wallet adapter

const CustomerPage: React.FC = () => {
  const wallet = useWallet();
  const [merchantPubKey, setMerchantPubKey] = useState<string>("");
  const [loyaltyCard, setLoyaltyCard] = useState<any>(null);

  const fetchLoyaltyCard = async () => {
    if (!wallet.publicKey) {
      toast.error("Connect your wallet first.");
      return;
    }

    try {
      const merchantKey = new PublicKey(merchantPubKey);
      const program = getProgram(wallet);
      const loyaltyPDA = deriveLoyaltyPDA(wallet.publicKey, merchantKey);

      const loyaltyCardAccount = await program.account.loyaltyCard.fetch(loyaltyPDA);
      setLoyaltyCard(loyaltyCardAccount);
      toast.success("Loyalty card fetched successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch loyalty card.");
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>Customer Loyalty Program</h1>
      <WalletMultiButton />
      {wallet.publicKey ? (
        <>
          <div>
            <label>Merchant Public Key: </label>
            <input
              type="text"
              value={merchantPubKey}
              onChange={(e) => setMerchantPubKey(e.target.value)}
            />
          </div>
          <button onClick={fetchLoyaltyCard}>Fetch Loyalty Card</button>
          {loyaltyCard && (
            <div style={{ marginTop: "2rem" }}>
              <h2>Loyalty Card Details</h2>
              <p>Merchant: {loyaltyCard.merchant.toString()}</p>
              <p>Customer: {loyaltyCard.customer.toString()}</p>
              <p>Loyalty Points: {loyaltyCard.loyaltyPoints.toString()}</p>
              <p>Threshold: {loyaltyCard.threshold.toString()}</p>
              <p>Refund Percentage: {loyaltyCard.refundPercentage.toString()}%</p>
            </div>
          )}
        </>
      ) : (
        <p>Please connect your wallet.</p>
      )}
    </div>
  );
};

export default CustomerPage;