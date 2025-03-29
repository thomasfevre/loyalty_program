'use client'
import React, { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import toast from "react-hot-toast";
import { getProgram, deriveLoyaltyPDA } from "../services/solana";
import '@solana/wallet-adapter-react-ui/styles.css'; // Import the CSS for the wallet adapter
import { fetchNftWithMintAddress } from "../services/metaplex/utils";
import { set } from "@metaplex-foundation/umi/serializers";
const axios = require('axios');

const CustomerPage: React.FC = () => {
  const wallet = useWallet();
  const [merchantPubKey, setMerchantPubKey] = useState<string>("");
  const [loyaltyCard, setLoyaltyCard] = useState<any>(null);
  const [nft, setNft] = useState<any>(null);

  const fetchLoyaltyCard = async () => {
    if (!wallet.publicKey) {
      toast.error("Connect your wallet first.");
      return;
    }

    try {
      // Program
      const merchantKey = new PublicKey(merchantPubKey);
      const program = getProgram(wallet);
      const loyaltyPDA = deriveLoyaltyPDA(wallet.publicKey, merchantKey);

      const loyaltyCardAccount = await program.account.loyaltyCard.fetch(loyaltyPDA);
      setLoyaltyCard(loyaltyCardAccount);
      toast.success("Loyalty card fetched successfully!");

      // Nft
      if (loyaltyCardAccount.mintAddress) {
        const customerNft = await fetchNftWithMintAddress(loyaltyCardAccount.mintAddress);
        console.log("Customer nft ?: ", customerNft);
        // get the metadata of the NFT (fetch from customerNft.uri)
        if (customerNft?.uri) {
          try {
            const response = await axios.get(customerNft.uri, {
              headers: { "Accept": "application/json" }
            });
            console.log("Raw response:", response.data);
            console.log("Response type:", typeof response.data);

            // Ensure it's a string before parsing
            let metadataString = response.data;
           
            // Convert to valid JSON format (fixing single quotes, backticks, and property labels)
            metadataString = metadataString
              .replace(/`/g, '"') // Replace backticks with double quotes
              .replace(/'/g, '"') // Replace single quotes with double quotes
              .replace(/(\b(?!https)\w+)\s*:/g, '"$1":'); // Replace property labels to be in valid JSON format, including cases with spaces before the colon

            console.log("Metadata string:", metadataString);
            const parsedMetadata = JSON.parse(metadataString);
            setNft(parsedMetadata);

            console.log("Parsed metadata:", parsedMetadata);
            console.log("NFT Name:", parsedMetadata.attributes[0].value);  // Example: Access the 'Reward Tier' attribute
          } catch (error) {
            console.error("Failed to fetch or parse NFT metadata:", error);
            toast.error("Failed to parse NFT metadata.");
          }
        } else {
          console.error("Invalid NFT URI:", customerNft?.uri);
          toast.error("Failed to fetch NFT metadata. Invalid URI.");
        }
      }

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
              <h1  style={{ fontSize: "2em", marginBottom: "2vh"}}>Loyalty Card Details</h1>
              <p>Merchant: {loyaltyCard.merchant.toString()}</p>
              <p>Customer: {loyaltyCard.customer.toString()}</p>
              <p>Loyalty Points: {loyaltyCard.loyaltyPoints.toString()}</p>
              <p>Threshold: {loyaltyCard.threshold.toString()}</p>
              <p>Refund Percentage: {loyaltyCard.refundPercentage.toString()}%</p>
              <p>Mint Address: {loyaltyCard.mintAddress.toString()}</p>
            </div>
          )}

          {nft && (
            <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <h1 style={{ fontSize: "2em", marginBottom: "2vh"}}>NFT Details</h1>
              <p>Name: <strong>{nft.name}</strong></p>
              <p>Symbol: {nft.symbol}</p>
              <p>Current Reward Level: <strong>{nft.attributes[0].value}</strong></p>
              <img src={nft.image} alt="NFT" style={{ width: "200px" }} />
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