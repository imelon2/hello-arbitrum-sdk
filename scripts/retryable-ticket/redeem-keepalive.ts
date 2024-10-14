import { ArbRetryableTx__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbRetryableTx__factory';
import { ARB_RETRYABLE_TX_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { getRetryableEscrowAddress } from './common';
import { BigNumber } from 'ethers';
import { logGapBalance, logGapTime, logTransactionGap } from '../../common/logs';
import { ChildTransactionReceipt, ParentTransactionReceipt } from '@arbitrum/sdk';
import { init } from '../../common/utils';

/**
 * ts-node scripts/retryable-ticket/redeem-keepalive.ts
 */
async function redeem() {
  const { childSigner, childProvider,parentProvider,parentSigner } = init();

  const retryableId = '0xa500d63fc9ea9e89e84860aee27bf3b983ef2c30143f286748eef2a8e3ef1f68';
  const arbRetryableTx = ArbRetryableTx__factory.connect(ARB_RETRYABLE_TX_ADDRESS, childSigner);

  const lifeTime = await arbRetryableTx.getLifetime()
  const timeoutBefore = (await arbRetryableTx.getTimeout(retryableId)).sub(BigNumber.from(lifeTime))

  const keepaliveRes = await arbRetryableTx.keepalive(retryableId,{gasLimit:1000000})
  const receipt = await keepaliveRes.wait()
  const timeouteAfter = await arbRetryableTx.getTimeout(retryableId)
  
  logTransactionGap(receipt)
  const before = new Date(timeoutBefore.toNumber() * 1000)
  const after = new Date(timeouteAfter.toNumber() * 1000)
  logGapTime(before,after)
}

(async () => {
  await redeem();
})();
