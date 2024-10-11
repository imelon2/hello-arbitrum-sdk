import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

type IContract = {
    parentGreeterAddr:string
    childGreeterAddr:string
  }
  
  export const readContract = () => {
    const pathFile = path.join(__dirname,"contract.json")
    return JSON.parse(fs.readFileSync(pathFile, 'utf-8')) as IContract;
  }
  
  // https://github.com/OffchainLabs/nitro/blob/65196bb8eea58e737cc5585f0623033818cf559d/arbos/retryables/retryable.go#L365
  export const getRetryableEscrowAddress = (ticketId : string) => {
    const keccakHash = ethers.utils.solidityKeccak256(["string","bytes"],['retryable escrow', ethers.utils.arrayify(ticketId)]);
    return ethers.utils.getAddress(ethers.utils.hexDataSlice(keccakHash, 12));

  }