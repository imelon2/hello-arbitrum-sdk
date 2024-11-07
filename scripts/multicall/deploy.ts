import { ethers } from "ethers";
import * as path from 'path';
import { init } from "../../common/utils";
import { parseEther } from "ethers/lib/utils";
import { MULTICALL_ADDRESS, MULTICALL_SIGNED_TX } from "./constants";
import { glob, runTypeChain } from 'typechain';

/**
 * ts-node scripts/multicall/deploy.ts
 */
async function main() {
    const { childProvider, childSigner } = init();
    const codeAt = await childProvider.getCode(MULTICALL_ADDRESS)
    if(codeAt == "0x") {
        const sendFee = await childSigner.sendTransaction({
            to:"0x05f32B3cC3888453ff71B01135B34FF8e41263F2",
            value:parseEther('0.1')
        })
        await sendFee.wait()
        const deployMulticallV3 = await childProvider.sendTransaction(MULTICALL_SIGNED_TX)
        const receipt = await deployMulticallV3.wait()
        if(receipt.status == 1) {
            console.log(`Success Deployed MultiCall V3 at ${receipt.contractAddress} | hash: ${receipt.transactionHash}`);
        } else {
            console.log(`Fail Deployed MultiCall V3 | hash: ${receipt.transactionHash}`);
        }
    }

    const cwd = process.cwd();
    const MULTICALL_ABI_ROOT = path.join(cwd, "scripts/multicall",`MulticallV3.json`);
    const allFiles = glob(cwd, [MULTICALL_ABI_ROOT]);
    const filesToProcess = allFiles;
    const count = await runTypeChain({
        cwd,
        allFiles,
        filesToProcess,
        outDir: 'build/types',
        target: 'ethers-v5',
      });
    
      console.log('Types generated successfully ' + count.filesGenerated);
  }


  void main()