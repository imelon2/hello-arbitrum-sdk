import {
  ParentToChildMessageStatus,
  ParentTransactionReceipt,
} from "@arbitrum/sdk";
import { ethers } from "ethers";
import { registerCustomNetwork } from "../network/register";
import dotenv from 'dotenv';
dotenv.config();

/**
 * 본 스크립트는 Parent -> Child Chain 간 `Native Bridge 입금`의 메시지를 파싱하는 example 코드입니다.
 * ts-node brdige-parse/token-deposit.ts
 */
async function main() {
  registerCustomNetwork();
  const parentProvider = new ethers.providers.JsonRpcProvider(
    process.env.PARENT_CHAIN_URL
  );
  const childProvider = new ethers.providers.JsonRpcProvider(
    process.env.CHILD_CHAIN_URL
  );

  const depositTxHash =
    "0xc7b06ddd46d59f4cdd4e956cfacd68744d41d9a1dcc4f99756647e496ead7184";
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
    const {
      messageDataHash,
      messageIndex,
      beforeInboxAcc,
      baseFeeL1,
      inbox,
      kind,
      sender,
      timestamp,
    } = deliverdEvent[i];
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
    const { l1Token, _from, _to, _sequenceNumber, _amount } =
      tokenDepositEvent[i];
    console.log(`  # Token Deposit Event ${i}`);
    console.log(`  - sequenceNumber : ${_sequenceNumber}`);
    console.log(`  - l1Token : ${l1Token}`);
    console.log(`  - from : ${_from}`);
    console.log(`  - to : ${_to}`);
    console.log(`  - amount : ${_amount}`);
  }
  console.log();

  // 자식체인의 입금 메시지 정보를 얻습니다.
  const childDepositMessages = await depositMessage.getParentToChildMessages(
    childProvider
  );
  for (let i = 0; i < childDepositMessages.length; i++) {
    const retryableCreationReceipt = await childDepositMessages[
      i
    ].getRetryableCreationReceipt();
    const redeem = await childDepositMessages[i].getSuccessfulRedeem();

    console.log(`  # Child Chain Token Deposit Result ${i}`);
    console.log(`  -  hash: ${retryableCreationReceipt?.transactionHash}`);

    const childTransactionStatus = await childDepositMessages[i].status();
    switch (childTransactionStatus) {
      case ParentToChildMessageStatus.NOT_YET_CREATED:
        console.log("  - status : NOT_YET_CREATED");
        break;
      case ParentToChildMessageStatus.CREATION_FAILED:
        console.log("  - status : CREATION_FAILED");
        break;
      case ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD:
        console.log("  - status : FUNDS_DEPOSITED_ON_CHILD");
        break;
      case ParentToChildMessageStatus.REDEEMED:
        console.log("  - status : REDEEMED");
        break;
      case ParentToChildMessageStatus.EXPIRED:
        console.log("  - status : EXPIRED");
        break;
    }
  }
  console.log();
}

(async () => {
  await main();
})();
