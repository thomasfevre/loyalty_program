The project is a Solana-based loyalty rewards dApp that enables merchants to create on-chain loyalty programs for their customers.
🛠️ Currently building 🛠️


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

En français :
on a une page « merchant » où on se connecte avec phantom et on choisi le montant que l’on veut « facturer », on génère un Qr-code pour que le client le scanne.
Ensuite on écoute la blockchain et dès que c’est validé —> on mint un soul bound NFT dynamic au client (+ création du PDA avec ses points de fidélité)
Ensuite à chaque achat, ses points de fidélité augmentent et son NFT évolue en fonction de 4 niveaux ( cf les 4 images) 
Une fois passé le dernier niveau, le client se verra rembourser un pourcentage (ex:15%) de son prochain achat (fonction du programme)

## Loyalty NFT Levels

The loyalty program includes four dynamic NFT levels, each represented by a unique image. These images are stored in the `/public/baguettes` folder:

1. **Level 1**: `/public/baguettes/common_2.png`
2. **Level 2**: `/public/baguettes/rare_4.png`
3. **Level 3**: `/public/baguettes/epic_1.png`
4. **Level 4**: `/public/baguettes/legendary_2.png`

As customers make purchases, their loyalty NFT evolves through these levels, reflecting their progress in the program.


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
