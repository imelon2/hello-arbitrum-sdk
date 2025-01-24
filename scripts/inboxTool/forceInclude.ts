import { ArbitrumProvider, getArbitrumNetwork, ParentEthDepositTransactionReceipt } from '@arbitrum/sdk';
import { SequencerInbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/SequencerInbox__factory';
import { init } from '../../common/utils';
import { registerCustomNetwork } from '../../network/register';


/**
 * ts-node scripts/inboxTool/forceInclude.ts
 */
async function main() {
  const { childSigner, childProvider, parentProvider, parentSigner } = init();

  await registerCustomNetwork();
  const network = await getArbitrumNetwork(childProvider);
  const sequencerInbox = SequencerInbox__factory.connect(network.ethBridge.sequencerInbox, parentSigner);
  const arbProvider = new ArbitrumProvider(parentProvider);

  const depositTxHash = '0x44ef19339da128f1327c00a6b842e604688e489f9d466e00e06f2a73a80f5884';
  const receipt = await arbProvider.getTransactionReceipt(depositTxHash);

  // 부모체인의 입금 메시지 정보를 얻습니다.
  const depositMessage = new ParentEthDepositTransactionReceipt(receipt);
  const deliverdEvents = depositMessage.getMessageDeliveredEvents();
  const deliverdEvent = deliverdEvents[0];

  const messageTimestamp = deliverdEvent.timestamp.toNumber();
  const messageBlocknumber = receipt.l1BlockNumber;

  const currentArbBlock = await arbProvider.getBlock('latest');
  const currentL1BlockNumber = currentArbBlock.l1BlockNumber;
  const currentTimestamp = currentArbBlock.timestamp;

  const { delayBlocks, delaySeconds } = await sequencerInbox.maxTimeVariation();
  const checkTime = currentTimestamp - messageTimestamp > delaySeconds.toNumber()
  const checkBlock = currentL1BlockNumber - messageBlocknumber > delayBlocks.toNumber()
  const log = {
    'Current L2': {
      'Timestamp': currentTimestamp,
      'L1 Block': currentL1BlockNumber,
    },
    'Message': {
      'Timestamp': messageTimestamp,
      'L1 Block': messageBlocknumber,
    },
    'can include': {
      'Timestamp': checkTime,
      'L1 Block': checkBlock,
    },
  };

  console.table(log);
  if(checkTime && checkBlock) {
    const res = await sequencerInbox.functions.forceInclusion(
      deliverdEvent.messageIndex.add(1),
      deliverdEvent.kind,
      [messageBlocknumber, deliverdEvent.timestamp],
      deliverdEvent.baseFeeL1,
      deliverdEvent.sender,
      deliverdEvent.messageDataHash
    );
  
    const receipt = await res.wait()
    console.log(receipt);
    
    // const inboxTool = new InboxTools(parentSigner, network);
    // const latestDelayedMessage = await inboxTool.getForceIncludableEvent()
    // console.log(latestDelayedMessage);
  }

}

(async () => {
  await main();
})();
