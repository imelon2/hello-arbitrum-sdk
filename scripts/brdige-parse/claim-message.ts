import { Outbox__factory } from "@arbitrum/sdk/dist/lib/abi/factories/Outbox__factory";
import { registerCustomNetwork } from "../../network/register";
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();
import { getArbitrumNetwork } from "@arbitrum/sdk";

const MAX_EVENT_BLOCK = 43200;

/**
 * 본 스크립트는 Parent Chain의 Outbox.sol에서 발생한 Claim 메시지를 파싱하는 example 코드입니다.
 * @description if search event latest ~ 43200 block
 * ts-node scripts/brdige-parse/claim-message.ts
 *
 * @description if run subscribe event with websocket
 * ts-node scripts/brdige-parse/claim-message.ts --ws
 */
async function main() {
  await registerCustomNetwork();

  const parentProvider = new ethers.providers.JsonRpcProvider(
    process.env.PARENT_CHAIN_URL
  );

  const childProvider = new ethers.providers.JsonRpcProvider(
    process.env.CHILD_CHAIN_URL
  );

  const { ethBridge } = await getArbitrumNetwork(childProvider);
  const outbox = Outbox__factory.connect(ethBridge.outbox, parentProvider);

  const latestBlockNumber = await parentProvider.getBlockNumber();
  const from =
    latestBlockNumber < MAX_EVENT_BLOCK
      ? 0
      : latestBlockNumber - MAX_EVENT_BLOCK;
  const eventType =
    outbox.filters[
      "OutBoxTransactionExecuted(address,address,uint256,uint256)"
    ](); /** to, l2Sender, zero 데이터로 쿼리 시 params 사용*/

  const event = await outbox.queryFilter(eventType, from, "latest");

  event.forEach((data, i) => {
    const { to, l2Sender, zero, transactionIndex } = data.args;
    console.log(`# index ${i} event data`);
    console.log(`  - to : ${to}`);
    console.log(`  - l2Sender : ${l2Sender}`);
    console.log(`  - zero : ${zero}`);
    console.log(`  - transactionIndex : ${transactionIndex}`);
    console.log();
  });
}

async function OutboxEvent() {
  await registerCustomNetwork();

  const childProvider = new ethers.providers.JsonRpcProvider(
    process.env.CHILD_CHAIN_URL
  );

  const parentWebsocket = new ethers.providers.WebSocketProvider(
    process.env.PARENT_CHAIN_WS_URL!
  );

  const { ethBridge } = await getArbitrumNetwork(childProvider);
  const outbox = Outbox__factory.connect(ethBridge.outbox, parentWebsocket);

  const eventType =
    outbox.filters[
      "OutBoxTransactionExecuted(address,address,uint256,uint256)"
    ]();

  outbox.on(eventType, async (to, l2Sender, zero, transactionIndex, txData) => {
    console.log(`OutBoxTransactionExecuted Event Info`);
    console.log(`  - transaction hash : ${txData.transactionHash}`);
    console.log(`  - to : ${to}`);
    console.log(`  - l2Sender : ${l2Sender}`);
    console.log(`  - zero : ${zero}`);
    console.log(`  - transactionIndex : ${transactionIndex}`);
    console.log();
  });
}

(async () => {
  if (process.argv.slice(2).includes("--ws")) {
    await OutboxEvent();
  } else {
    await main();
  }
})();
