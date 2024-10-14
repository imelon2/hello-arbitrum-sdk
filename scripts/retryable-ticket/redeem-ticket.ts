import { ArbRetryableTx__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbRetryableTx__factory';
import { init } from '../../common/utils';
import { ARB_RETRYABLE_TX_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { getRetryableEscrowAddress } from './common';
import { BigNumber } from 'ethers';
import { logGapBalance, logTransactionGap } from '../../common/logs';
import { ChildTransactionReceipt, ParentTransactionReceipt } from '@arbitrum/sdk';

/**
 * ts-node scripts/retryable-ticket/redeem-ticket.ts
 */
async function redeem() {
  const { childSigner, childProvider,parentProvider,parentSigner } = init();

  const retryableId = '0x253e68e316cc54d2d87f329b9c2ca21d771cf0a0bbacb388e7384bff5e567a2e';
  const arbRetryableTx = ArbRetryableTx__factory.connect(ARB_RETRYABLE_TX_ADDRESS, childSigner);
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
  
  const afterRefundKda = await childProvider.getBalance(callValueRefundAddress);
  const afterEscrow = await childProvider.getBalance(escrowAddress);

  logTransactionGap(receipt)
  logGapBalance('Escrow', escrowAddress, beforeEscrow, afterEscrow, 'DKA');
  logGapBalance('CallValueRefund', callValueRefundAddress, beforeRefundKda, afterRefundKda, 'DKA');
}

(async () => {
  await redeem();
})();
