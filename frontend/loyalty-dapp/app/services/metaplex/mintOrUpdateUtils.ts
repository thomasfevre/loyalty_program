import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { KeypairSigner } from '@metaplex-foundation/umi';


export const NETWORK = process.env.NEXT_PUBLIC_RPC_URL; 
export const umi = createUmi(NETWORK!, { commitment: 'confirmed' }); 

export let metadataUris: string[] = [
    "https://mockstorage.example.com/ZiMmzsQBJz5f1Uw1wClP",
    "https://mockstorage.example.com/zBNwiWr185Va9CmbMJ4v",
    "https://mockstorage.example.com/AIUYludsgRkk2US8EFbW",
    "https://mockstorage.example.com/IDCt02lsKQvgWjUMa2iS",
]


export const nftDetails = [
    {
        name: `Loyalty Card NFT`,
        symbol: 'BAGUETTE',
        image: 'https://ipfs.io/ipfs/bafybeihl72qo2itx5tvv34rjtoxju4rcwo4edio33ucrhltbyvgocmuiai/common_2.jpg',
        description: 'Keep buyging to unlock more rewards!',
        attributes : [
            {
            "trait_type": "Reward Tier",
            "value": "Common"
            }
        ],
        properties: {
            files: [
                {
                    "uri": "https://ipfs.io/ipfs/bafybeihl72qo2itx5tvv34rjtoxju4rcwo4edio33ucrhltbyvgocmuiai/common_2.jpg",
                    "type": "image/png"
                }
            ],
            category: "image"
        }
    },
    {
        name: `Loyalty Card NFT`,
        symbol: 'BAGUETTE',
        image: 'https://ipfs.io/ipfs/bafybeihl72qo2itx5tvv34rjtoxju4rcwo4edio33ucrhltbyvgocmuiai/rare_4.jpg',
        description: 'Keep buyging to unlock more rewards!',
        attributes : [
            {
            "trait_type": "Reward Tier",
            "value": "rare"
            }
        ],
        properties: {
            files: [
                {
                    "uri": "https://ipfs.io/ipfs/bafybeihl72qo2itx5tvv34rjtoxju4rcwo4edio33ucrhltbyvgocmuiai/rare_4.jpg",
                    "type": "image/png"
                }
            ],
            category: "image"
        }
    },
    {
        name: `Loyalty Card NFT`,
        symbol: 'BAGUETTE',
        image: 'https://ipfs.io/ipfs/bafybeihl72qo2itx5tvv34rjtoxju4rcwo4edio33ucrhltbyvgocmuiai/epic_1.jpg',
        description: 'You are so close to get a 15% discount on your Next purchase !',
        attributes : [
            {
            "trait_type": "Reward Tier",
            "value": "epic"
            }
        ],
        properties: {
            files: [
                {
                    "uri": "https://ipfs.io/ipfs/bafybeihl72qo2itx5tvv34rjtoxju4rcwo4edio33ucrhltbyvgocmuiai/epic_1.jpg",
                    "type": "image/png"
                }
            ],
            category: "image"
        }
    },
    {
        name: `Loyalty Card NFT - Unlocked Discount`,
        symbol: 'BAGUETTE',
        image: 'https://ipfs.io/ipfs/bafybeihl72qo2itx5tvv34rjtoxju4rcwo4edio33ucrhltbyvgocmuiai/legendary_2.jpg',
        description: 'You have unlocked a 15% discount on your Next purchase !',
        attributes : [
            {
            "trait_type": "Reward Tier",
            "value": "legendary"
            }
        ],
        properties: {
            files: [
                {
                    "uri": "https://ipfs.io/ipfs/bafybeihl72qo2itx5tvv34rjtoxju4rcwo4edio33ucrhltbyvgocmuiai/legendary_2.jpg",
                    "type": "image/png"
                }
            ],
            category: "image"
        }
    },
];

async function uploadMetadata(index: number): Promise<string> {
    try {
        const metadata = {
            name: nftDetails[index].name,
            symbol: nftDetails[index].symbol,
            description: nftDetails[index].description,
            image: nftDetails[index].image,
            attributes: nftDetails[index].attributes,
            properties: {
                files: [
                    {
                        type: nftDetails[index].properties.category,
                        uri: nftDetails[index].image,
                    },
                ]
            }
        };
        const metadataUri = await umi.uploader.uploadJson(metadata);
        console.log('Uploaded metadata:', metadataUri);
        return metadataUri;
    } catch (e) {
        throw e;
    }
}

// One time setup to upload metadata
export const oneTimeSetup = async () => {

    for (let i = 0; i < nftDetails.length; i++) {
        metadataUris[i] = await uploadMetadata(i);
    }
}
