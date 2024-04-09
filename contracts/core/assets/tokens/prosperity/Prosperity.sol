// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Strings.sol";
import "../../../../token/ERC20IntBurnable.sol";
import "../../workersPool/IWorkersPool.sol";
import "../../WorldAsset.sol";

contract Prosperity is ERC20IntBurnable, IProsperity, WorldAsset {
    /// @inheritdoc IProsperity
    mapping(address => uint256) public override prosperitySpent;

    /// @dev Removes error for compiling, default constructor does nothing because its a proxy
    constructor() ERC20Int("", "") public {

    }

    /// @inheritdoc IProsperity
    function init() public override initializer {

    }

    /// @inheritdoc IERC20Metadata
    function name() public view override returns (string memory) {
        return string.concat("Prosperity @", Strings.toString(WorldAssetStorageAccessor.epochNumber()));
    }

    /// @inheritdoc IERC20Metadata
    function symbol() public view override returns (string memory) {
        return string.concat("PRS @", Strings.toString(WorldAssetStorageAccessor.epochNumber()));
    }

    /// @inheritdoc IProsperity
    function mint(address to, uint256 amount) public override onlyWorldAssetFromSameEpoch {
        _mint(to, amount);
    }

    /// @inheritdoc IProsperity
    function spend(address from, uint256 amount) public override onlyWorldAssetFromSameEpoch {
        prosperitySpent[from] += amount;
        _burn(from, amount);
    }

    /// @dev Checks if provided address is world or world asset
    function isWorldAsset(address addressToCheck) internal view returns (bool) {
        return addressToCheck == address(world()) || world().worldAssets(WorldAssetStorageAccessor.epochNumber(), addressToCheck) != bytes32(0);
    }

    /// @inheritdoc IERC20Burnable
    function burnFrom(address account, uint256 amount) public override(ERC20IntBurnable, IERC20Burnable) {
        if (isWorldAsset(msg.sender)) {
            _burn(account, amount);
        } else {
            ERC20IntBurnable.burnFrom(account, amount);
        }
    }

    /// @notice For prosperity default ERC20.transfer is disabled
    function transfer(address to, uint256 amount) public override(ERC20Int, IERC20) returns (bool success) {
        revert("Prosperity: transfer function disabled");
    }

    /// @notice For prosperity default ERC20.transferFrom is disabled
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override(ERC20Int, IERC20) returns (bool success) {
        if (isWorldAsset(msg.sender)) {
            _transfer(from, to, amount);
            return true;
        } else {
            revert("Prosperity: transfer function disabled");
        }
    }
}
