"use client";

import { PublicKey as MetaplexPublicKey } from "@metaplex-foundation/umi";
import { PublicKey } from "@solana/web3.js";
import { useMemo, useState } from "react";

import { useParams } from "next/navigation";

import { ExplorerLink } from "../cluster/cluster-ui";
import { AppHero, ellipsify } from "../ui/ui-layout";
import {
  AccountButtons,
  AccountTokens,
  AccountTransactions,
} from "./account-ui";
import toast from "react-hot-toast";
import { useLoyaltyPayProgram } from "../LoyaltyPay/LoyaltyPay-data-access";
import { deriveLoyaltyPDA } from "../LoyaltyPay/accountUtils/getPDAs";
import { fetchNftWithMintAddress } from "../metaplex/utils";

export default function CustomerAccountDetailFeature() {
  const [merchantPubKey, setMerchantPubKey] = useState<string>("");
  const [loyaltyCard, setLoyaltyCard] = useState<any>(null);
  const [nft, setNft] = useState<any>(null);
  const params = useParams();
  const { program } = useLoyaltyPayProgram();
  const address = useMemo(() => {
    if (!params.address) {
      return;
    }
    try {
      return new PublicKey(params.address);
    } catch (e) {
      console.log(`Invalid public key`, e);
    }
  }, [params]);
  if (!address) {
    return <div>Error loading account</div>;
  }

  const fetchLoyaltyCard = async () => {
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }

    try {
      // Program
      const merchantKey = new PublicKey(merchantPubKey);
      const loyaltyPDA = deriveLoyaltyPDA(address, merchantKey);

      const loyaltyCardAccount = await program.account.loyaltyCard.fetch(
        loyaltyPDA
      );
      setLoyaltyCard(loyaltyCardAccount);
      toast.success("Loyalty card fetched successfully!");

      // Nft
      if (loyaltyCardAccount.mintAddress) {
        const { data: customerNft, error } = await fetchNftWithMintAddress(
          loyaltyCardAccount.mintAddress.toString() as MetaplexPublicKey
        );

        console.log("Customer nft ?: ", customerNft);
        // get the metadata of the NFT (fetch from customerNft.uri)
        if (customerNft?.uri) {
          try {
            const response = await fetch(customerNft.uri, {
              headers: { Accept: "application/json" },
            });
            const data = await response.json();
            console.log("Raw response:", data);
            console.log("Response type:", typeof data);

            // Ensure it's a string before parsing
            let metadataString = data;

            // Convert to valid JSON format (fixing single quotes, backticks, and property labels)
            metadataString = metadataString
              .replace(/`/g, '"') // Replace backticks with double quotes
              .replace(/'/g, '"') // Replace single quotes with double quotes
              .replace(/(\b(?!https)\w+)\s*:/g, '"$1":'); // Replace property labels to be in valid JSON format, including cases with spaces before the colon

            console.log("Metadata string:", metadataString);
            const parsedMetadata = JSON.parse(metadataString);
            setNft(parsedMetadata);

            console.log("Parsed metadata:", parsedMetadata);
            console.log("NFT Name:", parsedMetadata.attributes[0].value); // Example: Access the 'Reward Tier' attribute
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
    <div>
      <AppHero
        title={<></>}
        subtitle={
          <div className="bg-green-500 width-fit shadow-md rounded-lg p-6 mb-6">
            <p className="text-lg font-semibold mb-4">Customer Wallet:</p>
            <div className="my-4">
              <ExplorerLink
                path={`account/${address}`}
                label={ellipsify(address.toString())}
              />
            </div>
          </div>
        }
      >
        <div className="my-4">
          <AccountButtons address={address} />
        </div>
      </AppHero>
      <div className="space-y-8">
        <div className="">
          <div className="mt-6">
            <label className="block text-lg font-medium mb-2">
              Merchant Public Key:
            </label>
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
          <div className="">
            {loyaltyCard && (
              <div className="mt-8">
                <h1 className="text-2xl font-semibold mb-4">
                  Loyalty Card Details
                </h1>
                <p className="text-lg">
                  Merchant: {loyaltyCard.merchant.toString()}
                </p>
                <p className="text-lg">
                  Customer: {loyaltyCard.customer.toString()}
                </p>
                <p className="text-lg">
                  Loyalty Points: {loyaltyCard.loyaltyPoints.toString()}
                </p>
                <p className="text-lg">
                  Threshold: {loyaltyCard.threshold.toString()}
                </p>
                <p className="text-lg">
                  Refund Percentage: {loyaltyCard.refundPercentage.toString()}%
                </p>
                <p className="text-lg">
                  Mint Address: {loyaltyCard.mintAddress.toString()}
                </p>
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
                  Current Reward Level:{" "}
                  <strong>{nft.attributes[0].value}</strong>
                </p>
                <img
                  src={nft.image}
                  alt="NFT"
                  className="w-48 h-auto mt-4 rounded-md shadow-md"
                />
              </div>
            )}
          </div>
        </div>
        <AccountTokens address={address} />
        <AccountTransactions address={address} />
      </div>
    </div>
  );
}
