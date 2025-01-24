import { ChildTransactionReceipt, EventFetcher, ParentToChildMessageStatus, ParentTransactionReceipt } from '@arbitrum/sdk';
import { L2ArbitrumGateway__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L2ArbitrumGateway__factory';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { registerCustomNetwork } from '../../network/register';
dotenv.config();

/**
 * 본 스크립트는 Parent -> Child Chain 간 `Token Bridge 입금`의 메시지를 파싱하는 example 코드입니다.
 * ts-node brdige-parse/token-deposit.ts
 */
async function main() {
  await registerCustomNetwork();
  const parentProvider = new ethers.providers.JsonRpcProvider(process.env.PARENT_CHAIN_URL);
  const childProvider = new ethers.providers.JsonRpcProvider(process.env.CHILD_CHAIN_URL);

  const depositTxHash = '0xf07ce71c937925fab13177321fe0b021c740b2c6d18855f499977979364ee92d';
  const receipt = await parentProvider.getTransactionReceipt(depositTxHash);

  // 부모체인의 입금 메시지 정보를 얻습니다.
  const depositMessage = new ParentTransactionReceipt(receipt);
  const inboxEvent = depositMessage.getInboxMessageDeliveredEvents();
  const deliverdEvent = depositMessage.getMessageDeliveredEvents();
  const tokenDepositEvent = depositMessage.getTokenDepositEvents(); // ✅

  for (let i = 0; i < inboxEvent.length; i++) {
    const { data, messageNum } = inboxEvent[i];
    console.log(`  # Inbox Message Event ${i}`);
    console.log(`  - messageNum : ${messageNum}`);
    console.log(`  - data : ${data}`);
  }
  console.log();

  for (let i = 0; i < deliverdEvent.length; i++) {
    const { messageDataHash, messageIndex, beforeInboxAcc, baseFeeL1, inbox, kind, sender, timestamp } = deliverdEvent[i];
    console.log(`  # Deliverd Event ${i}`);
    console.log(`  - messageIndex : ${messageIndex}`);
    console.log(`  - beforeInboxAcc : ${beforeInboxAcc}`);
    console.log(`  - inbox : ${inbox}`);
    console.log(`  - kind : ${kind}`);
    console.log(`  - sender : ${sender}`);
    console.log(`  - messageDataHash : ${messageDataHash}`);
    console.log(`  - baseFeeL1 : ${baseFeeL1}`);
    console.log(`  - timestamp : ${timestamp}\n`);
  }
  console.log();

  for (let i = 0; i < tokenDepositEvent.length; i++) {
    const { l1Token, _from, _to, _sequenceNumber, _amount } = tokenDepositEvent[i];
    console.log(`  # Token Deposit Event ${i}`);
    console.log(`  - sequenceNumber : ${_sequenceNumber}`);
    console.log(`  - l1Token : ${l1Token}`);
    console.log(`  - from : ${_from}`);
    console.log(`  - to : ${_to}`);
    console.log(`  - amount : ${_amount}`);
  }
  console.log();

  // 자식체인의 입금 메시지 정보를 얻습니다.
  const childDepositMessages = await depositMessage.getParentToChildMessages(childProvider);
  console.log(`  # Child Chain Token Deposit Result`);
  for (let i = 0; i < childDepositMessages.length; i++) {
    const retryableCreationReceipt = await childDepositMessages[i].getRetryableCreationReceipt();
    console.log(`  # Child Chain Token Deposit Result ${i}`);
    console.log(`  -  hash: ${retryableCreationReceipt?.transactionHash}`);
    const childTransactionStatus = await childDepositMessages[i].status();
    switch (childTransactionStatus) {
      case ParentToChildMessageStatus.NOT_YET_CREATED:
        console.log('  - status : NOT_YET_CREATED');
        break;
      case ParentToChildMessageStatus.CREATION_FAILED:
        console.log('  - status : CREATION_FAILED');
        break;
      case ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD:
        console.log('  - status : FUNDS_DEPOSITED_ON_CHILD');
        break;
      case ParentToChildMessageStatus.REDEEMED:
        console.log('  - status : REDEEMED');


        const redeem = await childDepositMessages[i].getSuccessfulRedeem()
        if(redeem.status == ParentToChildMessageStatus.REDEEMED) {
          // redeem 트랜잭션 receipt
          const childTxReceipt = redeem.childTxReceipt

          // event 파싱 클래스 생성
          const eventFetcher = new EventFetcher(childProvider)

          // 이벤트 파싱
          const event = await eventFetcher.getEvents(
            L2ArbitrumGateway__factory,
            contract => 
              contract.filters['DepositFinalized(address,address,address,uint256)'](), // DepositFinalized 이벤트 조회
            {fromBlock:childTxReceipt.blockNumber,toBlock:childTxReceipt.blockNumber,address:childTxReceipt.to}
          )

          // DepositFinalized 이벤트가 없으면 ERC20 입금 트랜잭션x
          /**
           * @description DepositFinalized 이벤트가 없으면 ERC20 입금 트랜잭션x
           * @example
           * transactionHash: 0x1490671fc607eb07b51116849e5011cb75f0050efd4d6876816a9a66d4b64109
           * from: 0x0e0116dF0180f3800900019c06A9D7698670C574
           * to: 0x0e0116dF0180f3800900019c06A9D7698670C574
           * amount: 10000000000000000
           * l1Token: 0xCDb82D5e753038d9B9F8Cb154C8c8FF69E96aeb0
           */
          event.map(e => {
            console.log(`transactionHash: ${e.transactionHash}`);
            console.log(`from: ${e.event._from}`);
            console.log(`to: ${e.event._to}`);
            console.log(`amount: ${e.event._amount}`);
            console.log(`l1Token: ${e.event.l1Token}`);
          })
        }
        
        break;
        case ParentToChildMessageStatus.EXPIRED:
        console.log('  - status : EXPIRED');
        break;
    }
  }
  console.log();
}

(async () => {
  await main();
})();
