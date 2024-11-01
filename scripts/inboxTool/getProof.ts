import { ChildTransactionReceipt } from "@arbitrum/sdk";
import { ethers } from "ethers";
import { registerCustomNetwork } from "../../network/register";


/**
 * ts-node scripts/inboxTool/getProof.ts
 */
async function main() {
    await registerCustomNetwork();

    const parentProvider = new ethers.providers.JsonRpcProvider(
      process.env.PARENT_CHAIN_URL
    );
    const childProvider = new ethers.providers.JsonRpcProvider(
      process.env.CHILD_CHAIN_URL
    );
    const withdrawTxHash =
    "0xa4d754acb513d66f2b7261c0f51a868d6346f6aab59a2db7596be0418d2e88d4";
    const receipt = await childProvider.getTransactionReceipt(withdrawTxHash);

    const withdrawtMessage = new ChildTransactionReceipt(receipt);
    const l2ToL1TxMessages = await withdrawtMessage.getChildToParentMessages(
        parentProvider
      );
      const l2ToL1TxMessage = l2ToL1TxMessages[0]

      const proofs = await l2ToL1TxMessage.getOutboxProof(childProvider)

      console.log(proofs);
      
}

(async () => {
    await main();
  })();
  