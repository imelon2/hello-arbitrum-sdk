import { getArbitrumNetwork } from "@arbitrum/sdk";
import { ERC20__factory } from "@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory";
import { init } from "../../common/utils";
import { registerCustomNetwork } from "../../network/register";
import { formatEther } from "ethers/lib/utils";


/**
 * ts-node scripts/common/getBalance.ts
 */
async function main() {
    const { childSigner, childProvider, parentProvider, parentSigner } = init();

    await registerCustomNetwork();
    const network = await getArbitrumNetwork(childProvider);
  
    const erc20Dka = ERC20__factory.connect(network.nativeToken!,parentProvider)

    const parentDkaBalance = await erc20Dka.balanceOf(parentSigner.address)
    const childDkaBalance = await childProvider.getBalance(childSigner.address)

    const log = {
        "Parent": formatEther(parentDkaBalance) + " DKA",
        "Child": formatEther(childDkaBalance) + " DKA"
    }

    console.table(log)

}
(async () => {
    await main();
  })();
  