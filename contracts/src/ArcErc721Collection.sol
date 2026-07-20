// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ArcErc721Collection is ERC721, ERC2981, Ownable2Step, ReentrancyGuard {
    error AddressZero();
    error MetadataFrozen();
    error PublicMintClosed();
    error MaxSupplyExceeded();
    error WalletLimitExceeded();
    error IncorrectPayment();

    string private baseTokenUri;
    uint256 public immutable maxSupply;
    uint256 public immutable maxPerWallet;
    uint256 public immutable mintPrice;
    bool public publicMintEnabled;
    bool public metadataFrozen;
    uint256 public totalMinted;
    mapping(address wallet => uint256 count) public mintedByWallet;

    event BaseURIUpdated(string baseUri);
    event MetadataLocked();
    event PublicMintSet(bool enabled);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseUri_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        uint256 maxPerWallet_,
        bool publicMintEnabled_,
        uint96 royaltyBps_,
        address royaltyReceiver_,
        address owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        if (owner_ == address(0) || royaltyReceiver_ == address(0)) revert AddressZero();
        if (maxSupply_ == 0 || maxPerWallet_ == 0 || maxPerWallet_ > maxSupply_) revert MaxSupplyExceeded();
        if (royaltyBps_ > 1000) revert IncorrectPayment();

        baseTokenUri = baseUri_;
        maxSupply = maxSupply_;
        mintPrice = mintPrice_;
        maxPerWallet = maxPerWallet_;
        publicMintEnabled = publicMintEnabled_;
        _setDefaultRoyalty(royaltyReceiver_, royaltyBps_);
    }

    function mint(uint256 quantity) external payable nonReentrant {
        if (!publicMintEnabled) revert PublicMintClosed();
        _mintTo(msg.sender, quantity, true);
    }

    function ownerMint(address to, uint256 quantity) external onlyOwner {
        if (to == address(0)) revert AddressZero();
        _mintTo(to, quantity, false);
    }

    function setPublicMintEnabled(bool enabled) external onlyOwner {
        publicMintEnabled = enabled;
        emit PublicMintSet(enabled);
    }

    function setBaseURI(string calldata newBaseUri) external onlyOwner {
        if (metadataFrozen) revert MetadataFrozen();
        baseTokenUri = newBaseUri;
        emit BaseURIUpdated(newBaseUri);
    }

    function freezeMetadata() external onlyOwner {
        metadataFrozen = true;
        emit MetadataLocked();
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        if (receiver == address(0)) revert AddressZero();
        if (feeNumerator > 1000) revert IncorrectPayment();
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function withdraw(address payable recipient) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert AddressZero();
        (bool ok,) = recipient.call{value: address(this).balance}("");
        require(ok, "WITHDRAW_FAILED");
    }

    function _mintTo(address to, uint256 quantity, bool enforceWalletLimit) private {
        if (quantity == 0) revert MaxSupplyExceeded();
        if (totalMinted + quantity > maxSupply) revert MaxSupplyExceeded();
        if (enforceWalletLimit && mintedByWallet[to] + quantity > maxPerWallet) revert WalletLimitExceeded();
        if (enforceWalletLimit && msg.value != mintPrice * quantity) revert IncorrectPayment();

        mintedByWallet[to] += quantity;
        for (uint256 i = 0; i < quantity; i++) {
            totalMinted++;
            _safeMint(to, totalMinted);
        }
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenUri;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
