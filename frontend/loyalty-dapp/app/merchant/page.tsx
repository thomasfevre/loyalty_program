'use client'
import { useState, useEffect } from "react";
import { PublicKey, Keypair, Signer } from "@solana/web3.js";
import { useAnchorWallet  } from "@solana/wallet-adapter-react";
import { QRCodeSVG } from 'qrcode.react';
import { generateSolanaPayURL, waitForPayment, getProvider, getProgram, PROGRAM_ID, deriveLoyaltyPDA } from "../services/solana";
import toast from "react-hot-toast";
import { BN } from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { doesCustomerOwnMerchantAsset, getCustomerAssets } from "../services/metaplex/utils";
import { mintCustomerNft } from "../services/metaplex/mint";
import { updateNft } from "../services/metaplex/update";

const MerchantPage: React.FC = () => {
  const wallet = useAnchorWallet ();
  const [amount, setAmount] = useState(1000000); // 0.001 SOL in lamports
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [status, setStatus] = useState("Set the amount to be paid :");
  const [reference, setReference] = useState<PublicKey | null>(null);
  const connection = getProvider(wallet!)?.connection;

  const generatePaymentQR = () => {
    if (!wallet || !wallet.publicKey || !wallet.signTransaction) {
      toast.error("Wallet not connected or does not support signing transactions.");
      return;
    }

    const referenceKey = new PublicKey(Keypair.generate().publicKey); // Unique reference
    setReference(referenceKey);

    const url = generateSolanaPayURL(wallet.publicKey, amount, referenceKey).toString();
    setQRCode(url);
    setStatus("Scan the QR Code to pay.");
  };

  const processLoyaltyUpdate = async (payerPubKey: PublicKey) => {
    if (!wallet || !wallet.publicKey || !wallet.signTransaction || !payerPubKey) {
      toast.error("Wallet not connected or does not support signing transactions.");
      return;
    }
    console.log("TODO Processing loyalty update...", wallet.publicKey, payerPubKey);
    const program = getProgram(wallet);

    try {
      // Check if the customer has a PDA with the merchant
      let loyaltyCardAccount;
      try {
        const customerPDA = deriveLoyaltyPDA(wallet.publicKey, payerPubKey);
        loyaltyCardAccount = await program.account.loyaltyCard.fetch(customerPDA);
        console.log("Customer PDA: ", loyaltyCardAccount);
      } catch (err) {
        console.log("No loyalty card found for this customer", err);
      }

      // Check if the customer already own an NFT from the merchant
      const customerNft = await doesCustomerOwnMerchantAsset(payerPubKey, wallet.publicKey);
      console.log("Customer nft ?: ", customerNft);
      // If not, mint a new NFT
      if (customerNft === false && !loyaltyCardAccount) {
        console.log("Minting NFT...");
        const { tx, mintPublicKey } = await mintCustomerNft(wallet, payerPubKey.toString());
        if (!wallet.signTransaction) {
          throw new Error("Wallet does not support signTransaction");
        }
        const txSigned = await wallet.signTransaction(tx);
        console.log("txHash: ", txSigned);
        const txHash = await connection?.sendRawTransaction(txSigned.serialize());
        console.log("txHash: ", txHash);
        const confirmedTx = await connection?.confirmTransaction(txHash!);
        console.log("Confirmed TX: ", confirmedTx);
        console.log("Minted NFT:", mintPublicKey);

        // Update the loyalty program
        const pgrmTx = await program.methods.processPayment(new BN(amount), new PublicKey(mintPublicKey)).accounts({
          customer: payerPubKey,
          merchant: wallet.publicKey,
        }).rpc();
        toast.success(`Loyalty updated! TX: ${pgrmTx}`);
        setStatus("Loyalty updated successfully!");

      } else {
        // If yes, upgrade the NFT

        // const update = await updateNft(1, customerNft., wallet);
        console.log("Updated NFT:", customerNft);
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
          const signatureInfo = await waitForPayment(reference, connection!, wallet.publicKey!, amount);
          toast.success("Payment received! Updating loyalty points...");
          setStatus("Payment received! Updating blockchain...");
          processLoyaltyUpdate(signatureInfo);
        }
      } catch (error) {
        toast.error("Error detecting payment");
      }
    })();
  }, [reference, connection, amount, processLoyaltyUpdate]);



  return (
    <div className="flex flex-col items-center text-center p-8">
      <button
        onClick={() => window.location.href = "/"}
        className="self-start mb-4 text-indigo-600 flex items-center"
      >
        <span className="mr-2">←</span> Go Back to Homepage
      </button>
      <h1 className="text-3xl font-bold mb-6">Solana Loyalty Program</h1>

      <div className="bg-blue-500 width-fit shadow-md rounded-lg p-6 mb-6">
        <p className="text-lg font-semibold mb-4">Merchant Wallet:</p>
        <WalletMultiButton className="w-full" />
      </div>
      
      {wallet!.publicKey ? (
        <>
          <div className="my-4">
            <p className="text-lg mb-2">{status}</p>
            <label className="block text-sm font-medium  mb-1">Amount (lamports):</label>
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
  );
};
export default MerchantPage;