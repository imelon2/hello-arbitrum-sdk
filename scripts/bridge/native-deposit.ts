import { ArbitrumNetwork, EthBridger, getArbitrumNetwork } from '@arbitrum/sdk';
import { ethers } from 'ethers';
import { init } from '../../common/utils';
import { registerCustomNetwork } from '../../network/register';

/**
 * Errors originating in Dkargo SDK
 */
export class DkaSdkError extends Error {
  constructor(message: string, public readonly inner?: Error) {
    super(message);

    if (inner) {
      this.stack += '\nCaused By: ' + inner.stack;
    }
  }
}

class DkaBridge extends EthBridger {
  constructor(network: ArbitrumNetwork) {
    super(network);

    if (this.nativeTokenIsEth) {
      throw new DkaSdkError(
        `Dkargo network requires native token address `
      );
    }
  }
}

async function main() {
  const { parentProvider, parentSigner, childSigner, childProvider } = init();
  await registerCustomNetwork();

  const network = await getArbitrumNetwork(childProvider);
  const bridge = new DkaBridge(network);

  // const res = await bridge.approveGasToken({
  //     parentSigner
  // })

  // const receipt = await res.wait()
  // console.log(receipt.transactionHash);
}

void main();
