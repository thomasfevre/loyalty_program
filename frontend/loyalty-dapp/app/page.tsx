'use client'
import Link from 'next/link';
import React from 'react';

const HomePage: React.FC = () => {
  
  const getSolPriceInUsd = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      return data.solana.usd || 0; // Return the SOL price or 0 if not available
    } catch (error) {
      console.error("Error fetching SOL price:", error);  
      return 0; // Return 0 in case of an error
    }
  };

  React.useEffect(() => {
    const fetchPrice = async () => {
      const price = await getSolPriceInUsd();
      setSolPrice(price);
    };
    fetchPrice();
  }, []);

  const [solPrice, setSolPrice] = React.useState<number>(0);
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>Welcome to the Solana Loyalty Program</h1>
      <p>Current SOL Price: ${solPrice}</p>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/merchant">
          <button style={{ marginRight: '1rem' }}>Merchant Page</button>
        </Link>
        <Link href="/customer">
          <button>Customer Page</button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;