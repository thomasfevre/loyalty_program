"use client";

import { useWallet } from "@solana/wallet-adapter-react";

import { redirect, usePathname } from "next/navigation";
import { WalletButton } from "../solana/solana-provider";

export default function AccountListFeature() {
  const { publicKey } = useWallet();
  const pathname = usePathname();

  if (publicKey) {
    if (pathname === "/customer") {
      return redirect(`/customer/${publicKey.toString()}`);
    } else if (pathname === "/merchant") {
      return redirect(`/merchant/${publicKey.toString()}`);
    }
  }

  return (
    <div className="hero py-[64px]">
      <div className="hero-content text-center">
        <WalletButton />
      </div>
    </div>
  );
}
