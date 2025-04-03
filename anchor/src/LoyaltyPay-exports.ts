// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import LoyaltyPayIDL from '../target/idl/loyalty_program.json'
import type { LoyaltyProgram } from '../target/types/loyalty_program'

// Re-export the generated IDL and type
export { LoyaltyProgram, LoyaltyPayIDL }

// The programId is imported from the program IDL.
export const LOYALTY_PAY_PROGRAM_ID = new PublicKey(LoyaltyPayIDL.address)

// This is a helper function to get the LoyaltyPay Anchor program.
export function getLoyaltyPayProgram(provider: AnchorProvider, address?: PublicKey) {
  return new Program({ ...LoyaltyPayIDL, address: address ? address.toBase58() : LoyaltyPayIDL.address } as LoyaltyProgram, provider)
}

// This is a helper function to get the program ID for the LoyaltyPay program depending on the cluster.
export function getLoyaltyPayProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
      // This is the program ID for the LoyaltyPay program on devnet and testnet.
      return new PublicKey('CXccEo3Qk7j67C3KHUD1zmLsyFk4UEXJzFefPKaV7577')
    case 'testnet':
      // This is the program ID for the LoyaltyPay program on devnet and testnet.
      return new PublicKey('6WQoS7AUSzB9dBC1QKCbKRySxZuj6oVYUdTNHtkXYVio')
    case 'mainnet-beta':
    default:
      return LOYALTY_PAY_PROGRAM_ID
  }
}
