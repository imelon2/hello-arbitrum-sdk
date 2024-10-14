import { ethers } from 'ethers';
import { registerCustomNetwork } from '../../network/register';
import { RollupAdminLogic__factory } from '@arbitrum/sdk/dist/lib/abi/factories/RollupAdminLogic__factory';
import dotenv from 'dotenv';
import { ArbitrumProvider, getArbitrumNetwork } from '@arbitrum/sdk';
dotenv.config();

/**
 * ts-node scripts/brdige-parse/claim-status.ts
 */
async function main() {
  registerCustomNetwork();

  const parentProvider = new ethers.providers.JsonRpcProvider(process.env.PARENT_CHAIN_URL);

  const childProvider = new ethers.providers.JsonRpcProvider(process.env.CHILD_CHAIN_URL);
  const arbProvider = new ArbitrumProvider(childProvider);

  const { ethBridge } = await getArbitrumNetwork(childProvider);

  const rollup = RollupAdminLogic__factory.connect(ethBridge.rollup, parentProvider);

  const eventType = rollup.filters['NodeConfirmed(uint64,bytes32,bytes32)']();

  rollup.on(eventType, async (nodeNum, blockHash, sendRoot, event) => {
    const { sendCount } = await arbProvider.getBlock(blockHash);

    /**
     * Child Chain에서 출금 시(L2ToL1Tx) 시, position이 부여되며, 해당 트랜잭션이 포함된 블록의 sendCount가 증가한다.
     * 해당 블록이 포함된 RBlock가 확정성을 얻으면, 해당 sendCount 미만 position (sendCount > position) 은 모두 출금 가능 상태가 된다.
     */
    console.log(`Confirmed sendCount : ${sendCount}`);
  });
}

(async () => {
  await main();
})();
