import path from 'path';
import fs from 'fs';
import { ERC20Bridge__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20Bridge__factory';
import { ArbitrumNetwork, mapL2NetworkToArbitrumNetwork, registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { init } from '../common/utils';
import { ethers } from 'ethers';

export const registerCustomNetwork = async () => {
  const { parentProvider } = init();
  const SCRIPT_L2L3_NETWORK = path.join(__dirname, 'l2l3network.json');
  // const SCRIPT_L2L3_NETWORK = path.join(__dirname, 'IT-DEV-l3.json');
  const dka_network = JSON.parse(fs.readFileSync(SCRIPT_L2L3_NETWORK).toString());
  const network = mapL2NetworkToArbitrumNetwork({ ...dka_network.l2Network });

  const nativeToken = await getNativeTokenAddress(network,parentProvider)
  network.nativeToken = nativeToken
  registerCustomArbitrumNetwork(network);  
};

export const getNativeTokenAddress = async (network: ArbitrumNetwork, parentProvider: ethers.providers.JsonRpcProvider) => {
  try {
    const brdige = ERC20Bridge__factory.connect(network.ethBridge.bridge, parentProvider);
    return await brdige.nativeToken();
  } catch (error) {
    return '';
  }
};
