"use client";

import { getLoyaltyPayProgram, getLoyaltyPayProgramId } from "@project/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { Cluster, Keypair, PublicKey } from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import { BN } from "bn.js";

export function useLoyaltyPayProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();
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

  const processPayment = useMutation({
    mutationKey: ["LoyaltyPay", "process-payment", { cluster }],
    mutationFn: async ({
      amount,
      customer,
      merchant,
    }: {
      amount: number;
      customer: PublicKey;
      merchant: PublicKey;
    }) =>
      program.methods
        .processPayment(new BN(amount))
        .accounts({ customer, merchant })
        .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
      return accounts.refetch();
    },
    onError: () => toast.error("Failed to process payment"),
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
      program.methods
        .closeLoyaltyCard()
        .accounts({ customer, merchant })
        .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
      return accounts.refetch();
    },
    onError: () => toast.error("Failed to close account"),
  });

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    processPayment,
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
