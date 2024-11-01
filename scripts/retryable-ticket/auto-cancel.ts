import { Erc20Bridger, getArbitrumNetwork, ParentToChildMessageGasEstimator, ParentTransactionReceipt } from '@arbitrum/sdk';
import { init } from '../../common/utils';
import { registerCustomNetwork } from '../../network/register';
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory';
import { ERC20Bridge__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20Bridge__factory';
import { ERC20Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20Inbox__factory';
import { ParentToChildMessageNoGasParams } from '@arbitrum/sdk/dist/lib/message/ParentToChildMessageCreator';
import { hexDataLength, parseEther } from 'ethers/lib/utils';
import { ansi, logGapBalance, logGapTime, logRetrayableTicketResult, logRetryableTicketParams } from '../../common/logs';
import { BigNumber, ContractTransaction } from 'ethers';
import { getRetryableEscrowAddress, isERC20Inbox, readGap, saveGap } from './common';
import { ArbRetryableTx__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbRetryableTx__factory';
import { ARB_RETRYABLE_TX_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { ERC20Inbox } from '@arbitrum/sdk/dist/lib/abi/ERC20Inbox';
import { Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Inbox__factory';
import { Inbox } from '@arbitrum/sdk/dist/lib/abi/Inbox';

/**
 * @description if run subscribe event with websocket
 * ts-node scripts/retryable-ticket/auto-cancel.ts
 *
 * @description if print balance after auto-cancel
 * ts-node scripts/retryable-ticket/auto-cancel.ts --gap
 */
async function main() {
  const { childProvider, childSigner, parentProvider, parentSigner } = init();
  await registerCustomNetwork();

  const { ethBridge } = await getArbitrumNetwork(childProvider);
  let inbox: ERC20Inbox | Inbox;

  /** If Child Network use ETH, should be use `Inbox__factory` */
  inbox = ERC20Inbox__factory.connect(ethBridge.inbox, parentSigner);
  const bridge = ERC20Bridge__factory.connect(ethBridge.bridge, parentSigner);

  let nativeTokenAddr;
  try {
    nativeTokenAddr = await bridge.nativeToken();
  } catch (error) {
    nativeTokenAddr = undefined;
  }

  if (nativeTokenAddr) {
    const nativeToken = ERC20__factory.connect(nativeTokenAddr, parentSigner);

    /** Child Network use Gas Token, should be approve */
    const allowance = await nativeToken.allowance(parentSigner.address, inbox.address);
    if (allowance.toString() === '0') {
      const res = await nativeToken.approve(inbox.address, Erc20Bridger.MAX_APPROVAL /** uint256.max */);
      const receipt = await res.wait();
      console.log(`Approve max balance to inbox : ${receipt.transactionHash}`);
    }
  } else {
    inbox = Inbox__factory.connect(ethBridge.inbox, parentSigner);
  }

  try {
    const estimator = new ParentToChildMessageGasEstimator(childProvider);

    const gasPriceBid = await estimator.estimateMaxFeePerGas(); // current gas price + 500%
    const submissionFee = await estimator.estimateSubmissionFee(
      parentProvider,
      gasPriceBid,
      hexDataLength('0x') // calldata length
    ); // submissionFee + 300%

    const recipient = '0xD23196C9b8F4fd5295Af7A79eDAAae25C83B5932';
    const l2CallValue = parseEther('0.01');
    const retryableEstimateParam: ParentToChildMessageNoGasParams = {
      from: parentSigner.address,
      to: recipient,
      l2CallValue: l2CallValue,
      excessFeeRefundAddress: '0x0000000000000000000000000000000000000011', // for identify
      callValueRefundAddress: '0x0000000000000000000000000000000000000aaa', // for identify
      data: '0x',
    };

    const beforeDka = await childProvider.getBalance(parentSigner.address);
    const beforeExcessFeeRefund = await childProvider.getBalance(retryableEstimateParam.excessFeeRefundAddress);
    const beforeValueFeeRefund = await childProvider.getBalance(retryableEstimateParam.callValueRefundAddress);

    const gasLimit = BigNumber.from(100); // ❌ should be >21000
    retryableEstimateParam.l2CallValue = l2CallValue;
    const callValue = submissionFee.add(gasPriceBid.mul(gasLimit)).add(l2CallValue);

    logRetryableTicketParams(retryableEstimateParam, submissionFee, gasLimit, gasPriceBid, callValue);

    // Create and Send createRetryable ticket to Child Chain
    let res: ContractTransaction
    if(isERC20Inbox(inbox)) {
      res = await inbox.createRetryableTicket(
        retryableEstimateParam.to,
        retryableEstimateParam.l2CallValue,
        submissionFee,
        retryableEstimateParam.excessFeeRefundAddress,
        retryableEstimateParam.callValueRefundAddress,
        gasLimit,
        gasPriceBid,
        callValue,
        '0x',
        {} // override
      );
    } else {
      res = await inbox.createRetryableTicket(
        retryableEstimateParam.to,
        retryableEstimateParam.l2CallValue,
        submissionFee,
        retryableEstimateParam.excessFeeRefundAddress,
        retryableEstimateParam.callValueRefundAddress,
        gasLimit,
        gasPriceBid,
        '0x',
        {value:callValue} // override
      );

    }

    const receipt = await res.wait();
    const depositMessage = new ParentTransactionReceipt(receipt);

    console.log(`${ansi.BrightWhite}# inbox.createRetryableTicket Tx Result${ansi.reset}`);
    console.log(`- transaction hash : ${receipt.transactionHash}\n`);

    // get child chain info
    const childDepositMessages = await depositMessage.getParentToChildMessages(childProvider);

    console.warn(`${ansi.BrightBlue}Now we wait for child chain of the retrayable ticket to be executed ⏳\n${ansi.reset}`);
    await childDepositMessages[0].waitForStatus();

    for (let i = 0; i < childDepositMessages.length; i++) {
      const receipt = await logRetrayableTicketResult(childDepositMessages[i]);

      const escrowAddress = getRetryableEscrowAddress(receipt.transactionHash);
      const afterEscrowDka = await childProvider.getBalance(escrowAddress!);
      const afterExcessFeeRefund = await childProvider.getBalance(retryableEstimateParam.excessFeeRefundAddress);
      const afterValueFeeRefund = await childProvider.getBalance(retryableEstimateParam.callValueRefundAddress);
      const afterSenderDka = await childProvider.getBalance(parentSigner.address);

      console.log();
      logGapBalance('Escrow', escrowAddress, BigNumber.from(0), afterEscrowDka, 'DKA');
      logGapBalance('FeeRefunder', retryableEstimateParam.excessFeeRefundAddress, beforeExcessFeeRefund, afterExcessFeeRefund, 'DKA');
      logGapBalance('ValueRefender', retryableEstimateParam.callValueRefundAddress, beforeValueFeeRefund, afterValueFeeRefund, 'DKA');
      logGapBalance('Sender', parentSigner.address, beforeDka, afterSenderDka, 'DKA');

      saveGap('escrow', escrowAddress, afterEscrowDka);
      saveGap('feeRefender', retryableEstimateParam.excessFeeRefundAddress, afterExcessFeeRefund);
      saveGap('valueRefender', retryableEstimateParam.callValueRefundAddress, afterValueFeeRefund);
      saveGap('sender', parentSigner.address, afterSenderDka);

      const arbRetryableTx = ArbRetryableTx__factory.connect(ARB_RETRYABLE_TX_ADDRESS, childSigner);
      const timeout = await arbRetryableTx.getTimeout(receipt.transactionHash);
      const before = new Date();
      const after = new Date(timeout.toNumber() * 1000);
      logGapTime(before, after);
    }
  } catch (error) {
    console.log(error);
  }
}

async function getGap() {
  const { childProvider } = init();

  const { sender, feeRefender, valueRefender, escrow } = readGap();
  const afterEscrowDka = await childProvider.getBalance(escrow.address);
  const afterRefenderDka = await childProvider.getBalance(feeRefender.address);
  const afterValueFeeRefund = await childProvider.getBalance(valueRefender.address);
  const afterDka = await childProvider.getBalance(sender.address);

  logGapBalance('Escrow', escrow.address, BigNumber.from(escrow.balance), afterEscrowDka, 'DKA');
  logGapBalance('FeeRefunder', feeRefender.address, BigNumber.from(feeRefender.balance), afterRefenderDka, 'DKA');
  logGapBalance('ValueRefender', valueRefender.address, BigNumber.from(valueRefender.balance), afterValueFeeRefund, 'DKA');
  logGapBalance('Sender', sender.address, BigNumber.from(sender.balance), afterDka, 'DKA');
}

(async () => {
  if (process.argv.slice(2).includes('--gap')) {
    await getGap();
  } else {
    await main();
  }
})();
