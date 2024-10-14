import { ethers } from 'ethers';
import { registerCustomNetwork } from '../../network/register';
import dotenv from 'dotenv';
import { ChildGreeter__factory } from '../../build/types';
import { getArbitrumNetwork } from '@arbitrum/sdk';
import fs from 'fs';
import path from 'path';
import { init } from '../../common/utils';
dotenv.config();

/**
 * ts-node retryable-ticket/deploy.ts
 */
async function deploy() {
  const { childSigner } = init();

  registerCustomNetwork();

  const childGreeter_f = new ChildGreeter__factory(childSigner);

  const childGreeter = await childGreeter_f.deploy();

  console.log(`ChildGreeter address  : ${childGreeter.address}`);
  console.log();

  const pathFile = path.join(__dirname, 'contract.json');

  const data = JSON.parse(fs.readFileSync(pathFile, 'utf-8'));
  data.childGreeterAddr = childGreeter.address;
  const jsonData = JSON.stringify(data, null, 2); // 들여쓰기를 추가하여 보기 좋게 저장
  fs.writeFileSync(pathFile, jsonData, 'utf-8');
}

(async () => {
  await deploy();
})();
