"use client";

import { PublicKey as MetaplexPublicKey, publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { PublicKey } from "@solana/web3.js";
import { useMemo, useState } from "react";
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
import toast from "react-hot-toast";
import { useLoyaltyPayProgram } from "../LoyaltyPay/LoyaltyPay-data-access";
import { deriveLoyaltyPDA } from "../LoyaltyPay/accountUtils/getPDAs";
import { doesCustomerOwnMerchantAsset, fetchNftWithMintAddressAsync } from "../metaplex/utils";
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
  const { program } = useLoyaltyPayProgram();
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
  if (!address) {
    return <div>Error loading account</div>;
  }

  const fetchLoyaltyCard = async () => {
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }
    try {
      const cards = await program.account.loyaltyCard.all([
        // {
        //   memcmp: {
        //     offset: 8,
        //     bytes: address.toBase58(),
        //   },
        // },
      ]);
      console.log({ cards });

      // Nft
      const loyaltyCards = [];
      for (const card of cards) {
        const { mintAddress, customer } = card.account;
      
        if (customer.toString() !== address.toString()) continue;
        if (card.publicKey) {
          const customerHasNft = await doesCustomerOwnMerchantAsset(umiPublicKey(card.account.mintAddress), umiPublicKey(card.account.merchant));
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

  const closeLoyaltyCard = async (merchantPubKey: PublicKey) => {
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }
    try {
      const loyaltyPDA = deriveLoyaltyPDA(
        address,
        new PublicKey(merchantPubKey),
        cluster.network as Cluster
      );
      await program.methods
        .closeLoyaltyCard()
        .accounts({ loyaltyCard:loyaltyPDA, address, merchantPubKey })
        .rpc();
      toast.success("Loyalty card closed successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to close loyalty card.");
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
          <div className="flex flex-col items-center mt-4">
            <button
              onClick={fetchLoyaltyCard}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Fetch Loyalty Cards
            </button>
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
                  className="mt-8 bg-blue-500 shadow-md rounded-lg p-6 relative"
                  key={merchant.toString()}
                >
                  <button
                    onClick={() => closeLoyaltyCard(merchant)}
                    className="absolute top-2 right-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                  >
                    Close Loyalty Card
                  </button>
                  <div>
                    <h1 className="text-2xl font-semibold mb-4">
                      Loyalty Card Details
                    </h1>
                    <p className="text-lg">Merchant: {merchant.toString()}</p>
                    <p className="text-lg">Customer: {customer.toString()}</p>
                    <p className="text-lg">
                      Loyalty Points: {loyaltyPoints.toString()}
                    </p>
                    <p className="text-lg">Threshold: {threshold.toString()}</p>
                    <p className="text-lg">
                      Refund Percentage: {refundPercentage.toString()}%
                    </p>
                    <p className="text-lg">
                      Mint Address: {mintAddress.toString()}
                    </p>
                  </div>
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
                    <Image
                      src={nft.image}
                      width={500}
                      height={500}
                      alt="NFT"
                      className="w-48 h-auto mt-4 rounded-md shadow-md"
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <AccountTokens address={address} />
        <AccountTransactions address={address} />
      </div>
    </div>
  );
}
