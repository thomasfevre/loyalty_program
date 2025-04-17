"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { ReactNode, Suspense, useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { cva, type VariantProps } from 'class-variance-authority';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

import { AccountChecker } from "../account/account-ui";
import { WalletButton } from "../solana/solana-provider";

const MainLayoutContainer = ({ children }: { children: ReactNode }) => {
  return (
    <div className="bg-indigo-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen">
      <LoyaltyPayNavbar />
      <main className="container mx-auto px-4 py-6">
        <Suspense
          fallback={
            <div className="text-center my-32">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            </div>
          }
        >
          {children}
          <Toaster position="bottom-right" />
        </Suspense>
      </main>
    </div>
  );
};

function LoyaltyPayNavbar() {

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <Link 
            href="/"
            className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400"
          >
            <span className="text-2xl">🥖</span>
            <span className="font-bold text-xl">LoyaltyPay</span>
          </Link>
          <nav className="hidden md:flex space-x-6 ml-8">
            <Link href="/customer" className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400">
              Customer
            </Link>
            <Link href="/merchant" className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400">
              Merchant
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <WalletMultiButton className="!bg-indigo-600 !hover:bg-indigo-700" />
        </div>
      </div>
    </header>
  );
}

const appHeroVariants = cva(
  'mb-8 bg-indigo-600 dark:bg-indigo-900 rounded-xl shadow-md p-8 text-white',
  {
    variants: {
      size: {
        sm: 'py-4',
        md: 'py-6',
        lg: 'py-8',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

interface AppHeroProps extends VariantProps<typeof appHeroVariants> {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}

const AppHero = ({ title, subtitle, action, children, size }: AppHeroProps) => {
  const sizeClasses = {
    sm: 'py-4',
    md: 'py-6',
    lg: 'py-8',
  };

  return (
    <div className={`${appHeroVariants({ size })}`}>
      <div className="max-w-3xl">
        <div className="text-3xl font-bold">{title}</div>
        {subtitle && <div className="mt-2 text-indigo-100">{subtitle}</div>}
        {action && <div className="mt-4">{action}</div>}
      </div>
      {children}
    </div>
  );
};

function ellipsify(str: string, start = 4, end = 4) {
  const strLen = str.length;
  if (strLen <= start + end) {
    return str;
  }
  return `${str.substring(0, start)}...${str.substring(strLen - end, strLen)}`;
}

export { MainLayoutContainer, AppHero, ellipsify, LoyaltyPayNavbar };

export function AppModal({
  id,
  title,
  children,
  closeModal,
}: {
  id: string;
  title: string;
  children: ReactNode;
  closeModal: () => void;
}) {
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogModal = modalRef.current;
    if (dialogModal) {
      dialogModal.showModal();
    }
    return () => {
      if (dialogModal) {
        dialogModal.close();
      }
    };
  }, []);

  return (
    <dialog ref={modalRef} id={id} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        <div className="py-4">{children}</div>
        <div className="modal-action">
          <button className="btn" onClick={closeModal}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function useTransactionToast() {
  return {
    onSuccess: (signature: string) => {
      toast.success(
        <div className="flex flex-col gap-1">
          <p>Transaction confirmed</p>
          <a
            href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline"
          >
            View on Solana Explorer
          </a>
        </div>
      );
    },
    onError: (error: any) => {
      toast.error(
        <div className="flex flex-col gap-1">
          <p>Transaction failed</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {error.message}
          </p>
        </div>
      );
    },
  };
}
