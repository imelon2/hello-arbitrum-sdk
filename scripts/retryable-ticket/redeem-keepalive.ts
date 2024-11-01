import { ArbRetryableTx__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbRetryableTx__factory';
import { ARB_RETRYABLE_TX_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { getRetryableEscrowAddress } from './common';
import { BigNumber } from 'ethers';
import { ansi, logGapBalance, logGapTime, logTransactionGap } from '../../common/logs';
import { ChildTransactionReceipt, ParentToChildMessageStatus, ParentTransactionReceipt } from '@arbitrum/sdk';
import { init } from '../../common/utils';
import { registerCustomNetwork } from '../../network/register';
import { formatEther } from 'ethers/lib/utils';

/**
 * ts-node scripts/retryable-ticket/redeem-keepalive.ts
 */
async function redeem() {
  const { childSigner, childProvider,parentProvider,parentSigner } = init();
  await registerCustomNetwork();
  const txHash = "0xeb60392a002b3f459a2022a844c5b76f5b0bd9a9b146cca03f9f06f359fc7061"
  const receipt = await parentProvider.getTransactionReceipt(txHash);
  const ticketMessage = new ParentTransactionReceipt(receipt);
  const retryTicketMessages = await ticketMessage.getParentToChildMessages(childSigner);
  const message = retryTicketMessages[0];
  const retryableCreationReceipt = await message.getRetryableCreationReceipt();

  if (!retryableCreationReceipt) {
    throw new Error('No Retryable Receipt');
  }

  const {callValueRefundAddress} = message.messageData
  const reddemed = await message.getSuccessfulRedeem();

  if (reddemed.status === ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD) {
    const timeout = await message.getTimeout();
    const local = new Date(timeout.toNumber() * 1000)
    console.log(`\n  ${ansi.BrightWhite}status${ansi.reset}  : FUNDS_DEPOSITED_ON_CHILD`);
    console.log(`  ${ansi.BrightWhite}timeout${ansi.reset} : ${local.toLocaleString()}\n`);

} else {
    switch (reddemed.status) {
      case ParentToChildMessageStatus.NOT_YET_CREATED:
        console.log('  status : NOT_YET_CREATED');
        break;
      case ParentToChildMessageStatus.CREATION_FAILED:
        console.log('  status : CREATION_FAILED');
        break;
      case ParentToChildMessageStatus.REDEEMED:
        console.log('  status : ALLREADY REDEEMED');
        break;
      case ParentToChildMessageStatus.EXPIRED:
        console.log('  status : EXPIRED OR DELETE TICKET');
        break;
    }
  }

  const callValueRefundAddressBalance = await childProvider.getBalance(callValueRefundAddress)

  console.log(`  ${ansi.BrightWhite}callValueRefundAddress${ansi.reset}`);
  console.log(`  Address  : ${callValueRefundAddress}`);
  console.log(`  Balance  : ${formatEther(callValueRefundAddressBalance)} DKA`);
  console.log(`  --------------------------------------------`);
  console.log();

  // const retryableId = '0x45261569eb53d996d3c8f7b1a6140ecdfe41c838471e677923e9d6c8fdfc10ce';
  // const arbRetryableTx = ArbRetryableTx__factory.connect(ARB_RETRYABLE_TX_ADDRESS, childSigner);

  // const lifeTime = await arbRetryableTx.getLifetime()
  // const timeoutBefore = (await arbRetryableTx.getTimeout(retryableId)).sub(BigNumber.from(lifeTime))

  // const keepaliveRes = await arbRetryableTx.keepalive(retryableId,{gasLimit:1000000})
  // const receipt = await keepaliveRes.wait()
  // logTransactionGap(receipt)
  // const timeouteAfter = await arbRetryableTx.getTimeout(retryableId)
  
  // const before = new Date(timeoutBefore.toNumber() * 1000)
  // const after = new Date(timeouteAfter.toNumber() * 1000)
  // logGapTime(before,after)
}

(async () => {
  await redeem();
})();
