import dotenv from 'dotenv';
import { ethers } from 'ethers';
dotenv.config();

export const init = () => {
  if (!process.env.PARENT_CHAIN_URL) throw new Error('PARENT_CHAIN_URL is required');
  if (!process.env.CHILD_CHAIN_URL) throw new Error('CHILD_CHAIN_URL is required');
  if (!process.env.SIGNER_PK) throw new Error('SIGNER_PK is required');

  const parentProvider = new ethers.providers.JsonRpcProvider(process.env.PARENT_CHAIN_URL);
  const childProvider = new ethers.providers.JsonRpcProvider(process.env.CHILD_CHAIN_URL);
  const parentSigner = new ethers.Wallet(process.env.SIGNER_PK, parentProvider);
  const childSigner = new ethers.Wallet(process.env.SIGNER_PK, childProvider);

  return {
    parentProvider,
    childProvider,
    parentSigner,
    childSigner,
  };
};
