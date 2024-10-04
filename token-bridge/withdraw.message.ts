import {
  ChildToParentMessageStatus,
  ChildTransactionReceipt,
} from "@arbitrum/sdk";
import { ethers } from "ethers";
import { registerCustomNetwork } from "../network/register";
import dotenv from 'dotenv';
dotenv.config();

/**
 * 본 스크립트는 Parent -> Child Chain 간 `Native Bridge 입금`의 메시지를 파싱하는 example 코드입니다.
 * ts-node token-bridge/withdraw.message.ts
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
    "0x272bfa0d20a75e95c338f73d51129808e4f2c0cd84eb3a5a47780df08bf8dc85";
  const receipt = await childProvider.getTransactionReceipt(depositTxHash);

  // 부모체인의 입금 메시지 정보를 얻습니다.
  const withdrawtMessage = new ChildTransactionReceipt(receipt);
  
  const l2ToL1TxEvents = withdrawtMessage.getChildToParentEvents();
  const l2ToL1TxMessages = await withdrawtMessage.getChildToParentMessages(
    parentProvider
  );

   for (let i = 0; i < l2ToL1TxEvents.length; i++) {
    const {
      arbBlockNum,
      caller,
      callvalue,
      data,
      destination,
      ethBlockNum,
      timestamp,
    } = l2ToL1TxEvents[i];
    const { position, hash } = l2ToL1TxEvents[i] as any;
    console.log(`# L2 Withdraw(L2ToL1Tx) Event ${i} Result`);
    console.log(`  - hash : ${hash}`);
    console.log(`  - position : ${position}`);
    console.log(`  - arbBlockNum : ${arbBlockNum}`);
    console.log(`  - ethBlockNum : ${ethBlockNum}`);
    console.log(`  - caller : ${caller}`);
    console.log(`  - destination : ${destination}`);
    console.log(`  - callvalue : ${callvalue}`);
    console.log(`  - timestamp : ${timestamp}`);
    console.log(`  - data : ${data}`);
    console.log();
  }
  console.log();

  for (let i = 0; i < l2ToL1TxMessages.length; i++) {
    const l2ToL1TxMessage = l2ToL1TxMessages[i];
    const status = await l2ToL1TxMessage.status(childProvider);

    switch (status) {
      case ChildToParentMessageStatus.CONFIRMED:
        console.log("  - status : CONFIRMED");
        break;
      case ChildToParentMessageStatus.EXECUTED:
        console.log("  - status : EXECUTED");
        break;
      case ChildToParentMessageStatus.UNCONFIRMED:
        console.log("  - status : UNCONFIRMED");
        break;
    }
  }
}

(async () => {
  await main();
})();
