import {
  Erc20Bridger,
  getArbitrumNetwork,
  ParentToChildMessageGasEstimator,
  ParentTransactionReceipt,
} from '@arbitrum/sdk';
import { registerCustomNetwork } from '../../network/register';
import { ERC20Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20Inbox__factory';
import { ERC20Bridge__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20Bridge__factory';
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory';
import { ParentToChildMessageNoGasParams } from '@arbitrum/sdk/dist/lib/message/ParentToChildMessageCreator';
import { hexDataLength, parseEther } from 'ethers/lib/utils';
import { ansi, logGapBalance, logRetrayableTicketResult, logRetryableTicketParams } from '../../common/logs';
import { init } from '../../common/utils';

/**
 * ts-node retryable-ticket/create-ticket-transfer.ts
 */
async function createTicket() {
  try {
    const {childProvider,parentProvider, parentSigner } = init()

    registerCustomNetwork();

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

    const estimator = new ParentToChildMessageGasEstimator(childProvider);

    const gasPriceBid = await estimator.estimateMaxFeePerGas(); // current gas price + 500%
    const submissionFee = await estimator.estimateSubmissionFee(
      parentProvider,
      gasPriceBid,
      hexDataLength('0x') // calldata length
    ); // submissionFee + 300%

    const recipient = '0x07C9BF6399012d3DFe6Bb878733D4D6426F9dFE0';
    const l2CallValue = parseEther('0.01');
    const retryableEstimateParam: ParentToChildMessageNoGasParams = {
      from: parentSigner.address,
      to: recipient,
      l2CallValue: l2CallValue,
      excessFeeRefundAddress: parentSigner.address,
      callValueRefundAddress: parentSigner.address,
      data: '0x',
    };

    const beforeDka = await childProvider.getBalance(parentSigner.address);

    const gasLimit = await estimator.estimateRetryableTicketGasLimit(retryableEstimateParam);
    retryableEstimateParam.l2CallValue = l2CallValue;
    const callValue = submissionFee.add(gasPriceBid.mul(gasLimit)).add(l2CallValue);

    logRetryableTicketParams(retryableEstimateParam,submissionFee,gasLimit,gasPriceBid,callValue)

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
      '0x',
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
      const afterDka = await childProvider.getBalance(parentSigner.address);
      
      logGapBalance('Sender', parentSigner.address, beforeDka, afterDka, 'DKA');
    }
  } catch (error) {
    console.log(error);
  }
}

(async () => {
  await createTicket();
})();
