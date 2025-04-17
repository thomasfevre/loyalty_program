import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MainLayoutContainer } from '@/components/ui/ui-layout'
import { SolanaProvider } from '@/components/solana/solana-provider'
import { ClusterProvider } from '@/components/cluster/cluster-data-access'
import { ReactQueryProvider } from './react-query-provider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LoyaltyPay - Rewards on Solana',
  description: 'Transforming everyday payments into rewarding experiences on Solana',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ReactQueryProvider>
          <ClusterProvider>
            <SolanaProvider>
              <MainLayoutContainer>
                {children}
              </MainLayoutContainer>
              <Toaster position="bottom-right" toastOptions={{
                // Default styles for react-hot-toast (our custom toast will override these)
                style: {
                  background: 'transparent',
                  boxShadow: 'none',
                  padding: 0,
                }
              }} />
            </SolanaProvider>
          </ClusterProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
