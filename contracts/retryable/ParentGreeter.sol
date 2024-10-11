// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;
import "@arbitrum/nitro-contracts/src/bridge/IERC20Inbox.sol";

contract ParentGreeter {
    address public caller;
    string public message;

    IERC20Inbox public inbox;

    event RetryableTicketCreated(uint256 indexed ticketId);

    constructor(address _inbox) {
        inbox = IERC20Inbox(_inbox);
    }

    receive() external payable {}

    function knockknock(string memory _message) public {
        caller = msg.sender;
        message = _message;
    }

    function knocking(        
        address to,
        uint256 l2CallValue,
        uint256 maxSubmissionCost,
        address excessFeeRefundAddress,
        address callValueRefundAddress,
        uint256 gasLimit,
        uint256 maxFeePerGas,
        uint256 tokenTotalFeeAmount) public {

        bytes memory data = abi.encodeWithSelector(this.knockknock.selector, "Hi Child Chain, this message come form parent chain!!");
        uint256 ticketID = inbox.createRetryableTicket(to, l2CallValue, maxSubmissionCost, excessFeeRefundAddress, callValueRefundAddress, gasLimit, maxFeePerGas, tokenTotalFeeAmount, data);

        emit RetryableTicketCreated(ticketID);
    }    
}