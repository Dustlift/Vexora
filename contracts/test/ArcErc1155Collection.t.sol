// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ArcErc1155Collection} from "../src/ArcErc1155Collection.sol";

contract ArcErc1155CollectionTest is Test {
    ArcErc1155Collection collection;
    address owner = address(0xA11CE);
    address user = address(0xB0B);

    function setUp() public {
        collection = new ArcErc1155Collection("Arc Multi", "ipfs://{id}.json", 7, 3, 0, 2, true, 250, owner, owner);
    }

    function testConstructorParameters() public view {
        assertEq(collection.name(), "Arc Multi");
        assertEq(collection.tokenId(), 7);
        assertEq(collection.maxSupply(), 3);
    }

    function testZeroAddressRejected() public {
        vm.expectRevert();
        new ArcErc1155Collection("Bad", "ipfs://", 0, 1, 0, 1, true, 0, address(0), owner);
    }

    function testPublicMintWhenOpen() public {
        vm.prank(user);
        collection.mint(1);
        assertEq(collection.balanceOf(user, 7), 1);
    }

    function testPublicMintClosedReverts() public {
        vm.prank(owner);
        collection.setPublicMintEnabled(false);
        vm.prank(user);
        vm.expectRevert();
        collection.mint(1);
    }

    function testWalletLimitAndSupplyCap() public {
        vm.prank(user);
        collection.mint(2);
        vm.prank(user);
        vm.expectRevert();
        collection.mint(1);
        vm.prank(owner);
        collection.ownerMint(owner, 1);
        vm.prank(owner);
        vm.expectRevert();
        collection.ownerMint(owner, 1);
    }

    function testUnauthorizedOwnerFunction() public {
        vm.prank(user);
        vm.expectRevert();
        collection.setURI("ipfs://new/{id}.json");
    }

    function testRoyaltyAndInterfaces() public view {
        (address receiver, uint256 amount) = collection.royaltyInfo(7, 10_000);
        assertEq(receiver, owner);
        assertEq(amount, 250);
        assertTrue(collection.supportsInterface(type(IERC165).interfaceId));
        assertTrue(collection.supportsInterface(type(IERC1155).interfaceId));
        assertTrue(collection.supportsInterface(type(IERC2981).interfaceId));
    }

    function testWithdrawAccess() public {
        vm.prank(user);
        vm.expectRevert();
        collection.withdraw(payable(user));
    }
}
