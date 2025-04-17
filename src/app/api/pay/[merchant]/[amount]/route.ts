import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { getLoyaltyPayProgram, LOYALTY_PAY_PROGRAM_ID } from '@project/anchor';
import { AnchorProvider, BN } from '@coral-xyz/anchor';

// CONSTANTS
const message = 'Loyalty Pay - Process Payment';
const quickNodeEndpoint = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const connection = new Connection(quickNodeEndpoint, 'confirmed');
const label = 'Loyalty Pay';
const icon = 'https://solana.com/src/img/branding/solanaLogoMark.svg';

// Function to generate a transaction for a specific merchant, amount, and user account
async function generateProcessPaymentTx(
    account: string,
    merchantAddress: string,
    amount: number
) {
    try {
        console.log(`Generating transaction: Account=${account}, Merchant=${merchantAddress}, Amount=${amount}`);
        console.log(`ProgramID : ${LOYALTY_PAY_PROGRAM_ID}`);
        // Create a customer public key from the account string
        const customerPubkey = new PublicKey(account);
        const merchantPubkey = new PublicKey(merchantAddress);

        // Create Anchor provider
        const useAnchorProvider = new AnchorProvider(
            connection,
            {
                publicKey: customerPubkey,
                signTransaction: async () => { throw new Error('Not implemented') },
                signAllTransactions: async () => { throw new Error('Not implemented') }
            },
            {}
        );

        // Get the program using the provider
        const program = getLoyaltyPayProgram(useAnchorProvider, LOYALTY_PAY_PROGRAM_ID);

        // Build the instruction for the payment
        const ix = await program.methods.processPayment(new BN(amount)).accounts({
            customer: customerPubkey,
            merchant: merchantPubkey,
        }).instruction();

        // Create and configure the transaction
        const tx = new Transaction();
        const processPaymentIx = new TransactionInstruction(ix);

        // Set transaction properties
        const latestBlockhash = await connection.getLatestBlockhash();
        tx.feePayer = customerPubkey;
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.add(processPaymentIx);

        // Serialize the transaction
        const serializedTransaction = tx.serialize({
            verifySignatures: false,
            requireAllSignatures: false,
        });

        // Return as base64
        const base64Transaction = serializedTransaction.toString('base64');
        console.log("Transaction generated successfully");
        return base64Transaction;
    } catch (error) {
        console.error("Error generating transaction:", error);
        throw error;
    }
}

// GET handler for initial wallet display
export async function GET(
    request: NextRequest,
    { params }: { params: { merchant: string, amount: string } }
) {
    try {
        // Access params after awaiting the context
        const param = await params;
        const { merchant, amount } = param;
        const merchantAddress = merchant;
        const amountStr = amount;

        console.log(`GET request received for merchant: ${merchantAddress}, amount: ${amountStr}`);

        // Just return basic info, the wallet will make a POST request with the account
        return NextResponse.json({
            label,
            icon,
            message,
        });
    } catch (error) {
        console.error('Error handling GET request:', error);
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}

// POST handler for transaction generation after wallet approval
export async function POST(
    request: NextRequest,
    { params }: { params: { merchant: string, amount: string } }
) {
    try {
        // Access params after awaiting the context
        const param = await params;
        const { merchant, amount } = param;
        const merchantAddress = merchant;
        const amountStr = amount;

        console.log(`POST request received for merchant: ${merchantAddress}, amount: ${amountStr}`);

        // Parse the account data from the request body
        const accountData = await request.text();
        let accountJson;

        try {
            accountJson = JSON.parse(accountData);
        } catch (e) {
            console.error("Error parsing account JSON:", e);
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        const account = accountJson.account;

        console.log(`Processing payment with: Account=${account}, Merchant=${merchantAddress}, Amount=${amountStr}`);

        // Validate all required parameters
        if (!account) {
            return NextResponse.json({ error: 'Missing account in request body' }, { status: 400 });
        }

        if (!merchantAddress) {
            return NextResponse.json({ error: 'Missing merchant in URL path' }, { status: 400 });
        }

        if (!amountStr || isNaN(parseFloat(amountStr))) {
            return NextResponse.json({ error: 'Missing or invalid amount in URL path' }, { status: 400 });
        }

        // Generate the transaction
        const transaction = await generateProcessPaymentTx(account, merchantAddress, parseFloat(amountStr));

        // Return the transaction to the wallet
        return NextResponse.json({
            transaction,
            message
        });
    } catch (error) {
        console.error('Error handling POST request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 