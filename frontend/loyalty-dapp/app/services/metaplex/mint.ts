import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { generateSigner, signerIdentity, percentAmount, Signer as umiSigner, publicKey as umiPublicKey, createSignerFromKeypair} from '@metaplex-foundation/umi';
import { toWeb3JsTransaction, toWeb3JsLegacyTransaction, toWeb3JsPublicKey, toWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters"
import { Connection, ParsedAccountData, PublicKey, sendAndConfirmTransaction, Transaction, Signer } from '@solana/web3.js';
import { metadataUris, umi, nftDetails, NETWORK, oneTimeSetup } from './mintOrUpdateUtils';




// --------------------------  Mint functions  --------------------------

async function mintNft(metadataUri: string, signer:umiSigner) {
    try {
        const mint = generateSigner(umi);
        const tx = await createNft(umi, {
            mint,
            name: nftDetails[0].name,
            symbol: nftDetails[0].symbol,
            uri: metadataUri,
            sellerFeeBasisPoints: percentAmount(0),
            creators: [{ address: signer.publicKey, verified: true, share: 100 }],
        }).useV0().buildWithLatestBlockhash(umi)
        
        const web3JsTx = toWeb3JsLegacyTransaction(tx);
       
        // const signedTX = await mint.signTransaction(tx);
        console.log(`Created NFT: ${mint.publicKey.toString()}`)
        return { web3JsTx, mint };
    } catch (e) {
        throw e;
    }
}

// --------------------------  Transfer functions  --------------------------
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { mockStorage } from '@metaplex-foundation/umi-storage-mock';

const connection = new Connection(NETWORK!, 'confirmed');
async function getNumberDecimals(mintAddress: string):Promise<number> {
    const info = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
    const result = (info.value?.data as ParsedAccountData).parsed.info.decimals as number;
    return result;
}

export async function sendTokens(amount: number, mintAddress: string, merchantWallet: Signer, recipient: string) {
    console.log(`Sending ${amount} ${(mintAddress)} from ${(merchantWallet.publicKey.toString())} to ${(recipient)}.`)
    const tx = new Transaction();
    //Step 1
    console.log(`1 - Getting Source Token Account`);
    let sourceAccount = await getOrCreateAssociatedTokenAccount(
        connection, 
        merchantWallet,
        new PublicKey(mintAddress),
        merchantWallet.publicKey
    );
    console.log(`    Source Account: ${sourceAccount.address.toString()}`);

    //Step 2
    console.log(`2 - Getting Destination Token Account`);
    
    const destinationTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(mintAddress), // NFT Mint Address
        new PublicKey(recipient), // Receiver's Public Key
        false, // Not a PDA
    );
    // Check if the account exists
    // try {
        
    //     await connection.getAccountInfo(destinationTokenAccount);
    // } catch (error) {
    //     console.log("Destination account not found, creating one...");
    
        const createTokenAccountIx = createAssociatedTokenAccountInstruction(
            merchantWallet.publicKey, // Fee Payer
            destinationTokenAccount,
            new PublicKey(recipient),
            new PublicKey (mintAddress)
        );
    
        tx.add(createTokenAccountIx);
    // }
    
    console.log(`    Destination Account: ${destinationTokenAccount.toString()}`);

    //Step 3
    console.log(`3 - Fetching Number of Decimals for Mint: ${mintAddress}`);
    const numberDecimals = await getNumberDecimals(mintAddress);
    console.log(`    Number of Decimals: ${numberDecimals}`);

    //Step 4
    console.log(`4 - Creating and Sending Transaction`);
    
    tx.add(createTransferInstruction(
        sourceAccount.address,
        destinationTokenAccount,
        merchantWallet.publicKey,
        amount * Math.pow(10, numberDecimals)
    ));
   
    const latestBlockHash = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = await latestBlockHash.blockhash; 
    tx.feePayer = new PublicKey(merchantWallet.publicKey);   
    return tx;
    // const signature = await sendAndConfirmTransaction(connection,tx,[merchantWallet]);
    // console.log(
    //     '\x1b[32m', //Green Text
    //     `   Transaction Success!🎉`,
    //     `\n    https://explorer.solana.com/tx/${signature}?cluster=devnet`
    // );
}

// Wrapper function to mint and transfer the NFT
export async function mintCustomerNft(merchantWallet: unknown, recipient: string) {
    try {
        umi.use(signerIdentity(merchantWallet as umiSigner));
        // Mint the NFT
        if (metadataUris.length === 0) {
            await oneTimeSetup();
        }
        const { web3JsTx: umiTx, mint }= await mintNft(metadataUris[0], merchantWallet as umiSigner);
        let tx = new Transaction().add(umiTx);
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

