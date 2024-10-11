import { ArbRetryableTx__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbRetryableTx__factory';
import { init } from '../common/\butils';
import { ARB_RETRYABLE_TX_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { getRetryableEscrowAddress } from './common';
import { BigNumber } from 'ethers';
import { logGapBalance } from '../common/logs';
import { ChildTransactionReceipt, ParentTransactionReceipt } from '@arbitrum/sdk';

/**
 * ts-node retryable-ticket/redeem-ticket.ts
 */
async function redeem() {
  const { childSigner, childProvider,parentProvider,parentSigner } = init();

  const retryableId = '0x5c362a03e647011690363f507c59e8e0a2098b5ee1382acb9a93561f00a1adfe';
  const arbRetryableTx = ArbRetryableTx__factory.connect(ARB_RETRYABLE_TX_ADDRESS, childSigner);

  arbRetryableTx.cancel
  const lifetime = await arbRetryableTx.getLifetime()
  console.log("lifetime : ",lifetime);
  
  const timeout = await arbRetryableTx.getTimeout(retryableId)
  console.log("timeout: ",timeout);
  
  const callValueRefundAddress = await arbRetryableTx.getBeneficiary(retryableId);
  const escrowAddress = getRetryableEscrowAddress(retryableId);
  
  const beforeRefundKda = await childProvider.getBalance(callValueRefundAddress);
  const beforeEscrow = await childProvider.getBalance(escrowAddress);
  
  const redeemRes = await arbRetryableTx.redeem(retryableId, { gasLimit: 580000 });
  
  const receipt = await redeemRes.wait();
  console.log(redeemRes);
  console.log();
  console.log(receipt);
  console.log();
  
  const afterRefundKda = await childProvider.getBalance(callValueRefundAddress);
  const afterEscrow = await childProvider.getBalance(escrowAddress);

  logGapBalance('Escrow', escrowAddress, beforeEscrow, afterEscrow, 'DKA');
  logGapBalance('CallValueRefund', callValueRefundAddress, beforeRefundKda, afterRefundKda, 'DKA');
}

(async () => {
  await redeem();
})();
