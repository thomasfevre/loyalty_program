"use client";

import { useEffect, useMemo, useState } from "react";

import { PublicKey as MetaplexPublicKey } from "@metaplex-foundation/umi";
import { useCluster } from "../cluster/cluster-data-access";
import { Cluster, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ExplorerLink } from "../cluster/cluster-ui";
import { AppHero, ellipsify } from "../ui/ui-layout";
import { AccountButtons } from "./account-ui";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import {
  deriveLoyaltyPDA,
  generateSolanaPayURL,
  waitForPayment,
} from "../LoyaltyPay/accountUtils/getPDAs";
import { useLoyaltyPayProgram } from "../LoyaltyPay/LoyaltyPay-data-access";
import {
  doesCustomerOwnMerchantAsset,
  mintCustomerNft,
} from "../metaplex/utils";
import { BN } from "bn.js";
import { USDC_MINT_ADDRESS } from "@project/anchor";

export default function MerchantAccountDetailFeature() {
  const wallet = useAnchorWallet();
  const { connected } = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState(1); // 1 USDC
  const [qrCode, setQRCode] = useState<string | null>(null);
  const { program } = useLoyaltyPayProgram();
  const { cluster } = useCluster();
  const [status, setStatus] = useState("Set the amount to be paid :");
  const [reference, setReference] = useState<PublicKey | null>(null);
  const params = useParams();

  const address = useMemo(() => {
    console.log("wallet address", wallet?.publicKey?.toString());
    console.log("program id ", program.programId.toString());
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

  const generatePaymentQR = () => {
    if (!wallet || !wallet.publicKey || !wallet.signTransaction) {
      toast.error(
        "Wallet not connected or does not support signing transactions."
      );
      return;
    }

    const referenceKey = new PublicKey(Keypair.generate().publicKey); // Unique reference
    setReference(referenceKey);

    const url = generateSolanaPayURL(
      wallet.publicKey,
      amount,
      referenceKey
    ).toString();
    setQRCode(url);
    setStatus("Scan the QR Code to pay.");
  };

  const processLoyaltyUpdate = async (payerPubKey: PublicKey) => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !payerPubKey
    ) {
      toast.error(
        "Wallet not connected or does not support signing transactions."
      );
      return;
    }
    console.log(
      "TODO Processing loyalty update...",
      wallet.publicKey.toString(),
      payerPubKey.toString()
    );

    try {
      // Check if the customer has a PDA with the merchant
      let loyaltyCardAccount;
      try {
        const customerPDA = deriveLoyaltyPDA(
          wallet.publicKey,
          payerPubKey,
          cluster.network as Cluster
        );
        loyaltyCardAccount = await program.account.loyaltyCard.fetch(
          customerPDA
        );
        console.log("Customer PDA: ", loyaltyCardAccount);
      } catch (err) {
        console.log("No loyalty card found for this customer", err);
      }

      // Check if the customer already own an NFT from the merchant
      const customerHasNft = await doesCustomerOwnMerchantAsset(
        payerPubKey.toString() as MetaplexPublicKey,
        wallet.publicKey.toString() as MetaplexPublicKey
      );
      console.log("Customer has nft?: ", customerHasNft);
      // If not, mint a new NFT
      if (!customerHasNft && !loyaltyCardAccount) {
        console.log("Minting NFT...");
        const { tx, mintPublicKey } = await mintCustomerNft(
          wallet,
          payerPubKey.toString()
        );
        if (!wallet.signTransaction) {
          throw new Error("Wallet does not support signTransaction");
        }
        const txSigned = await wallet.signTransaction(tx);
        console.log("tx Object: ", txSigned);
        const txHash = await connection?.sendRawTransaction(
          txSigned.serialize()
        );
        console.log("txHash: ", txHash);
        const latestBlockhash = await connection.getLatestBlockhash();
        const confirmationStrategy = {
          signature: txHash,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        };
        const confirmedTx = await connection?.confirmTransaction(
          confirmationStrategy,
          "confirmed"
        );
        if (!confirmedTx) {
          throw new Error("Transaction not confirmed");
        }
        console.log("Confirmed TX: ", confirmedTx);
        console.log("Minted NFT:", mintPublicKey);

        // Update the loyalty program
        const pgrmTx = await program.methods
          .processPayment(new BN(amount), new PublicKey(mintPublicKey))
          .accounts({
            customer: payerPubKey,
            merchant: wallet.publicKey,
          })
          .rpc();
        toast.success(`Loyalty updated! TX: ${pgrmTx}`);
        setStatus("Loyalty updated successfully!");
      } else {
        // If yes, upgrade the NFT

        // const update = await updateNft(1, wallet);
        console.log("Customer has NFT:", customerHasNft);
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
    if (!reference || !wallet) return;

    (async () => {
      try {
        if (status === "Scan the QR Code to pay.") {
          const signatureInfo = await waitForPayment(
            reference,
            connection,
            wallet.publicKey,
            amount
          );
          toast.success("Payment received! Updating loyalty points...");
          setStatus("Payment received! Updating blockchain...");
          processLoyaltyUpdate(signatureInfo);
        }
      } catch (error) {
        toast.error("Error detecting payment");
      }
    })();
  }, [reference, connection, amount, processLoyaltyUpdate]);

  if (!address) {
    return <div>Error loading account</div>;
  }
  return (
    <div>
      <AppHero
        title={<></>}
        subtitle={
          <div className="bg-blue-500 width-fit shadow-md rounded-lg p-6 mb-6">
            <p className="text-lg font-semibold mb-4">Merchant Wallet:</p>
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
      <div className="flex justify-center">
        <div className="">
          {wallet?.publicKey ? (
            <>
              <div className="my-4">
                <p className="text-lg mb-2">{status}</p>
                <label className="block text-sm font-medium  mb-1">
                  Amount (USDC):
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-fit px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={generatePaymentQR}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Generate Payment QR
              </button>
              {qrCode && (
                <div className="mt-6">
                  <QRCodeSVG value={qrCode} size={256} />
                </div>
              )}
            </>
          ) : (
            <p className="text-lg ">Please connect your wallet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
