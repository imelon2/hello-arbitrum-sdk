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
    "0x8d6fa7ecb5ada52289742c92296ed1a34b4a88db94fe32bd047d497cd09b12b4";
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
  