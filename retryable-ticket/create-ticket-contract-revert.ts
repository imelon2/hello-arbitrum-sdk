import { Erc20Bridger, getArbitrumNetwork, ParentToChildMessageGasEstimator, ParentTransactionReceipt } from '@arbitrum/sdk';
import { BigNumber, ethers } from 'ethers';
import { ChildGreeter__factory } from '../build/types';
import { registerCustomNetwork } from '../network/register';
import { ERC20Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20Inbox__factory';
import { ERC20Bridge__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20Bridge__factory';
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory';
import { ParentToChildMessageNoGasParams } from '@arbitrum/sdk/dist/lib/message/ParentToChildMessageCreator';
import { formatEther, hexDataLength, parseEther } from 'ethers/lib/utils';
import { ansi, logDeliverdEvent, logGapBalance, logInboxMessageEvent, logRetrayableTicketResult, logRetryableTicketParams } from '../common/logs';
import { getRetryableEscrowAddress, readContract } from './common';
import { init } from '../common/\butils';


/**
 * ts-node retryable-ticket/create-ticket-contract-revert.ts
 */
async function createTicket() {
  try {
    const {childProvider,parentProvider, parentSigner } = init()

    registerCustomNetwork();
    const { childGreeterAddr } = readContract();
    const { ethBridge } = await getArbitrumNetwork(childProvider);

    /** If Child Network use ETH, should be use `Inbox__factory` */
    const inbox = ERC20Inbox__factory.connect(ethBridge.inbox, parentSigner);
    const bridge = ERC20Bridge__factory.connect(ethBridge.bridge, parentSigner);
    const nativeTokenAddr = await bridge.nativeToken();
    const nativeToken = ERC20__factory.connect(nativeTokenAddr, parentSigner);

    /** Child Network use Gas Token, should be approve */
    const allowance = await nativeToken.allowance(parentSigner.address, inbox.address);
    if (allowance.toString() === '0') {
      const res = await nativeToken.approve(inbox.address, Erc20Bridger.MAX_APPROVAL /** uint256.max */);
      const receipt = await res.wait();
      console.log(`Approve max balance to inbox : ${receipt.transactionHash}`);
    }

    const IChildGreeter = ChildGreeter__factory.createInterface();
    const calldataSuccess = IChildGreeter.encodeFunctionData('callForRevert', [true]);

    const estimator = new ParentToChildMessageGasEstimator(childProvider);

    const gasPriceBid = await estimator.estimateMaxFeePerGas(); // current gas price + 500%
    const submissionFee = await estimator.estimateSubmissionFee(
      parentProvider,
      gasPriceBid,
      hexDataLength(calldataSuccess) // calldata length
    ); // submissionFee + 300%

    const l2CallValue = parseEther('0.1');
    const retryableEstimateParam: ParentToChildMessageNoGasParams = {
      from: parentSigner.address,
      to: childGreeterAddr,
      l2CallValue: l2CallValue,
      excessFeeRefundAddress: '0x0000000000000000000000000000000000000011', // for identify
      callValueRefundAddress: '0x0000000000000000000000000000000000000022', // for identify
      data: calldataSuccess,
    };

    const beforeExcessDka = await childProvider.getBalance(retryableEstimateParam.excessFeeRefundAddress);
    const beforeRefundDka = await childProvider.getBalance(retryableEstimateParam.callValueRefundAddress);
    const beforeDka = await childProvider.getBalance(parentSigner.address);

    const gasLimit = await estimator.estimateRetryableTicketGasLimit(retryableEstimateParam)
    // const gasLimit = (await estimator.estimateRetryableTicketGasLimit(retryableEstimateParam)).mul(2);
    const callValue = submissionFee.add(gasPriceBid.mul(gasLimit)).add(l2CallValue);

    const calldataRevert = IChildGreeter.encodeFunctionData('callForRevert', [false]);
    retryableEstimateParam.l2CallValue = l2CallValue;
    retryableEstimateParam.data = calldataRevert;

    logRetryableTicketParams(retryableEstimateParam, submissionFee, gasLimit, gasPriceBid, callValue);

    // Create and Send createRetryable ticket to Child Chain
    const res = await inbox.createRetryableTicket(
      retryableEstimateParam.to,
      retryableEstimateParam.l2CallValue,
      submissionFee,
      retryableEstimateParam.excessFeeRefundAddress,
      retryableEstimateParam.callValueRefundAddress,
      gasLimit,
      gasPriceBid,
      callValue,
      calldataRevert,
      {} // override
    );

    const receipt = await res.wait();
    const depositMessage = new ParentTransactionReceipt(receipt);
    const inboxEvent = depositMessage.getInboxMessageDeliveredEvents();
    const deliverdEvent = depositMessage.getMessageDeliveredEvents();

    console.log(`${ansi.BrightWhite}# inbox.createRetryableTicket Tx Result${ansi.reset}`);
    console.log(`- transaction hash : ${receipt.transactionHash}\n`);
    // logInboxMessageEvent(inboxEvent)
    // logDeliverdEvent(deliverdEvent)

    // get child chain info
    const childDepositMessages = await depositMessage.getParentToChildMessages(childProvider);

    console.warn(`${ansi.BrightBlue}Now we wait for child chain of the retrayable ticket to be executed ⏳\n${ansi.reset}`);
    await childDepositMessages[0].waitForStatus();

    for (let i = 0; i < childDepositMessages.length; i++) {
      const receipt = await logRetrayableTicketResult(childDepositMessages[i]);

      const escrowAddress = getRetryableEscrowAddress(receipt.transactionHash);
      const afterExcessDka = await childProvider.getBalance(retryableEstimateParam.excessFeeRefundAddress);
      const afterRefundDka = await childProvider.getBalance(retryableEstimateParam.callValueRefundAddress);
      const afterDka = await childProvider.getBalance(parentSigner.address);
      const escrowDka = await childProvider.getBalance(escrowAddress!);

      console.log();
      logGapBalance('Escrow', escrowAddress, BigNumber.from(0), escrowDka, 'DKA');
      logGapBalance('Sender', parentSigner.address, beforeDka, afterDka, 'DKA');
      logGapBalance('ExcessFeeRefund', retryableEstimateParam.excessFeeRefundAddress, beforeExcessDka, afterExcessDka, 'DKA');
      logGapBalance('CallValueRefund', retryableEstimateParam.callValueRefundAddress, beforeRefundDka, afterRefundDka, 'DKA');
    }
  } catch (error) {
    console.log(error);
  }
}


(async () => {
  await createTicket();
})();
