# legacy-LoyaltyPay
The project is a Solana-based loyalty rewards dApp that enables merchants to create on-chain loyalty programs for their customers.
🛠️Already started : 🛠️

https://github.com/thomasfevre/loyalty_program

How It Works
    
Payment & NFT Minting
•    Customers can scan a QR code or interact with the merchant’s system to make a Solana Pay transaction.
•    Once the payment is completed, the system mints a soulbound, upgradable NFT to the customer’s wallet.
•    This NFT acts as a dynamic loyalty card, recording transactions and updating its metadata with each purchase.
Loyalty Tracking & Rewards
•    Every time a customer makes a new payment, the NFT’s metadata updates to reflect the total amount spent.
•    When a predefined spending threshold is reached, the system automatically grants a discount or cashback reward (e.g., 15% off the next purchase).


Main Technologies Used

✅ Solana Blockchain (for payments & NFT-based loyalty cards)
✅ Anchor Framework (for smart contract development)
✅ Umi & Metaplex (for NFT minting and metadata updates)
✅ Solana Pay (for merchant-customer payments)
✅ React (NextJs) & TypeScript (for the frontend)

Potential Use Cases

🔹 Coffee shops & restaurants → Customers earn rewards with each visit.
The project aims to simplify Web3 adoption for businesses by making loyalty rewards seamless and automated on Solana. 🚀

## Français
En français :
on a une page « merchant » où on se connecte avec phantom et on choisi le montant que l’on veut « facturer », on génère un Qr-code pour que le client le scanne.
Ensuite on écoute la blockchain et dès que c’est validé —> on mint un soul bound NFT dynamic au client (+ création du PDA avec ses points de fidélité)
Ensuite à chaque achat, ses points de fidélité augmentent et son NFT évolue en fonction de 4 niveaux ( cf les 4 images) 
Une fois passé le dernier niveau, le client se verra rembourser un pourcentage (ex:15%) de son prochain achat (fonction du programme)

### Loyalty Card Levels

The loyalty program features four levels of NFT evolution based on customer spending. Below are the images representing each level:

1. **Level 1**  
    ![Level 1](./baguettes/common_2.png)

2. **Level 2**  
    ![Level 2](./baguettes/rare_4.png)

3. **Level 3**  
    ![Level 3](./baguettes/epic_1.png)

4. **Level 4**  
    ![Level 4](./baguettes/legendary_2.png)

## Getting Started

### Prerequisites

- Node v18.18.0 or higher

- Rust v1.77.2 or higher
- Anchor CLI 0.30.1 or higher
- Solana CLI 1.18.17 or higher

### Installation

#### Clone the repo

```shell
git clone <repo-url>
cd <repo-name>
```

#### Install Dependencies

```shell
pnpm install
```

#### Start the web app

```
pnpm dev
```

## Apps

### anchor

This is a Solana program written in Rust using the Anchor framework.

#### Commands

You can use any normal anchor commands. Either move to the `anchor` directory and run the `anchor` command or prefix the
command with `pnpm`, eg: `pnpm anchor`.

#### Sync the program id:

Running this command will create a new keypair in the `anchor/target/deploy` directory and save the address to the
Anchor config file and update the `declare_id!` macro in the `./src/lib.rs` file of the program.

You will manually need to update the constant in `anchor/lib/counter-exports.ts` to match the new program id.

```shell
pnpm anchor keys sync
```

#### Build the program:

```shell
pnpm anchor-build
```

#### Start the test validator with the program deployed:

```shell
pnpm anchor-localnet
```

#### Run the tests

```shell
pnpm anchor-test
```

#### Deploy to Devnet

```shell
pnpm anchor deploy --provider.cluster devnet
```

### web

This is a React app that uses the Anchor generated client to interact with the Solana program.

#### Commands

Start the web app

```shell
pnpm dev
```

Build the web app

```shell
pnpm build
```
