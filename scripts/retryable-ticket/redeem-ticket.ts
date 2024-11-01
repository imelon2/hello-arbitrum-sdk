import { ArbRetryableTx__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbRetryableTx__factory';
import { init } from '../../common/utils';
import { ARB_RETRYABLE_TX_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { getRetryableEscrowAddress } from './common';
import { logGapBalance, logTransactionGap } from '../../common/logs';

/**
 * ts-node scripts/retryable-ticket/redeem-ticket.ts
 */
async function redeem() {
  const { childSigner, childProvider,parentProvider,parentSigner } = init();

  const retryableId = '0xf4bad0ea8de78e34a3a01128669741e8d007dab0b45b01806f216443930eace7';
  const arbRetryableTx = ArbRetryableTx__factory.connect(ARB_RETRYABLE_TX_ADDRESS, childSigner);
  
  const callValueRefundAddress = await arbRetryableTx.getBeneficiary(retryableId);
  const escrowAddress = getRetryableEscrowAddress(retryableId);
  
  const beforeRefundKda = await childProvider.getBalance(callValueRefundAddress);
  const beforeEscrow = await childProvider.getBalance(escrowAddress);
  
  const redeemRes = await arbRetryableTx.redeem(retryableId, { gasLimit: 580000 });
  const receipt = await redeemRes.wait();
  logTransactionGap(receipt)
  
  const afterRefundKda = await childProvider.getBalance(callValueRefundAddress);
  const afterEscrow = await childProvider.getBalance(escrowAddress);

  logGapBalance('Escrow', escrowAddress, beforeEscrow, afterEscrow, 'DKA');
  // logGapBalance('CallValueRefund', callValueRefundAddress, beforeRefundKda, afterRefundKda, 'DKA');
}

(async () => {
  await redeem();
})();
