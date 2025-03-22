import { createNft } from '@metaplex-foundation/mpl-token-metadata'
import { generateSigner, KeypairSigner, percentAmount } from '@metaplex-foundation/umi';
import { Connection, ParsedAccountData, PublicKey, sendAndConfirmTransaction, Transaction, Signer } from '@solana/web3.js';
import { metadataUris, umi, nftDetails, QUICKNODE_RPC, oneTimeSetup } from './mintOrUpdateUtils';




// --------------------------  Mint functions  --------------------------

async function mintNft(metadataUri: string, signer:KeypairSigner) {
    try {
        const mint = generateSigner(umi);
        await createNft(umi, {
            mint,
            name: nftDetails[0].name,
            symbol: nftDetails[0].symbol,
            uri: metadataUri,
            sellerFeeBasisPoints: percentAmount(0),
            creators: [{ address: signer.publicKey, verified: true, share: 100 }],
        }).sendAndConfirm(umi)
        console.log(`Created NFT: ${mint.publicKey.toString()}`)
        return mint.publicKey.toString();
    } catch (e) {
        throw e;
    }
}

// --------------------------  Transfer functions  --------------------------
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

const connection = new Connection(QUICKNODE_RPC!, 'confirmed');
async function getNumberDecimals(mintAddress: string):Promise<number> {
    const info = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
    const result = (info.value?.data as ParsedAccountData).parsed.info.decimals as number;
    return result;
}

async function sendTokens(amount: number, mintAddress: string, merchantWallet: Signer, recipient: string) {
    console.log(`Sending ${amount} ${(mintAddress)} from ${(merchantWallet.publicKey.toString())} to ${(recipient)}.`)
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
    const tx = new Transaction();
    // Check if the account exists
    try {
        
        await connection.getAccountInfo(destinationTokenAccount);
    } catch (error) {
        console.log("Destination account not found, creating one...");
    
        const createTokenAccountIx = createAssociatedTokenAccountInstruction(
            merchantWallet.publicKey, // Fee Payer
            destinationTokenAccount,
            new PublicKey(recipient),
            new PublicKey (mintAddress)
        );
    
        tx.add(createTokenAccountIx);
    }
    
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
    const signature = await sendAndConfirmTransaction(connection,tx,[merchantWallet]);
    console.log(
        '\x1b[32m', //Green Text
        `   Transaction Success!🎉`,
        `\n    https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );
}

// Wrapper function to mint and transfer the NFT
export async function mintAndTransferCustomerNft(merchantWallet: unknown, recipient: string) {
    try {
        // Mint the NFT
        if (metadataUris.length === 0) {
            await oneTimeSetup(merchantWallet as KeypairSigner);
        }
        const mintAddress= await mintNft(metadataUris[0], merchantWallet as KeypairSigner);

        // Transfer the NFT to the customer
        await sendTokens(1, mintAddress, merchantWallet as Signer, recipient);
        return mintAddress;
    } catch (e) {
        throw e;
    }
}

