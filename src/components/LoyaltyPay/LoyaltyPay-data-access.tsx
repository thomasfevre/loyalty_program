"use client";

import { getLoyaltyPayProgram, getLoyaltyPayProgramId } from "@project/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { Cluster, Keypair, PublicKey } from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import { BN } from "bn.js";
import { toast } from "../ui/custom-toast";

export function useLoyaltyPayProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const provider = useAnchorProvider();
  const transactionToast = useTransactionToast();
  const programId = useMemo(
    () => getLoyaltyPayProgramId(cluster.network as Cluster),
    [cluster]
  );
  const program = useMemo(
    () => getLoyaltyPayProgram(provider, programId),
    [provider, programId]
  );

  const accounts = useQuery({
    queryKey: ["LoyaltyPay", "all", { cluster }],
    queryFn: () => program.account.loyaltyCard.all(),
  });

  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  const closeLoyaltyCard = useMutation({
    mutationKey: ["LoyaltyPay", "close_loyalty_card", { cluster }],
    mutationFn: async ({
      customer,
      merchant,
    }: {
      customer: PublicKey;
      merchant: PublicKey;
    }) =>
      program.methods.closeLoyaltyCard().accounts({ customer, merchant }).rpc(),
    onSuccess: (signature) => {
      transactionToast.onSuccess(signature);
      toast.success(
        <div>
          <p className="font-medium">Loyalty card closed successfully!</p>
          <p className="text-sm">Your loyalty card has been removed from the blockchain</p>
        </div>
      );
      return accounts.refetch();
    },
    onError: (error) => {
      console.error("Error closing loyalty card:", error);
      toast.error(
        <div>
          <p className="font-medium">Failed to close loyalty card</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      );
    },
  });

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    closeLoyaltyCard,
  };
}

export function useLoyaltyPayProgramAccount({
  account,
}: {
  account: PublicKey;
}) {
  const { cluster } = useCluster();
  const { program } = useLoyaltyPayProgram();

  const accountQuery = useQuery({
    queryKey: ["LoyaltyPay", "fetch", { cluster, account }],
    queryFn: () => program.account.loyaltyCard.fetch(account),
  });

  return { accountQuery };
}
