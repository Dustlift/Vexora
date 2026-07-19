// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ArcErc721Collection} from "../src/ArcErc721Collection.sol";

contract ArcErc721CollectionTest is Test {
    ArcErc721Collection collection;
    address owner = address(0xA11CE);
    address user = address(0xB0B);

    function setUp() public {
        collection = new ArcErc721Collection("Arc Test", "ARC", "ipfs://base/", 3, 0, 2, true, 250, owner, owner);
    }

    function testConstructorParameters() public view {
        assertEq(collection.name(), "Arc Test");
        assertEq(collection.symbol(), "ARC");
        assertEq(collection.maxSupply(), 3);
    }

    function testZeroAddressRejected() public {
        vm.expectRevert();
        new ArcErc721Collection("Bad", "BAD", "ipfs://", 1, 0, 1, true, 0, address(0), owner);
    }

    function testPublicMintWhenOpen() public {
        vm.prank(user);
        collection.mint(1);
        assertEq(collection.ownerOf(1), user);
    }

    function testPublicMintClosedReverts() public {
        vm.prank(owner);
        collection.setPublicMintEnabled(false);
        vm.prank(user);
        vm.expectRevert();
        collection.mint(1);
    }

    function testWalletLimit() public {
        vm.prank(user);
        collection.mint(2);
        vm.prank(user);
        vm.expectRevert();
        collection.mint(1);
    }

    function testOwnerMintAndSupplyCap() public {
        vm.prank(owner);
        collection.ownerMint(owner, 3);
        vm.prank(owner);
        vm.expectRevert();
        collection.ownerMint(owner, 1);
    }

    function testUnauthorizedOwnerFunction() public {
        vm.prank(user);
        vm.expectRevert();
        collection.setPublicMintEnabled(false);
    }

    function testRoyaltyAndInterfaces() public view {
        (address receiver, uint256 amount) = collection.royaltyInfo(1, 10_000);
        assertEq(receiver, owner);
        assertEq(amount, 250);
        assertTrue(collection.supportsInterface(type(IERC165).interfaceId));
        assertTrue(collection.supportsInterface(type(IERC721).interfaceId));
        assertTrue(collection.supportsInterface(type(IERC2981).interfaceId));
    }

    function testBaseUriUpdateAndWithdrawAccess() public {
        vm.prank(owner);
        collection.setBaseURI("ipfs://new/");
        vm.prank(user);
        vm.expectRevert();
        collection.withdraw(payable(user));
    }
}
