import {
  ChildToParentMessageStatus,
  ChildTransactionReceipt,
  Erc20Bridger,
  getArbitrumNetwork,
} from "@arbitrum/sdk";

import { L2ArbitrumGateway__factory } from "@arbitrum/sdk/dist/lib/abi/factories/L2ArbitrumGateway__factory"
import { ethers } from "ethers";
import { registerCustomNetwork } from "../network/register";
import dotenv from 'dotenv';
import { parseTypedLogs } from "@arbitrum/sdk/dist/lib/dataEntities/event";
dotenv.config();

/**
 * 본 스크립트는 Parent -> Child Chain 간 `Native Bridge 입금`의 메시지를 파싱하는 example 코드입니다.
 * ts-node brdige-parse/token-withdraw.ts
 */
async function main() {
  registerCustomNetwork();

  const parentProvider = new ethers.providers.JsonRpcProvider(
    process.env.PARENT_CHAIN_URL
  );
  const childProvider = new ethers.providers.JsonRpcProvider(
    process.env.CHILD_CHAIN_URL
  );

  const childNetwork = await getArbitrumNetwork(childProvider);
  
  const withdrawTxHash =
    "0xece5ed0491b2e8ff17ec464ab7e756a261f63b6f9e668b4faa47cc6f40ed5317";
  const receipt = await childProvider.getTransactionReceipt(withdrawTxHash);

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


  const withdrawalInitiatedEvent = parseTypedLogs(
    L2ArbitrumGateway__factory,
    receipt.logs,
    "WithdrawalInitiated(address,address,address,uint256,uint256,uint256)"
  )

  for (let i = 0; i < withdrawalInitiatedEvent.length; i++) {
    const {l1Token,_amount,_exitNum,_from,_l2ToL1Id,_to} = withdrawalInitiatedEvent[i]
    console.log(`# L2 Withdraw(WithdrawalInitiated) Event ${i} Result : `);
    console.log(`  - l1Token : ${l1Token}`);
    console.log(`  - _amount : ${_amount}`);
    console.log(`  - _exitNum : ${_exitNum}`);
    console.log(`  - _from : ${_from}`);
    console.log(`  - _l2ToL1Id : ${_l2ToL1Id}`);
    console.log(`  - _to : ${_to}`);
    console.log();
    
  }

  
  for (let i = 0; i < l2ToL1TxMessages.length; i++) {
    const l2ToL1TxMessage = l2ToL1TxMessages[i];
    const status = await l2ToL1TxMessage.status(childProvider);

    
    switch (status) {
      case ChildToParentMessageStatus.CONFIRMED:
        console.log("# Current status : CONFIRMED");
        break;
      case ChildToParentMessageStatus.EXECUTED:
        console.log("# Current status : EXECUTED");
        break;
      case ChildToParentMessageStatus.UNCONFIRMED:
        console.log("# Current status : UNCONFIRMED");
        break;
    }
  }
}

(async () => {
  await main();
})();
