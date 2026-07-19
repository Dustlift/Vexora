// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {ArcErc1155Collection} from "../src/ArcErc1155Collection.sol";

contract DeployErc1155 is Script {
    function run() external returns (ArcErc1155Collection deployed) {
        vm.startBroadcast();
        deployed = new ArcErc1155Collection("Arc Multi Token", "ipfs://metadata/{id}.json", 0, 1000, 0, 5, true, 250, msg.sender, msg.sender);
        vm.stopBroadcast();
    }
}
