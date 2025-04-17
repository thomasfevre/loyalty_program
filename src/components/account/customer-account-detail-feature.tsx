"use client";

import {
  PublicKey as MetaplexPublicKey,
  publicKey as umiPublicKey,
} from "@metaplex-foundation/umi";
import { PublicKey } from "@solana/web3.js";
import React, { useEffect, useMemo, useState } from "react";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";

import { useParams } from "next/navigation";
import { Cluster } from "@solana/web3.js";
import { useCluster } from "../cluster/cluster-data-access";

import { ExplorerLink } from "../cluster/cluster-ui";
import { AppHero, ellipsify } from "../ui/ui-layout";
import {
  AccountButtons,
  AccountTokens,
  AccountTransactions,
} from "./account-ui";
import { toast } from "../ui/custom-toast";
import { useLoyaltyPayProgram } from "../LoyaltyPay/LoyaltyPay-data-access";
import { deriveLoyaltyPDA } from "../LoyaltyPay/accountUtils/getPDAs";
import {
  doesCustomerOwnMerchantAsset,
  fetchNftWithMintAddressAsync,
} from "../metaplex/utils";
import axios from "axios";
import Image from "next/image";
import { BN } from "@coral-xyz/anchor";

export default function CustomerAccountDetailFeature() {
  const [loyaltyCards, setLoyaltyCards] = useState<
    {
      merchant: PublicKey;
      customer: PublicKey;
      loyaltyPoints: BN;
      threshold: BN;
      refundPercentage: number;
      mintAddress: PublicKey;
      nftMetadata: any;
    }[]
  >([]);
  const params = useParams();
  const { cluster } = useCluster();
  const { program, closeLoyaltyCard } = useLoyaltyPayProgram();
  const { connected } = useWallet();
  const wallet = useAnchorWallet();

  const address = useMemo(() => {
    console.log("wallet address", wallet?.publicKey?.toString());
    if (!params.address) {
      return;
    }
    try {
      const paramAddress = new PublicKey(params.address);
      if (wallet?.publicKey) {
        return wallet.publicKey;
      }
      return new PublicKey(paramAddress);
    } catch (e) {
      console.log(`Invalid public key`, e);
    }
  }, [params, connected]);

  const fetchLoyaltyCard = async () => {
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }
    try {
      const cards = await program.account.loyaltyCard.all([]);
      console.log({ cards });

      // Nft
      const loyaltyCards = [];
      for (const card of cards) {
        const { mintAddress, customer, merchant } = card.account;
        console.log("customer: ", customer.toString());
        console.log("merchant: ", merchant.toString());
        if (customer.toString() !== address.toString()) continue;
        if (card.publicKey) {
          const customerHasNft = await doesCustomerOwnMerchantAsset(
            umiPublicKey(card.account.mintAddress),
            umiPublicKey(card.account.merchant)
          );
          console.log("Customer has NFT: ", customerHasNft);
          const customerNft = await fetchNftWithMintAddressAsync(
            mintAddress.toString() as MetaplexPublicKey
          );
          console.log("Customer nft ?: ", customerNft);
          // get the metadata of the NFT (fetch from customerNft.uri)
          if (customerNft?.uri) {
            try {
              const response = await axios.get(customerNft.uri, {
                headers: { Accept: "application/json" },
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
              const loyaltyCard = {
                ...card.account,
                nftMetadata: parsedMetadata,
              };
              loyaltyCards.push(loyaltyCard);
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
      }
      setLoyaltyCards(loyaltyCards);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch loyalty card.");
    }
  };

  useEffect(() => {
    fetchLoyaltyCard();
  }, [address]);

  if (!address) {
    return <div>Error loading account</div>;
  }

  return (
    <div className="space-y-8">
      <AppHero
        title={
          <span className="text-3xl font-bold text-white">
            Customer Dashboard
          </span>
        }
        subtitle={
          <div className="bg-gradient-to-r from-indigo-600/90 to-indigo-700/90 rounded-lg p-6 mt-4 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-lg font-semibold mb-2 text-indigo-100">
                Your Wallet:
              </p>
              <div className="flex items-center gap-2">
                <div className="bg-white/20 rounded-md px-3 py-1">
                  <ExplorerLink
                    path={`account/${address}`}
                    label={ellipsify(address.toString())}
                    className="text-white hover:text-indigo-200 transition-colors"
                  />
                </div>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(address.toString())
                  }
                  className="text-indigo-200 hover:text-white"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
            </div>
            <div>
              <AccountButtons address={address} />
            </div>
          </div>
        }
        size="lg"
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Loyalty Cards</h2>
          <button
            onClick={fetchLoyaltyCard}
            className="mt-4 md:mt-0 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 py-2 rounded-md shadow-md transition-all flex items-center gap-2"
          >
            <span>🔄</span>
            <span>Fetch Loyalty Cards</span>
          </button>
        </div>

        {loyaltyCards.length === 0 ? (
          <div className="text-center py-12 bg-indigo-50 dark:bg-gray-700/20 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You don&apos;t have any loyalty cards yet.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Make purchases with merchants that use LoyaltyPay to earn loyalty
              rewards.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {loyaltyCards.map(
              ({
                nftMetadata: nft,
                customer,
                loyaltyPoints,
                merchant,
                mintAddress,
                refundPercentage,
                threshold,
              }) => (
                <div
                  className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-lg overflow-hidden relative"
                  key={merchant.toString()}
                >
                  <div className="absolute top-0 right-0 p-4">
                    <button
                      onClick={() =>
                        closeLoyaltyCard.mutate({ customer, merchant })
                      }
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-1"
                    >
                      <span>Close Card</span>
                    </button>
                  </div>

                  <div className="p-6 flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/3 flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-30"></div>
                        <Image
                          src={nft.image}
                          width={500}
                          height={500}
                          alt="NFT"
                          className="relative w-64 h-auto rounded-xl shadow-xl"
                        />
                      </div>
                      <div className="mt-4 text-center">
                        <p className="text-xl font-bold text-indigo-800 dark:text-indigo-300">
                          {nft.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {nft.symbol}
                        </p>
                        <div className="mt-2 inline-block bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                          <p className="text-indigo-800 dark:text-indigo-300 font-medium">
                            Level:{" "}
                            <span className="font-bold">
                              {nft.attributes[0].value}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="md:w-2/3">
                      <h2 className="text-2xl font-bold mb-4 text-indigo-800 dark:text-indigo-300">
                        Loyalty Card Details
                      </h2>

                      <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Merchant
                            </p>
                            <p className="font-mono text-sm">
                              <ExplorerLink
                                path={`account/${merchant.toString()}`}
                                label={ellipsify(merchant.toString(), 8, 8)}
                              />
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Mint Address
                            </p>
                            <p className="font-mono text-sm">
                              <ExplorerLink
                                path={`account/${mintAddress.toString()}`}
                                label={ellipsify(mintAddress.toString(), 8, 8)}
                              />
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Loyalty Points
                          </p>
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {loyaltyPoints.toString()}
                          </p>
                        </div>
                        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Threshold
                          </p>
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {threshold.toString()}
                          </p>
                        </div>
                        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Refund Percentage
                          </p>
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {refundPercentage.toString()}%
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">💡</span>
                          <p className="text-sm text-indigo-800 dark:text-indigo-300">
                            Make {threshold.sub(loyaltyPoints).toString()} more
                            purchases to reach your next reward!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <AccountTokens address={address} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <AccountTransactions address={address} />
        </div>
      </div>
    </div>
  );
}
