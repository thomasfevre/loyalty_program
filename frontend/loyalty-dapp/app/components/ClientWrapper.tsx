'use client';

import React from 'react';
import WalletProviderComponent from './WalletProvider';
import './walletProviderStyles'; // Import the CSS styles

const ClientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <WalletProviderComponent>{children}</WalletProviderComponent>;
};

export default ClientWrapper;