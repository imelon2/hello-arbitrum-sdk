import { BigNumber, ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

type IContract = {
  parentGreeterAddr: string;
  childGreeterAddr: string;
};

type IName = 'escrow' | 'feeRefender' | 'valueRefender' | 'sender';
type IGap = {
  [key in IName] : {
    address:string,
    balance:string
  }
}

export const readContract = () => {
  const pathFile = path.join(__dirname, 'data.json');
  return JSON.parse(fs.readFileSync(pathFile, 'utf-8')) as IContract;
};

export const readGap = () => {
  const pathFile = path.join(__dirname, 'data.json');
  return JSON.parse(fs.readFileSync(pathFile, 'utf-8')).gap as IGap;
};

export const saveGap = (name:IName,address:string,balance:BigNumber) => {
  const pathFile = path.join(__dirname, 'data.json');
  const gap = JSON.parse(fs.readFileSync(pathFile, 'utf-8'))

  gap.gap[name] = {
    address,
    balance:balance.toString()
  }

  fs.writeFileSync(pathFile,JSON.stringify(gap,null," "),'utf-8')
};

// https://github.com/OffchainLabs/nitro/blob/65196bb8eea58e737cc5585f0623033818cf559d/arbos/retryables/retryable.go#L365
export const getRetryableEscrowAddress = (ticketId: string) => {
  const keccakHash = ethers.utils.solidityKeccak256(['string', 'bytes'], ['retryable escrow', ethers.utils.arrayify(ticketId)]);
  return ethers.utils.getAddress(ethers.utils.hexDataSlice(keccakHash, 12));
};
