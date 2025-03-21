import { dasApi } from "@metaplex-foundation/digital-asset-standard-api"
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { NETWORK } from './solana';
import { PublicKey } from "@solana/web3.js";

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

export const { mint, transaction } = await metaplex.nfts().create({
    uri:  "https://ipfs.io/ipfs/bafybeihl72qo2itx5tvv34rjtoxju4rcwo4edio33ucrhltbyvgocmuiai/common_2.jpg",
    name: "Loyalty NFT",
    symbol: "BAGET",
    attributes : [
      {
        "trait_type": "Reward Tier",
        "value": "Common"
      }
    ],
    sellerFeeBasisPoints: 0, // No resale
    updateAuthority: merchantWallet, // The merchant controls updates
    mintAuthority: merchantWallet, // Only the merchant can mint
    tokenOwner: customerWallet, // NFT is owned by customer
  });

export const mintCustomerNft = async (customerPubKey, merchantPubKey, rewardTier) => {
    const response = await umi.rpc.mint({
        uri: `https://ipfs.io/ipfs/bafybeihl72qo2itx5tvv34rjtoxju4rcwo4edio33ucrhltbyvgocmuiai/${RewardTier[rewardTier]}.jpg`,
        attributes: [
            {
                "trait_type": "Reward Tier",
                "value": rewardTier
            }
        ],
        sellerFeeBasisPoints: 0,
        updateAuthority: merchantPubKey,
        mintAuthority: merchantPubKey,
        tokenOwner: customerPubKey
    });

    console.log("Mint NFT response: ", response);
}
  
export const RewardTier = {
    Common: "common_2",
    Rare: "rare_4",
    Epic: "epic_1",
    Legendary: "legendary_2",
  };

export const updateCustomerNft = async (customerPubKey, merchantPubKey, rewardTier) => {
    const assets = await getCustomerAssets(customerPubKey);
    const merchantAsset = assets.find(asset => asset.updateAuthority.equals(merchantPubKey));
    if (merchantAsset) {
        const response = await umi.rpc.updateAsset({
            uri: `https://ipfs.io/ipfs/bafybeihl72qo2itx5tvv34rjtoxju4rcwo4edio33ucrhltbyvgocmuiai/${RewardTier[rewardTier]}.jpg`,

            attributes: [
                {
                    "trait_type": "Reward Tier",
                    "value": rewardTier
                }
            ]
        });

        console.log("Update NFT response: ", response);
    } else {
        throw new Error("Customer does not own merchant asset");
    }
}