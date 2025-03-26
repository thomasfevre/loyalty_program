'use client'
import React, { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import toast from "react-hot-toast";
import { getProgram, deriveLoyaltyPDA } from "../services/solana";
import '@solana/wallet-adapter-react-ui/styles.css'; // Import the CSS for the wallet adapter
import { fetchNftWithMintAddress } from "../services/metaplex/utils";
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
          const response = await axios.get(customerNft.uri);
          let metadata = response.data;

          // Check if metadata is a string and parse it
        let parsedMetadata;
        if (typeof metadata === "string") {
          // Remove special characters from the metadata string
          
          metadata = metadata.replace(/[^\x20-\x7E]/g, ""); // Removes non-ASCII characters
          
          try {
            parsedMetadata = JSON.parse(metadata);
          } catch (error) {
            console.error("Failed to parse metadata:", error);
            toast.error("Failed to parse NFT metadata.");
            return;
          }
        } else {
          parsedMetadata = metadata;
        }

        console.log("Parsed metadata:", parsedMetadata);
        setNft(parsedMetadata);
          console.log("NFT fetched successfully!", nft);
          toast.success("NFT fetched successfully!");
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
              <h2>Loyalty Card Details</h2>
              <p>Merchant: {loyaltyCard.merchant.toString()}</p>
              <p>Customer: {loyaltyCard.customer.toString()}</p>
              <p>Loyalty Points: {loyaltyCard.loyaltyPoints.toString()}</p>
              <p>Threshold: {loyaltyCard.threshold.toString()}</p>
              <p>Refund Percentage: {loyaltyCard.refundPercentage.toString()}%</p>
              <p>Mint Address: {loyaltyCard.mintAddress.toString()}</p>
            </div>
          )}

          {nft && (
            <div style={{ marginTop: "2rem" }}>
              <h2>NFT Details</h2>
              <p>Name: {nft.name}</p>
              <p>Symbol: {nft.symbol}</p>
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