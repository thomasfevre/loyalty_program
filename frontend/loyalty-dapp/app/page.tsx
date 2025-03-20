'use client'
import Link from 'next/link';

const HomePage: React.FC = () => {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>Welcome to the Solana Loyalty Program</h1>
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