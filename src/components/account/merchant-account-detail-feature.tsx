"use client";

import { useMemo, useState, useEffect } from "react";

import { ExplorerLink } from "../cluster/cluster-ui";
import { AppHero, ellipsify } from "../ui/ui-layout";
import { AccountButtons } from "./account-ui";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useParams, useRouter } from "next/navigation";
import { toast } from "../ui/custom-toast";
import { createQR, encodeURL } from "@solana/pay";
import {
  generateSolanaPayURL,
  waitForPayment,
} from "../LoyaltyPay/accountUtils/getPDAs";
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

      const referenceKey = new PublicKey(Keypair.generate().publicKey); // Unique reference
      setReference(referenceKey);

      // Create a URL for our dynamic api endpoint with merchant and amount in path
      const apiUrl = new URL(
        `${
          window.location.origin
        }/api/pay/${wallet.publicKey.toString()}/${amount}/${referenceKey.toString()}`
      );

      console.log("api url: ", apiUrl.toString());

      // Create the Solana Pay URL that will trigger the wallet to make a GET
      // request to our API endpoint
      const url = generateSolanaPayURL(apiUrl, wallet.publicKey, referenceKey);

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

  useEffect(() => {
    console.log("reference: ", reference);
    console.log("wallet: ", wallet);
    if (!reference || !wallet) return;

    (async () => {
      try {
        const { decimals } = await getMint(connection, USDC_MINT_ADDRESS);

        console.log("status: ", status);
        if (status === "Scan the QR Code to pay.") {
          await waitForPayment(
            reference,
            connection,
            wallet.publicKey,
            amount * 10 ** decimals
          );
          toast.success("Payment received! Updating loyalty points...");
          setStatus("Payment received! Updating blockchain...");
        }
      } catch (error) {
        toast.error("Error detecting payment");
      }
    })();
  }, [reference, connection, amount, status]);

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
    <div className="space-y-8">
      <AppHero
        title={
          <span className="text-3xl font-bold text-white">
            Merchant Dashboard
          </span>
        }
        subtitle={
          <div className="bg-gradient-to-r from-purple-600/90 to-purple-700/90 rounded-lg p-6 mt-4 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-lg font-semibold mb-2 text-purple-100">
                Merchant Wallet:
              </p>
              <div className="flex items-center gap-2">
                <div className="bg-white/20 rounded-md px-3 py-1">
                  <ExplorerLink
                    path={`account/${address}`}
                    label={ellipsify(address.toString())}
                    className="text-white hover:text-purple-200 transition-colors"
                  />
                </div>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(address.toString())
                  }
                  className="text-purple-200 hover:text-white"
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
          <h2 className="text-2xl font-bold text-purple-800 dark:text-purple-300">
            Payment Generator
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Generate QR codes for customers to make payments
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 rounded-lg">
            <div className="mb-6">
              <p className="text-lg font-medium text-purple-800 dark:text-purple-300 mb-2">
                {status}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount (USDC):
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    disabled={isGenerating}
                  />
                </div>
                <button
                  onClick={generateTransactionQR}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-md shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 disabled:from-gray-400 disabled:to-gray-500"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Generate Payment QR</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="md:w-1/2 flex flex-col items-center justify-center">
            {qrCode ? (
              <div className="relative bg-white p-4 rounded-lg shadow-lg">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl blur opacity-20"></div>
                <div className="relative">
                  <img
                    src={qrCode}
                    width="256"
                    height="256"
                    alt="QR Code"
                    className="mx-auto rounded-md"
                  />
                  <p className="text-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Customer payment - {amount} USDC
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-100 dark:bg-gray-700/50 rounded-lg w-full">
                <div className="text-6xl mb-4">📱</div>
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  Generate a QR code for customers to <br />
                  make payments with Solana Pay
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
