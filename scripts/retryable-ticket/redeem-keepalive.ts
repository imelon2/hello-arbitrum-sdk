import { ArbRetryableTx__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbRetryableTx__factory';
import { ARB_RETRYABLE_TX_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { getRetryableEscrowAddress } from './common';
import { BigNumber } from 'ethers';
import { logGapBalance, logGapTime } from '../../common/logs';
import { ChildTransactionReceipt, ParentTransactionReceipt } from '@arbitrum/sdk';
import { init } from '../../common/\butils';

/**
 * ts-node retryable-ticket/redeem-keepalive.ts
 */
async function redeem() {
  const { childSigner, childProvider,parentProvider,parentSigner } = init();

  const retryableId = '0x5c362a03e647011690363f507c59e8e0a2098b5ee1382acb9a93561f00a1adfe';
  const arbRetryableTx = ArbRetryableTx__factory.connect(ARB_RETRYABLE_TX_ADDRESS, childSigner);

  const timeoutBefore = await arbRetryableTx.getTimeout(retryableId)

  console.log("timeoutBefore : ",timeoutBefore.toNumber());
  
  const keepaliveRes = await arbRetryableTx.keepalive(retryableId,{gasLimit:1000000})
  await keepaliveRes.wait()
  const timeouteAfter = await arbRetryableTx.getTimeout(retryableId)
  
  const before = new Date(timeoutBefore.toNumber() * 1000)
  const after = new Date(timeouteAfter.toNumber() * 1000)
  logGapTime(before,after)
}

(async () => {
  await redeem();
})();
