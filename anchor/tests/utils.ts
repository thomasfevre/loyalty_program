// test-utilities.ts
import {
    Connection,
    Keypair,
    PublicKey,
    TransactionSignature,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
    Program,
    AnchorProvider,
    setProvider,
    workspace,
    BN
} from '@coral-xyz/anchor';
import { LoyaltyProgram } from '../target/types/loyalty_program';
import {
    createMetadataAccountV3,
    MPL_TOKEN_METADATA_PROGRAM_ID as METADATA_PROGRAM_ID
} from '@metaplex-foundation/mpl-token-metadata';
import {
    createMint
} from '@solana/spl-token';
import {
    deriveLoyaltyPDA,
    generateSolanaPayURL
} from '../LoyaltyPay/accountUtils/getPDAs';

// Mock test data
export const MOCK_USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // Devnet USDC

export class TestWallet {
    constructor(readonly payer: Keypair) { }

    async signTransaction(tx: Transaction): Promise<Transaction> {
        tx.partialSign(this.payer);
        return tx;
    }

    async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
        return txs.map((tx) => {
            tx.partialSign(this.payer);
            return tx;
        });
    }

    get publicKey(): PublicKey {
        return this.payer.publicKey;
    }
}

export class LoyaltyPayTestUtils {
    program: Program<LoyaltyProgram>;
    connection: Connection;
    merchantWallet: TestWallet;
    customerWallet: TestWallet;
    provider: AnchorProvider;

    constructor(
        connection: Connection,
        merchantKeypair: Keypair = Keypair.generate(),
        customerKeypair: Keypair = Keypair.generate()
    ) {
        this.connection = connection;
        this.merchantWallet = new TestWallet(merchantKeypair);
        this.customerWallet = new TestWallet(customerKeypair);

        // Create provider with merchant wallet
        this.provider = new AnchorProvider(
            connection,
            this.merchantWallet,
            AnchorProvider.defaultOptions()
        );
        setProvider(this.provider);

        // Get program
        this.program = workspace.LoyaltyPay as Program<LoyaltyProgram>;
    }

    /**
     * Fund a wallet with SOL for testing
     */
    async fundWallet(wallet: PublicKey, amount: number = 1): Promise<TransactionSignature> {
        const tx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: this.provider.wallet.publicKey,
                toPubkey: wallet,
                lamports: amount * LAMPORTS_PER_SOL,
            })
        );

        return await sendAndConfirmTransaction(this.connection, tx, [
            (this.provider.wallet as TestWallet).payer
        ]);
    }

    /**
     * Create a mock USDC payment from customer to merchant
     */
    async mockUsdcPayment(
        amount: number,
        reference: PublicKey
    ): Promise<PublicKey> {
        // In real app this would be initiated by scanning QR code
        // For tests, we'll simulate the payment directly

        // Create a transaction with reference
        const tx = new Transaction();

        // Add memo with reference to track payment
        tx.add(
            SystemProgram.transfer({
                fromPubkey: this.customerWallet.publicKey,
                toPubkey: this.merchantWallet.publicKey,
                lamports: new BN(amount * (10 ** 6)).toNumber(), // USDC has 6 decimals
            })
        );

        // Add reference to transaction
        tx.feePayer = this.customerWallet.publicKey;
        tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

        // Sign and send transaction
        const signedTx = await this.customerWallet.signTransaction(tx);
        const txid = await this.connection.sendRawTransaction(signedTx.serialize());
        await this.connection.confirmTransaction(txid);

        return this.customerWallet.publicKey;
    }

    /**
     * Create loyalty account between merchant and customer
     */
    async createLoyaltyAccount(
        nftMint: PublicKey
    ): Promise<TransactionSignature> {
        const loyaltyPDA = deriveLoyaltyPDA(
            this.merchantWallet.publicKey,
            this.customerWallet.publicKey,
            this.connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet-beta'
        );

        return await this.program.methods
            .processPayment(new BN(1), nftMint)
            .accounts({
                customer: this.customerWallet.publicKey,
                merchant: this.merchantWallet.publicKey,
                loyaltyCard: loyaltyPDA,
                systemProgram: SystemProgram.programId,
            })
            .signers([(this.provider.wallet as TestWallet).payer])
            .rpc();
    }

    /**
     * Create a mock NFT mint for testing
     */
    async createMockNftMint(): Promise<PublicKey> {
        const mint = await createMint(
            this.connection,
            (this.merchantWallet as TestWallet).payer,
            this.merchantWallet.publicKey,
            this.merchantWallet.publicKey,
            0 // 0 decimals for NFTs
        );

        // Create metadata account for the NFT
        const [metadataAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata'),
                (new PublicKey(METADATA_PROGRAM_ID)).toBuffer(),
                mint.toBuffer(),
            ],
            new PublicKey(METADATA_PROGRAM_ID)
        );

        const metadataIx = createMetadataAccountV3(
            {
                metadata: metadataAccount,
                mint,
                mintAuthority: this.merchantWallet.publicKey,
                payer: this.merchantWallet,
                updateAuthority: this.merchantWallet.publicKey,
            },
            {
                createMetadataAccountArgsV3: {
                    data: {
                        name: 'Loyalty NFT',
                        symbol: 'LOYAL',
                        uri: 'https://example.com/metadata.json',
                        sellerFeeBasisPoints: 0,
                        creators: [
                            {
                                address: this.merchantWallet.publicKey,
                                verified: true,
                                share: 100,
                            },
                        ],
                        collection: null,
                        uses: null,
                    },
                    isMutable: true,
                    collectionDetails: null,
                },
            }
        );

        const tx = new Transaction().add(metadataIx);
        await sendAndConfirmTransaction(this.connection, tx, [(this.merchantWallet as TestWallet).payer]);

        return mint;
    }

    /**
     * Setup a complete test environment with funded wallets
     */
    async setupTestEnvironment(): Promise<void> {
        // Fund wallets
        await this.fundWallet(this.merchantWallet.publicKey, 2);
        await this.fundWallet(this.customerWallet.publicKey, 2);

        console.log('Test environment set up with funded wallets');
        console.log(`Merchant: ${this.merchantWallet.publicKey.toString()}`);
        console.log(`Customer: ${this.customerWallet.publicKey.toString()}`);
    }

    /**
     * Generate a test QR code URL
     */
    generateTestPaymentQR(amount: number): string {
        const reference = Keypair.generate().publicKey;
        return generateSolanaPayURL(
            this.merchantWallet.publicKey,
            amount,
            reference
        ).toString();
    }

    /**
     * Simulate QR payment flow
     */
    async simulateFullPaymentFlow(amount: number = 1): Promise<{
        reference: PublicKey;
        payerPubKey: PublicKey;
        nftMint: PublicKey;
        loyaltyPDA: PublicKey;
    }> {
        // 1. Generate reference for payment tracking
        const reference = Keypair.generate().publicKey;

        // 2. Mock payment (in real app this would be via QR code scan)
        const payerPubKey = await this.mockUsdcPayment(amount, reference);

        // 3. Create NFT mint for loyalty tracking
        const nftMint = await this.createMockNftMint();

        // 4. Create loyalty account
        await this.createLoyaltyAccount(nftMint);

        // 5. Get loyalty PDA
        const loyaltyPDA = deriveLoyaltyPDA(
            this.merchantWallet.publicKey,
            this.customerWallet.publicKey,
            this.connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet-beta'
        );

        return {
            reference,
            payerPubKey,
            nftMint,
            loyaltyPDA,
        };
    }

    /**
     * Fetch loyalty card data
     */
    async getLoyaltyCardData(loyaltyPDA: PublicKey): Promise<any> {
        try {
            return await this.program.account.loyaltyCard.fetch(loyaltyPDA);
        } catch (err) {
            console.error('Error fetching loyalty card data:', err);
            return null;
        }
    }
}

/**
 * Mock implementation of loyalty program PDA derivation
 */
export const mockDeriveLoyaltyPDA = (
    merchantPubkey: PublicKey,
    customerPubkey: PublicKey
): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('loyalty_card'),
            merchantPubkey.toBuffer(),
            customerPubkey.toBuffer(),
        ],
        new PublicKey('LoyaPXq6pKmdZvnuyN2L3XU4hBu5EzGikK5BQUzHhdj') // Sample program ID
    );
};

/**
 * Mock NFT ownership check function
 */
export const mockDoesCustomerOwnMerchantAsset = async (
    customerPubkey: string,
    merchantPubkey: string
): Promise<boolean> => {
    // For testing, return configurable result
    return true; // Can be modified for different test scenarios
};