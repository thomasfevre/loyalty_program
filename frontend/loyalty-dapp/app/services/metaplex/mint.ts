import { createV1, mintV1, mplTokenMetadata, TokenStandard } from '@metaplex-foundation/mpl-token-metadata'
import { generateSigner, signerIdentity, percentAmount, Signer as umiSigner, publicKey as umiPublicKey, createSignerFromKeypair, KeypairSigner} from '@metaplex-foundation/umi';
import { toWeb3JsTransaction, toWeb3JsLegacyTransaction, toWeb3JsPublicKey, toWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters"
import { Connection, ParsedAccountData, PublicKey, sendAndConfirmTransaction, Transaction, Signer } from '@solana/web3.js';
import { metadataUris, umi, nftDetails, NETWORK, oneTimeSetup } from './mintOrUpdateUtils';




// --------------------------  Mint functions  --------------------------

async function createNft(metadataUri: string, signer:umiSigner) {
    try {
        const mint = generateSigner(umi);
        const tx = await createV1(umi, {
            mint,
            authority: signer,
            name: 'Loyalty Pay NFT',
            uri: metadataUri,
            sellerFeeBasisPoints: percentAmount(0),
            tokenStandard: TokenStandard.NonFungible,
          }).useV0().buildWithLatestBlockhash(umi)
        
        const web3JsCreateTx = toWeb3JsLegacyTransaction(tx);
       
        // const signedTX = await mint.signTransaction(tx);
        console.log(`Created NFT: ${mint.publicKey.toString()}`)
        return { web3JsCreateTx, mint };
    } catch (e) {
        throw e;
    }
}

async function mintNft(mint: KeypairSigner, signer:umiSigner, recipient: string) {
    try {
        const tx = await mintV1(umi, {
            mint: mint.publicKey,
            authority: signer,
            amount: 1,
            tokenOwner: umiPublicKey(recipient),
            tokenStandard: TokenStandard.NonFungible,
          }).useV0().buildWithLatestBlockhash(umi)
        
        const web3JsMintTx = toWeb3JsLegacyTransaction(tx);
        // const signedTX = await mint.signTransaction(tx);
        console.log(`Created NFT: ${mint.publicKey.toString()}`)
        return { web3JsMintTx, mint };
    } catch (e) {
        throw e;
    }
}


// Wrapper function to mint and transfer the NFT
export async function mintCustomerNft(merchantWallet: unknown, recipient: string) {
    try {
        umi.use(signerIdentity(merchantWallet as umiSigner));
        // Mint the NFT
        if (metadataUris.length === 0) {
            await oneTimeSetup();
        }
        const { web3JsCreateTx: umiTx, mint }= await createNft(metadataUris[0], merchantWallet as umiSigner);
        const { web3JsMintTx: umiMintTx } = await mintNft(mint, merchantWallet as umiSigner, recipient);
        // Combine the transactions
        let tx = new Transaction().add(umiTx);
        tx.add(umiMintTx);
        // Sign the transaction with the merchant wallet and mint keypair
        const wallet = merchantWallet as umiSigner;
        tx.feePayer = new PublicKey(wallet.publicKey);
        tx.recentBlockhash = (await umi.rpc.getLatestBlockhash()).blockhash;
        const web3JsMintSigner = toWeb3JsKeypair(mint);
        tx.partialSign(web3JsMintSigner);

        
        return {tx, mintPublicKey: mint.publicKey.toString()};
    } catch (e) {
        throw e;
    }
}

