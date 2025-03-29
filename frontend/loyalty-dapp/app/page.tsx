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
  <div className="text-center p-8">
    <h1 className="text-3xl font-bold mb-4">Welcome to the Solana Loyalty Program</h1>
    <p className="text-lg">Current SOL Price: ${solPrice}</p>
    <div className="mt-8">
    <Link href="/merchant">
      <button className="bg-blue-500 text-white px-4 py-2 rounded mr-4 hover:bg-blue-600">Merchant Page</button>
    </Link>
    <Link href="/customer">
      <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Customer Page</button>
    </Link>
    </div>
  </div>
  );
};

export default HomePage;