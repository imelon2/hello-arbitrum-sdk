import { Wallet } from "ethers";
import { MulticallV3__factory } from "../../build/types"; 
import { Multicall3 } from "../../build/types/MulticallV3";
import { init } from "../../common/utils";
import { MULTICALL_ADDRESS } from "./constants";
import { parseEther } from "ethers/lib/utils";

/**
 * ts-node scripts/multicall/multi-transfer.ts
 */
async function main() {
    const { childSigner } = init();
    const multicall = MulticallV3__factory.connect(MULTICALL_ADDRESS,childSigner)
    const inter = MulticallV3__factory.createInterface()

    const accountCount = 250
    const perValue = parseEther("0.01")
    const target = new Array(accountCount).fill(0).map((_,i) => {
        logProgress(i,accountCount,"new Wallet")
        return Wallet.createRandom().address
    })

    const call3Values:Multicall3.Call3ValueStruct[] = target.map((account,i) => {
        logProgress(i,accountCount,"create Call3Value")
        return {
            target:account,
            allowFailure:true,
            value:perValue,
            callData:"0x"
        }
    })

    const aggregateRes = await multicall.aggregate3Value(call3Values,{value:perValue.mul(accountCount)})
    const receipt = await aggregateRes.wait()
    console.log(receipt);
    
    const call:Multicall3.CallStruct[] = target.map(account => {
        return {
            target:MULTICALL_ADDRESS,
            callData:inter.encodeFunctionData("getEthBalance",[account])
        }
    })

    
    const {returnData} = await multicall.callStatic.aggregate(call)
    console.log(returnData);
    
}


  void main()

  function logProgress(current: number, total: number,msg :string) {
    // 전체 작업의 10% 단위로 기준을 설정
    const tenPercentStep = Math.floor(total / 10);
  
    // 10%에 도달할 때마다 로그를 출력
    if (current % tenPercentStep === 0 || current === total) {
      const progress = Math.floor((current / total) * 100);
      console.log(`${msg} Progress: ${progress}%`);
    }
  }