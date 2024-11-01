import { Erc20Bridger, getArbitrumNetwork, ParentToChildMessageGasEstimator, ParentTransactionReceipt } from '@arbitrum/sdk';
import { BigNumber, ContractTransaction, ethers } from 'ethers';
import { ChildGreeter__factory } from '../../build/types';
import { registerCustomNetwork } from '../../network/register';
import { ERC20Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20Inbox__factory';
import { ERC20Bridge__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20Bridge__factory';
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory';
import { ParentToChildMessageNoGasParams } from '@arbitrum/sdk/dist/lib/message/ParentToChildMessageCreator';
import { hexDataLength, parseEther } from 'ethers/lib/utils';
import { ansi, logDeliverdEvent, logGapBalance, logInboxMessageEvent, logRetrayableTicketResult, logRetryableTicketParams } from '../../common/logs';
import { getRetryableEscrowAddress, isERC20Inbox, readContract } from './common';
import { init } from '../../common/utils';
import { ERC20Inbox } from '@arbitrum/sdk/dist/lib/abi/ERC20Inbox';
import { Inbox } from '@arbitrum/sdk/dist/lib/abi/Inbox';
import { Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Inbox__factory';

/**
 * ts-node scripts/retryable-ticket/create-ticket-contract-revert.ts
 */
async function createTicket() {
  try {
    const { childProvider, parentProvider, parentSigner } = init();

    await registerCustomNetwork();
    const { childGreeterAddr } = readContract();
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
      callValueRefundAddress: parentSigner.address, // for identify
      // callValueRefundAddress: '0x0000000000000000000000000000000000000022', // for identify
      data: calldataSuccess,
    };

    const beforeExcessDka = await childProvider.getBalance(retryableEstimateParam.excessFeeRefundAddress);
    const beforeDka = await childProvider.getBalance(parentSigner.address);

    const gasLimit = await estimator.estimateRetryableTicketGasLimit(retryableEstimateParam);
    // const gasLimit = (await estimator.estimateRetryableTicketGasLimit(retryableEstimateParam)).mul(2);
    const callValue = submissionFee.add(gasPriceBid.mul(gasLimit)).add(l2CallValue);

    const calldataRevert = IChildGreeter.encodeFunctionData('callForRevert', [false]);
    retryableEstimateParam.l2CallValue = l2CallValue;
    retryableEstimateParam.data = calldataRevert;

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
        calldataRevert,
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
        calldataRevert,
        {value:callValue} // override
      );
    }

    const receipt = await res.wait();
    const depositMessage = new ParentTransactionReceipt(receipt);
    const inboxEvent = depositMessage.getInboxMessageDeliveredEvents();
    const deliverdEvent = depositMessage.getMessageDeliveredEvents();

    console.log(`${ansi.BrightWhite}# inbox.createRetryableTicket Tx Result${ansi.reset}`);
    console.log(`- transaction hash : ${receipt.transactionHash}\n`);
    logInboxMessageEvent(inboxEvent);
    logDeliverdEvent(deliverdEvent);

    // get child chain info
    const childDepositMessages = await depositMessage.getParentToChildMessages(childProvider);

    console.warn(`${ansi.BrightBlue}Now we wait for child chain of the retrayable ticket to be executed ⏳\n${ansi.reset}`);
    await childDepositMessages[0].waitForStatus();

    for (let i = 0; i < childDepositMessages.length; i++) {
      const receipt = await logRetrayableTicketResult(childDepositMessages[i]);

      const escrowAddress = getRetryableEscrowAddress(receipt.transactionHash);
      const afterExcessDka = await childProvider.getBalance(retryableEstimateParam.excessFeeRefundAddress);
      const afterDka = await childProvider.getBalance(parentSigner.address);
      const escrowDka = await childProvider.getBalance(escrowAddress!);

      console.log();
      logGapBalance('Escrow', escrowAddress, BigNumber.from(0), escrowDka, 'DKA');
      logGapBalance('ExcessFeeRefund', retryableEstimateParam.excessFeeRefundAddress, beforeExcessDka, afterExcessDka, 'DKA');
      logGapBalance('Sender', parentSigner.address, beforeDka, afterDka, 'DKA');
    }
  } catch (error) {
    console.log(error);
  }
}

(async () => {
  await createTicket();
})();
