import { EventArgs, ParentToChildMessageReader, ParentToChildMessageStatus } from '@arbitrum/sdk';
import { MessageDeliveredEvent } from '@arbitrum/sdk/dist/lib/abi/Bridge';
import { ParentToChildMessageNoGasParams } from '@arbitrum/sdk/dist/lib/message/ParentToChildMessageCreator';
import { BigNumber, ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';
import { getRetryableEscrowAddress } from '../retryable-ticket/common';

export const ansi = {
  reset: '\x1b[0m',
  Black: '\x1b[30m',
  Red: '\x1b[31m',
  Green: '\x1b[32m',
  Yellow: '\x1b[33m',
  Blue: '\x1b[34m',
  Magenta: '\x1b[35m',
  Cyan: '\x1b[36m',
  White: '\x1b[37m',
  BrightBlack: '\x1b[30;1m',
  BrightRed: '\x1b[31;1m',
  BrightGreen: '\x1b[32;1m',
  BrightYellow: '\x1b[33;1m',
  BrightBlue: '\x1b[34;1m',
  BrightMagenta: '\x1b[35;1m',
  BrightCyan: '\x1b[36;1m',
  BrightWhite: '\x1b[37;1m',
  RedBg: '\x1b[41m',
  RedGreen: '\x1b[42m',
  SkyBlueBg: '\x1b[46m',
  YellowBg: '\x1b[43m',
  MagentaBg: '\x1b[100m',
};

export const logRetryableTicketParams = (
  param: ParentToChildMessageNoGasParams,
  submissionFee: ethers.BigNumber,
  gasLimit: ethers.BigNumber,
  gasPriceBid: ethers.BigNumber,
  callValue: ethers.BigNumber
) => {
  console.log(`${ansi.BrightWhite}# Retryable Ticket Params${ansi.reset}`);
  console.log(`- to                     : ${param.to}`);
  console.log(`- l2CallValue            : ${param.l2CallValue}`);
  console.log(`- maxSubmissionCost      : ${submissionFee}`);
  console.log(`- excessFeeRefundAddress : ${param.excessFeeRefundAddress}`);
  console.log(`- callValueRefundAddress : ${param.callValueRefundAddress}`);
  console.log(`- gasLimit               : ${gasLimit}`);
  console.log(`- maxFeePerGas           : ${gasPriceBid}`);
  console.log(`- tokenTotalFeeAmount    : ${callValue} (${formatEther(callValue)})`);
  console.log(`- data                   : ${param.data}\n\n`);
};

export const logInboxMessageEvent = (
  e: {
    messageNum: ethers.BigNumber;
    data: string;
  }[]
) => {
	for (let i = 0; i < e.length; i++) {
		const { data, messageNum } = e[i];
		console.log(`${ansi.BrightWhite}# Inbox Message Event ${i}${ansi.reset}`);
		console.log(`- messageNum : ${messageNum}`);
		console.log(`- data : ${data}\n`);
	  }
};

export const logDeliverdEvent = (e:EventArgs<MessageDeliveredEvent>[]) => {
    for (let i = 0; i < e.length; i++) {
		const { messageDataHash, messageIndex, beforeInboxAcc, baseFeeL1, inbox, kind, sender, timestamp } = e[i];
		console.log(`${ansi.BrightWhite}# Deliverd Event ${i}${ansi.reset}`);
		console.log(`- messageIndex    : ${messageIndex}`);
		console.log(`- beforeInboxAcc  : ${beforeInboxAcc}`);
		console.log(`- inbox           : ${inbox}`);
		console.log(`- kind            : ${kind}`);
		console.log(`- sender          : ${sender}`);
		console.log(`- messageDataHash : ${messageDataHash}`);
		console.log(`- baseFeeL1       : ${baseFeeL1}`);
		console.log(`- timestamp       : ${timestamp}\n`);
	  }
}

export const logRetrayableTicketResult = async (childDepositMessage : ParentToChildMessageReader,i?:number) => {
		const retryableCreationReceipt = await childDepositMessage.getRetryableCreationReceipt();

		if(!retryableCreationReceipt) {
			throw new Error("No Retryable Receipt")
		}

		console.log(`${ansi.BrightWhite}# executed retrayable ticket Result ${i} on Child Chain ${ansi.reset}`);
		console.log(`- create retrayable ticket tx hash : ${retryableCreationReceipt?.transactionHash}`);
		console.log(`- gasUsed                          : ${retryableCreationReceipt.gasUsed}`);
		console.log(`- gasPrice                         : ${retryableCreationReceipt.effectiveGasPrice}`);
		console.log(`- transaction fee                  : ${formatEther(retryableCreationReceipt.gasUsed.mul(retryableCreationReceipt.effectiveGasPrice))}`);
		console.log('');
		
		const reddem = await childDepositMessage.getSuccessfulRedeem();
		
		switch (reddem.status) {
		  case ParentToChildMessageStatus.NOT_YET_CREATED:
			console.log('- status : NOT_YET_CREATED');
			break;
		  case ParentToChildMessageStatus.CREATION_FAILED:
			console.log('- status : CREATION_FAILED');
			break;
		  case ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD:
			const autoRedeem = await childDepositMessage.getAutoRedeemAttempt();
			if(!autoRedeem) {
				console.log(`${ansi.BrightWhite}# Fail Auto Redeem${ansi.reset}`);
				console.log('- status                           : FUNDS_DEPOSITED_ON_CHILD');
			} else {
				console.log(`- redeem tx hash                   : ${autoRedeem.transactionHash}`);
				console.log('- status                           : FUNDS_DEPOSITED_ON_CHILD');
				console.log(`- gasUsed                          : ${autoRedeem.gasUsed}`);
				console.log(`- gasPrice                         : ${autoRedeem.effectiveGasPrice}`);
				console.log(`- transaction fee                  : ${formatEther(autoRedeem.gasUsed.mul(autoRedeem.effectiveGasPrice))}`);
			}
			
			break;
		  case ParentToChildMessageStatus.REDEEMED:
			console.log(`- redeem tx hash                   : ${reddem.childTxReceipt.transactionHash}`);
			console.log('- status                           : REDEEMED');
			console.log(`- gasUsed                          : ${reddem.childTxReceipt.gasUsed}`);
			console.log(`- gasPrice                         : ${reddem.childTxReceipt.effectiveGasPrice}`);
			console.log(`- transaction fee                  : ${formatEther(reddem.childTxReceipt.gasUsed.mul(reddem.childTxReceipt.effectiveGasPrice))}`);
			break;
		  case ParentToChildMessageStatus.EXPIRED:
			console.log('- status : EXPIRED');
			break;
		}
		console.log("========================================================================");
		console.log();
		
		

		return retryableCreationReceipt
}

export const logGapBalance = (name:string,addr:string,before:BigNumber,after:BigNumber,symbol:string) => {
	console.log(`  ${name} address  : ${addr}`);
	console.log(`  Before Balance   : ${formatEther(before)} ${symbol}`);
	console.log(`  After  Balance   : ${formatEther(after)} ${symbol}`);
	console.log(`  --------------------------------------------`);
	console.log(`  Gap              : ${formatEther(after.sub(before))} ${symbol}`);
	console.log();
}

export const logGapTime = (before:Date,after:Date) => {
	console.log(`  Before time ${before.toLocaleString()}`);
	console.log(`  After  time ${after.toLocaleString()}`);
	console.log('  ---------------------------------------');
	let timeDifference = after.getTime() - before.getTime();
	let diffInMinutes = Math.floor(timeDifference / (1000 * 60));
	let diffInSeconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
	console.log(`                             ⏰ ${diffInMinutes}분 ${diffInSeconds}초`);
	console.log();
}
