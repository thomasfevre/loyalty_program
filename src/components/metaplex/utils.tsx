"use client";

import {
  fetchMetadataFromSeeds,
  fetchDigitalAsset,
  mintV1,
  createV1,
  TokenStandard,
  updateV1,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { useConnection } from "@solana/wallet-adapter-react";
import { useCluster } from "../cluster/cluster-data-access";
import { useQuery } from "@tanstack/react-query";
import {
  generateSigner,
  KeypairSigner,
  PublicKey as MetaplexPublicKey,
  percentAmount,
  publicKey as umiPublicKey,
  Signer,
  signerIdentity,
  unwrapOption,
} from "@metaplex-foundation/umi";
import {
  toWeb3JsLegacyTransaction,
  toWeb3JsKeypair,
} from "@metaplex-foundation/umi-web3js-adapters";
import { metadataUris, nftDetails, oneTimeSetup, umi } from "./constants";
import { PublicKey, Transaction } from "@solana/web3.js";
import toast from "react-hot-toast";

// Pure async function for non-React contexts
export async function fetchNftWithMintAddressAsync(
  mintAddress: MetaplexPublicKey
) {
  console.log(`Step 1 - Fetching existing NFT : ${mintAddress.toString()}`);
  try {
    const metadata = await fetchMetadataFromSeeds(umi, { mint: mintAddress });
    console.log("metadata", metadata);
    return metadata;
  } catch (err) {
    console.error(
      "Failed to fetch NFT with mint address",
      mintAddress.toString(),
      err
    );
    return null;
  }
}

// Pure async function for non-React contexts
export async function fetchCustomerAssets(mintPubKey: MetaplexPublicKey) {
  console.log("Fetching assets for ", mintPubKey.toString());
  return await fetchDigitalAsset(umi, mintPubKey);
}

// Async function version for use outside of React components
export async function doesCustomerOwnMerchantAsset(
  customerPubKey: MetaplexPublicKey,
  merchantPubKey: MetaplexPublicKey
): Promise<boolean> {
  try {
    const data = await fetchCustomerAssets(customerPubKey);
    if (!data) return false;
    const authority = unwrapOption(data.mint.mintAuthority);
    if (!authority) return false;
    return authority.toString() === merchantPubKey.toString();
  } catch (error) {
    console.error("Error checking customer merchant asset ownership:", error);
    return false;
  }
}

// Pure async function for non-React contexts
export async function createNftAsync(metadataUri: string, signer: Signer) {
  const mint = generateSigner(umi);
  const tx = await createV1(umi, {
    mint,
    authority: signer,
    name: "Loyalty Pay NFT",
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    tokenStandard: TokenStandard.NonFungible,
  })
    .useV0()
    .buildWithLatestBlockhash(umi);

  const web3JsCreateTx = toWeb3JsLegacyTransaction(tx);

  // const signedTX = await mint.signTransaction(tx);
  console.log(`Created NFT: ${mint.publicKey.toString()}`);
  return { web3JsCreateTx, mint };
}

// Hook version for React components
function useMintNft(mint: KeypairSigner, signer: Signer, recipient: string) {
  return useQuery({
    queryKey: ["mint-nft", { endpoint: umi, mint, signer, recipient }],
    queryFn: () => mintNftAsync(mint, signer, recipient),
  });
}

// Pure async function for non-React contexts
export async function mintNftAsync(
  mint: KeypairSigner,
  signer: Signer,
  recipient: string
) {
  const tx = await mintV1(umi, {
    mint: mint.publicKey,
    authority: signer,
    amount: 1,
    tokenOwner: umiPublicKey(recipient),
    tokenStandard: TokenStandard.NonFungible,
  })
    .useV0()
    .buildWithLatestBlockhash(umi);

  const web3JsMintTx = toWeb3JsLegacyTransaction(tx);
  // const signedTX = await mint.signTransaction(tx);
  console.log(`Created NFT: ${mint.publicKey.toString()}`);
  return { web3JsMintTx, mint };
}

// Wrapper function to mint and transfer the NFT
export async function mintCustomerNft(
  merchantWallet: unknown,
  recipient: string
) {
  try {
    umi.use(signerIdentity(merchantWallet as Signer));
    // Mint the NFT
    if (metadataUris.length === 0) {
      await oneTimeSetup();
    }

    // Use the async versions directly instead of React hooks
    const createResult = await createNftAsync(
      metadataUris[0],
      merchantWallet as Signer
    );

    if (!createResult) {
      throw new Error("Failed to create NFT");
    }

    const { web3JsCreateTx: umiTx, mint } = createResult;

    const mintResult = await mintNftAsync(
      mint,
      merchantWallet as Signer,
      recipient
    );

    if (!mintResult) {
      throw new Error("Failed to mint NFT");
    }

    const { web3JsMintTx: umiMintTx } = mintResult;

    // Combine the transactions
    let tx = new Transaction().add(umiTx);
    tx.add(umiMintTx);
    // Sign the transaction with the merchant wallet and mint keypair
    const wallet = merchantWallet as Signer;
    tx.feePayer = new PublicKey(wallet.publicKey);
    tx.recentBlockhash = (await umi.rpc.getLatestBlockhash()).blockhash;
    const web3JsMintSigner = toWeb3JsKeypair(mint);
    tx.partialSign(web3JsMintSigner);

    return { tx, mintPublicKey: mint.publicKey.toString() };
  } catch (e) {
    throw e;
  }
}

export async function updateNft(newMetadataUriIndex: number, mintAddress: PublicKey, merchantWallet: Signer) {
  try {
      const update = generateSigner(umi);

      (async () => {
          const metadata = await fetchMetadataFromSeeds(umi, { mint: umiPublicKey(mintAddress.toString()) });
          const tx = await updateV1(umi, {
              mint: umiPublicKey(mintAddress.toString()),
              authority: merchantWallet,
              data: {
                  ...metadata,
                  name: nftDetails[newMetadataUriIndex].name,
                  symbol: nftDetails[newMetadataUriIndex].symbol,
                  uri: metadataUris[newMetadataUriIndex],
                  sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
                  creators: metadata.creators
              }
          }).sendAndConfirm(umi);
          console.log(`Updated NFT metadata for mint: ${mintAddress.toString()}`);
          console.log(tx.toString());
      })();
      
      console.log(`Updated NFT: ${update.publicKey.toString()}`)
      toast.success('NFT Updated successfully!');
  } catch (e) {
      throw e;
  }
}