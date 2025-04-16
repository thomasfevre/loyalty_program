"use client";

import { useMemo, useState, useEffect } from "react";

import { useCluster } from "../cluster/cluster-data-access";
import { ExplorerLink } from "../cluster/cluster-ui";
import { AppHero, ellipsify } from "../ui/ui-layout";
import { AccountButtons } from "./account-ui";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { useLoyaltyPayProgram } from "../LoyaltyPay/LoyaltyPay-data-access";
import { createQR, encodeURL } from "@solana/pay";
import { getMint } from "@solana/spl-token";
import { USDC_MINT_ADDRESS } from "@project/anchor";

export default function MerchantAccountDetailFeature() {
  const wallet = useAnchorWallet();
  const [amount, setAmount] = useState(1); // 1 USDC
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [status, setStatus] = useState("Set the amount to be paid :");
  const [reference, setReference] = useState<PublicKey | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { connection } = useConnection();
  const params = useParams();
  const router = useRouter();

  // Check if wallet matches params and redirect if necessary
  useEffect(() => {
    if (wallet?.publicKey && params.address) {
      try {
        const paramAddress = new PublicKey(params.address as string);

        // If the wallet is connected but doesn't match the address param, redirect
        if (!wallet.publicKey.equals(paramAddress)) {
          console.log(
            "Wallet does not match address parameter, redirecting..."
          );
          toast.error("You do not have access to this merchant account");
          router.push("/");
        }
      } catch (e) {
        console.error("Invalid address parameter:", e);
        toast.error("Invalid address parameter");
        router.push("/");
      }
    }
  }, [wallet?.publicKey, params.address, router]);

  const address = useMemo(() => {
    if (!params.address) {
      return undefined;
    }

    try {
      const paramAddress = new PublicKey(params.address as string);

      // Only return the address if wallet is connected and matches the param address
      if (wallet?.publicKey && wallet.publicKey.equals(paramAddress)) {
        return wallet.publicKey;
      } else if (!wallet?.publicKey) {
        // If wallet not connected, show the param address but access will be restricted
        return paramAddress;
      }

      // Otherwise return undefined (which will show error)
      return undefined;
    } catch (e) {
      console.log(`Invalid public key`, e);
      return undefined;
    }
  }, [params.address, wallet?.publicKey]);

  // Generate a QR code for the transaction (based on QuickNode tutorial)
  const generateTransactionQR = async () => {
    if (!wallet || !wallet.publicKey) {
      toast.error(
        "Wallet not connected or does not support signing transactions."
      );
      return;
    }

    try {
      setIsGenerating(true);
      setStatus("Generating QR code...");

      // Create a URL for our dynamic api endpoint with merchant and amount in path
      const apiUrl = new URL(
        `${
          window.location.origin
        }/api/pay/${wallet.publicKey.toString()}/${amount}`
      );

      console.log("api url: ", apiUrl.toString());

      // Create the Solana Pay URL that will trigger the wallet to make a GET
      // request to our API endpoint
      const url = encodeURL({
        link: apiUrl,
        label: "Loyalty Pay",
        message: "Process payment and update loyalty card",
      });

      // Create a QR code from the URL
      const qr = createQR(url.toString());
      const qrBlob = await qr.getRawData("png");

      if (!qrBlob) {
        throw new Error("Failed to generate QR code");
      }

      // Convert the blob to a base64 string to display in the UI
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === "string") {
          setQRCode(event.target.result);
          setStatus("Scan the QR Code to pay.");
        }
      };
      reader.readAsDataURL(qrBlob);
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
      setStatus("Error generating QR code. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Access Denied!</strong>
          <p className="block sm:inline">
            {" "}
            You don&apos;t have access to this merchant account.
          </p>
          <p className="mt-2">
            Please connect the correct wallet or return to the dashboard.
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Return to Dashboard
        </button>
      </div>
    );
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
                  disabled={isGenerating}
                />
              </div>
              <button
                onClick={generateTransactionQR}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400"
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate Payment QR"}
              </button>
              {qrCode && (
                <div className="mt-6">
                  <img
                    src={qrCode}
                    width="256"
                    height="256"
                    alt="QR Code"
                    className="mx-auto"
                  />
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
