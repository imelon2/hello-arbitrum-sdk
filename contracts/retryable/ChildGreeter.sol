// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;


contract ChildGreeter {
    address public caller;
    string public message = "init";

    event L2ToL1TxCreated(uint256 indexed withdrawalId);

    receive() external payable {}

    function knockknock(string memory _message) public payable {
        caller = msg.sender;
        message = _message;
    }

    function callForRevert(bool isRevert) public payable {
        require(isRevert,"success redeem, but revert from contract call");

        caller = msg.sender;
        message = "Hi Parent Chain, this message come form child chain";
    }    
}