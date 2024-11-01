import {
  EthDepositMessageStatus,
  ParentEthDepositTransactionReceipt,
} from "@arbitrum/sdk";
import { ethers } from "ethers";
import { registerCustomNetwork } from "../../network/register";
import dotenv from 'dotenv';
dotenv.config();

/**
 * 본 스크립트는 Parent -> Child Chain 간 `Native Bridge 입금`의 메시지를 파싱하는 example 코드입니다.
 * ts-node scripts/brdige-parse/native-deposit.ts
 */
async function main() {
  await registerCustomNetwork();

  const parentProvider = new ethers.providers.JsonRpcProvider(
    process.env.PARENT_CHAIN_URL
  );
  const childProvider = new ethers.providers.JsonRpcProvider(
    process.env.CHILD_CHAIN_URL
  );

  const depositTxHash =
    "0x8fe5efbfa63c52e9bbab17386e5ad676f914fa9bb2a860e4d2ea0e60163190df";
  const receipt = await parentProvider.getTransactionReceipt(depositTxHash);

  // 부모체인의 입금 메시지 정보를 얻습니다.
  const depositMessage = new ParentEthDepositTransactionReceipt(receipt);

  const inboxEvent = depositMessage.getInboxMessageDeliveredEvents();
  const deliverdEvent = depositMessage.getMessageDeliveredEvents();

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

  // 자식체인의 입금 메시지 정보를 얻습니다. - 버그로 객체 다시 생성
  const childDepositMessages = await depositMessage.getEthDeposits(
    childProvider
  );
  for (let i = 0; i < childDepositMessages.length; i++) {
    const childDepositMessage = childDepositMessages[i];
    const childTransactionHash = childDepositMessage.childTxHash;
    const childTransactionStatus = await childDepositMessage.status();

    console.log(`  # Child Chain Deposit Result ${i}`);
    console.log(`  - hash : ${childTransactionHash}`);
    switch (childTransactionStatus) {
      case EthDepositMessageStatus.PENDING:
        console.log("  - status : PENDING");
        break;
      case EthDepositMessageStatus.DEPOSITED:
        console.log("  - status : DEPOSITED");
        break;
    }
    console.log();
    console.log(`  - from : ${childDepositMessages[i].from}`);
    console.log(`  - to : ${childDepositMessages[i].to}`);
    console.log(`  - value : ${childDepositMessages[i].value}`);
  }
  console.log();
}

(async () => {
  await main();
})();
