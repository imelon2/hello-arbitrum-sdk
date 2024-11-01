import { ArbRetryableTx__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbRetryableTx__factory';
import { init } from '../../common/utils';
import { ARB_RETRYABLE_TX_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { getRetryableEscrowAddress } from './common';
import { BigNumber } from 'ethers';
import { logGapBalance, logTransactionGap } from '../../common/logs';
import { ChildTransactionReceipt, ParentTransactionReceipt } from '@arbitrum/sdk';

/**
 * ts-node scripts/retryable-ticket/cancel-ticket.ts
 */
async function redeem() {
  const { childSigner, childProvider,parentProvider,parentSigner } = init();

  const retryableId = '0xdc11238fdceaa604736e304a65bd9601144407aa43478b1352b02f1844e8f4ba';
  const arbRetryableTx = ArbRetryableTx__factory.connect(ARB_RETRYABLE_TX_ADDRESS, childSigner);
  
  const callValueRefundAddress = await arbRetryableTx.getBeneficiary(retryableId);
  const escrowAddress = getRetryableEscrowAddress(retryableId);
  
  const beforeRefundKda = await childProvider.getBalance(callValueRefundAddress);
  const beforeEscrow = await childProvider.getBalance(escrowAddress);
  
  const redeemRes = await arbRetryableTx.cancel(retryableId, { gasLimit: 580000 });
  
  const receipt = await redeemRes.wait();
  logTransactionGap(receipt)
  const afterRefundKda = await childProvider.getBalance(callValueRefundAddress);
  const afterEscrow = await childProvider.getBalance(escrowAddress);

  logGapBalance('Escrow', escrowAddress, beforeEscrow, afterEscrow, 'DKA');
  logGapBalance('CallValueRefund', callValueRefundAddress, beforeRefundKda, afterRefundKda, 'DKA');
}

(async () => {
  await redeem();
})();
