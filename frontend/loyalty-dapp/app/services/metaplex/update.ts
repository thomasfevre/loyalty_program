import { fetchMetadataFromSeeds, updateV1 } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, PublicKey, Signer } from '@metaplex-foundation/umi';
import { metadataUris, umi, nftDetails } from './mintOrUpdateUtils';

export async function updateNft(newMetadataUriIndex: number, mintAddress: PublicKey, merchantWallet: Signer) {
    try {
        const update = generateSigner(umi);

        (async () => {
            const metadata = await fetchMetadataFromSeeds(umi, { mint: mintAddress });
            await updateV1(umi, {
                mint: mintAddress,
                authority: merchantWallet,
                data: {
                    ...metadata,
                    name: nftDetails[newMetadataUriIndex].name,
                    symbol: "testU",
                    uri: metadataUris[newMetadataUriIndex],
                    sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
                    creators: metadata.creators
                }
            }).sendAndConfirm(umi);
            console.log(`Updated NFT metadata for mint: ${mintAddress.toString()}`);
        })();
        
        console.log(`Updated NFT: ${update.publicKey.toString()}`)
    } catch (e) {
        throw e;
    }
}


// Uploaded metadata: https://mockstorage.example.com/m5r7uIwHHR8Q5qFKNOIf
// Updated NFT: DB1KJTwzyRdBhby2r2jEDissqRGFvL9f1sApxVa8xyLd
// Updated NFT metadata for mint: 5oaWemm2ZGvtBswRbs9rcQjKDqvmUfp5XSxEz6oa32rb