import { getArbitrumNetwork, InboxTools } from '@arbitrum/sdk';
import { ArbSys__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbSys__factory';
import { init } from '../../common/utils';
import { registerCustomNetwork } from '../../network/register';
import { ARB_SYS_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { ethers } from 'ethers';

/**
 * ts-node scripts/inboxTool/send-signed-tx.ts
 */
async function main() {
  const { childSigner, childProvider, parentProvider, parentSigner } = init();

  await registerCustomNetwork();
  const network = await getArbitrumNetwork(childProvider);
  const inboxTool = new InboxTools(parentSigner, network);

  
  const arbsysIface = ArbSys__factory.createInterface();
  const calldata = arbsysIface.encodeFunctionData('withdrawEth', [childSigner.address]);
  
  const childSignedTx = await inboxTool.signChildTx(
    {
      data: calldata,
      to: ARB_SYS_ADDRESS,
      value: parseEther('0.01'),
      gasPrice:parseUnits("0.1",9)
    },
    childSigner
  );

  const childTx = ethers.utils.parseTransaction(childSignedTx);
  console.log("serialize tx : " + childSignedTx);
  console.log(childTx);
  console.log();
  
  const resultsL1 = await inboxTool.sendChildSignedTx(childSignedTx);
  const inboxRec = await resultsL1!.wait();
  console.log(`Withdraw txn initiated on L2! 🙌 ${inboxRec.transactionHash}`);
}

(async () => {
  await main();
})();
