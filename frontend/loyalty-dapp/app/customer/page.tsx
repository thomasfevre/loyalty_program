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
    <div className="flex flex-col items-center text-center p-8">
      <button
        onClick={() => window.location.href = "/"}
        className="self-start mb-4 text-indigo-600 flex items-center"
      >
        <span className="mr-2">←</span> Go Back to Homepage
      </button>
      <h1 className="text-3xl font-bold mb-6">Customer Loyalty Program</h1>
      <div className="bg-green-500 width-fit shadow-md rounded-lg p-6 mb-6">
        <p className="text-lg font-semibold mb-4">Customer Wallet:</p>
        <WalletMultiButton className="w-full" />
      </div>
      {wallet.publicKey ? (
        <>
          <div className="mt-6">
            <label className="block text-lg font-medium mb-2">Merchant Public Key:</label>
            <input
              type="text"
              value={merchantPubKey}
              onChange={(e) => setMerchantPubKey(e.target.value)}
              className="border border-gray-300 rounded-md p-2 w-full max-w-md"
            />
          </div>
          <button
            onClick={fetchLoyaltyCard}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Fetch Loyalty Card
          </button>
          {loyaltyCard && (
            <div className="mt-8">
              <h1 className="text-2xl font-semibold mb-4">Loyalty Card Details</h1>
              <p className="text-lg">Merchant: {loyaltyCard.merchant.toString()}</p>
              <p className="text-lg">Customer: {loyaltyCard.customer.toString()}</p>
              <p className="text-lg">Loyalty Points: {loyaltyCard.loyaltyPoints.toString()}</p>
              <p className="text-lg">Threshold: {loyaltyCard.threshold.toString()}</p>
              <p className="text-lg">Refund Percentage: {loyaltyCard.refundPercentage.toString()}%</p>
              <p className="text-lg">Mint Address: {loyaltyCard.mintAddress.toString()}</p>
            </div>
          )}

          {nft && (
            <div className="mt-8 flex flex-col items-center">
              <h1 className="text-2xl font-semibold mb-4">NFT Details</h1>
              <p className="text-lg">
                Name: <strong>{nft.name}</strong>
              </p>
              <p className="text-lg">Symbol: {nft.symbol}</p>
              <p className="text-lg">
                Current Reward Level: <strong>{nft.attributes[0].value}</strong>
              </p>
              <img
                src={nft.image}
                alt="NFT"
                className="w-48 h-auto mt-4 rounded-md shadow-md"
              />
            </div>
          )}
        </>
      ) : (
        <p className="mt-6 text-lg">Please connect your wallet.</p>
      )}
    </div>
  );
};

export default CustomerPage;