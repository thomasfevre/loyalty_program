"use client";

import { fetchMetadataFromSeeds, fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { useConnection } from "@solana/wallet-adapter-react";
import { useCluster } from "../cluster/cluster-data-access";
import { useQuery } from "@tanstack/react-query";
import { PublicKey } from '@metaplex-foundation/umi';


export async function fetchNftWithMintAddress(mintAddress: PublicKey) {
    const { cluster } = useCluster()
    const { connection } = useConnection()
    return useQuery({
        queryKey: ['get-nft', { endpoint: connection.rpcEndpoint, mintAddress }],
        queryFn: async () => {
            const umi = createUmi(cluster.endpoint);

            console.log(`Step 1 - Fetching existing NFT`);
            const metadata = await fetchMetadataFromSeeds(umi, { mint: mintAddress });
            console.log("metadata", metadata);
            const asset = await fetchDigitalAsset(umi, mintAddress);
            console.log("asset", asset);
            return metadata;
        },
    })










}