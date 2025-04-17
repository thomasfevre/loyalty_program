"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function LoyaltyPayHome() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto text-center">
        <div className="mb-12 opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500 dark:from-indigo-400 dark:to-purple-300">
            The loyalty program
            <br />
            you need to grow
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto text-gray-600 dark:text-gray-300">
            LoyaltyPay transforms everyday payments into rewarding experiences for your customers
            on Solana.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-center gap-6 opacity-0 animate-[fadeInUp_0.6s_0.2s_ease-out_forwards]">
          {connected ? (
            <>
              <Link 
                href={`/customer/${publicKey?.toString()}`}
                className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-8 py-4 rounded-lg font-medium text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <span className="text-2xl">👤</span>
                <span>Customer Dashboard</span>
              </Link>
              <Link 
                href={`/merchant/${publicKey?.toString()}`}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-4 rounded-lg font-medium text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <span className="text-2xl">🏪</span>
                <span>Merchant Dashboard</span>
              </Link>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <WalletMultiButton className="!relative !bg-indigo-600 !hover:bg-indigo-700 !text-white !px-8 !py-4 !rounded-lg !font-medium !text-lg !shadow-lg !hover:shadow-xl !transition-all" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Connect your wallet to get started</p>
            </div>
          )}
        </div>

        <div className="mt-20 relative opacity-0 animate-[fadeInScale_0.8s_0.4s_ease-out_forwards]">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-20"></div>
          <div className="relative w-full aspect-video max-w-5xl mx-auto rounded-xl overflow-hidden shadow-2xl">
            <Image
              src="/loyalty-dashboard.png"
              alt="LoyaltyPay Dashboard"
              width={1280}
              height={720}
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block mb-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur-md opacity-25"></div>
              <h2 className="relative bg-white dark:bg-gray-900 px-6 py-2 rounded-lg text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">
                A superpowered loyalty program in every payment
              </h2>
            </div>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Payments through LoyaltyPay are instantly transformed into loyalty experiences designed to keep customers coming back.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <FeatureCard
            title="NFT Loyalty Cards"
            description="Beautiful, tradable NFT loyalty cards that level up as customers make more purchases."
            icon="🏆"
          />
          <FeatureCard
            title="Automatic Rewards"
            description="Set up thresholds and let LoyaltyPay automatically apply discounts when customers reach loyalty milestones."
            icon="💰"
          />
          <FeatureCard
            title="Blockchain Powered"
            description="Secure, transparent, and decentralized rewards system built on Solana's fast and low-cost blockchain."
            icon="⚡"
          />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-gray-800/30 dark:to-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800 dark:text-white">
              Payments just<br />got an upgrade
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              NFTs, automated refunds, and loyalty tools make it effortless to supercharge your customer relationships.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-10">
              <BenefitItem
                title="Digital Collectibles"
                description="Loyalty cards are unique NFTs that customers can collect, trade, and show off in their wallet."
              />
              <BenefitItem
                title="Customizable Rewards"
                description="Set your own reward thresholds and refund percentages to create the perfect loyalty program."
              />
              <BenefitItem
                title="Smart Refunds"
                description="Automatic refunds are triggered when loyalty milestones are reached, no manual intervention needed."
              />
            </div>
            <div className="relative">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-200 dark:bg-purple-900/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-200 dark:bg-indigo-900/30 rounded-full blur-3xl" />
              <div className="relative bg-white dark:bg-gray-700 p-8 rounded-2xl shadow-xl">
                <div className="aspect-square w-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                  <div className="text-9xl animate-bounce">🎁</div>
                </div>
                <div className="mt-8 space-y-4">
                  <div className="h-8 bg-gray-100 dark:bg-gray-600 rounded-lg w-2/3"></div>
                  <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded-lg"></div>
                  <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded-lg w-5/6"></div>
                  <div className="h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mt-6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-8 text-gray-800 dark:text-white">
            It&apos;s time.<br />Get Loyalty Pay
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
            Your payment system has the power to shape your business. And life is too short for unhappy customers.
            Get LoyaltyPay, and let&apos;s shape the future of merchant-customer relationships, together.
          </p>
          
          {connected ? (
            <div className="flex flex-col md:flex-row justify-center items-center gap-4">
              <Link 
                href={`/customer/${publicKey?.toString()}`}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium text-lg shadow-lg hover:shadow-xl transition-all inline-block"
              >
                For Customers
              </Link>
              <span className="text-gray-500 dark:text-gray-400">or</span>
              <Link 
                href={`/merchant/${publicKey?.toString()}`}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium text-lg shadow-lg hover:shadow-xl transition-all inline-block"
              >
                For Merchants
              </Link>
            </div>
          ) : (
            <div className="relative inline-block group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
              <WalletMultiButton className="!relative !bg-indigo-600 !hover:bg-indigo-700 !text-white !px-8 !py-4 !rounded-lg !font-medium !text-lg !shadow-lg !hover:shadow-xl !transition-all" />
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 md:px-8 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">LoyaltyPay</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Powered by Solana</p>
          </div>
          <div className="flex space-x-6">
            <Link href="#" className="text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">
              Twitter
            </Link>
            <Link href="#" className="text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">
              Discord
            </Link>
            <Link href="#" className="text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">
              GitHub
            </Link>
          </div>
        </div>
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Made with ❤️ on Solana</p>
          <p className="mt-2">© {new Date().getFullYear()} LoyaltyPay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group">
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-0 group-hover:opacity-20 transition duration-300"></div>
        <div className="relative text-4xl mb-4">{icon}</div>
      </div>
      <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

function BenefitItem({ title, description }: { title: string, description: string }) {
  return (
    <div className="hover:translate-x-1 transition-all duration-300">
      <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full"></span>
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300 ml-4">{description}</p>
    </div>
  );
}
