import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { fetchMetadataFromSeeds } from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { NETWORK } from '../solana';

const umi = createUmi(NETWORK).use(dasApi());

export const getCustomerAssets = async (customerPubKey) => {
    console.log("Getting assets for ", customerPubKey.toString());
    const assets = await umi.rpc.getAssetsByOwner({
        customerPubKey,
        limit: 10
    });
    return assets;
}

export async function doesCustomerOwnMerchantAsset(customerPubKey, merchantPubKey) {
    try {
        const assets = await getCustomerAssets(customerPubKey);
        return assets.some(asset => asset.updateAuthority.equals(merchantPubKey));
    } catch (e) {
        console.log("No assets ",e);
        return false;
    }
}

export async function fetchNftWithMintAddress(mintAddress) {
    
    console.log(`Step 1 - Fetching existing NFT`);
    const metadata = await fetchMetadataFromSeeds(umi, { mint: mintAddress });
    console.log("metadata", metadata);
    return metadata;
}

