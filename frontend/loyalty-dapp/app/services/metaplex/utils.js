import { dasApi } from "@metaplex-foundation/digital-asset-standard-api"
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { NETWORK } from '../../program/solana';

const umi = createUmi(NETWORK).use(dasApi());

export const getCustomerAssets = async (customerPubKey) => {
    const assets = await umi.rpc.getAssetsByOwner({
        customerPubKey,
        limit: 10
    });
    return assets;
}

export const doesCustomerOwnMerchantAsset = async (customerPubKey, merchantPubKey) => {
    const assets = await getCustomerAssets(customerPubKey);
    return assets.some(asset => asset.updateAuthority.equals(merchantPubKey));
}

