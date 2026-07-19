// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {ArcErc721Collection} from "../src/ArcErc721Collection.sol";

contract DeployErc721 is Script {
    function run() external returns (ArcErc721Collection deployed) {
        vm.startBroadcast();
        deployed = new ArcErc721Collection("Arc Test Collection", "ATC", "ipfs://metadata/", 1000, 0, 5, true, 250, msg.sender, msg.sender);
        vm.stopBroadcast();
    }
}
