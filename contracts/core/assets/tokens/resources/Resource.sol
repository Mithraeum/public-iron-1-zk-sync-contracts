// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "./IResource.sol";
import "../../building/IBuilding.sol";
import "../../unitsPool/IUnitsPool.sol";
import "../../WorldAsset.sol";

contract Resource is ERC20Burnable, IResource, WorldAsset {
    /// @inheritdoc IResource
    string public tokenName;
    /// @inheritdoc IResource
    string public tokenSymbol;
    /// @inheritdoc IResource
    string public worldResourceName;

    /// @dev Allows caller to be only world or world asset
    modifier onlyWorldAssetFromSameEpochOrRewardPool() {
        require(
            msg.sender == address(world()) ||
            world().worldAssets(WorldAssetStorageAccessor.epochNumber(), msg.sender) != bytes32(0) ||
            msg.sender == address(world().rewardPool()),
            "onlyWorldAssetFromSameEpoch"
        );
        _;
    }

    /// @dev Removes error for compiling, default constructor does nothing because its a proxy
    constructor() ERC20("", "") public {

    }

    /// @inheritdoc IResource
    function init(
        string memory _tokenName,
        string memory _tokenSymbol,
        string memory _worldResourceName
    ) public override initializer {
        tokenName = _tokenName;
        tokenSymbol = _tokenSymbol;
        worldResourceName = _worldResourceName;
    }

    /// @inheritdoc IERC20Metadata
    function name() public view override returns (string memory) {
        return string.concat(string.concat(tokenName, " @"), Strings.toString(WorldAssetStorageAccessor.epochNumber()));
    }

    /// @inheritdoc IERC20Metadata
    function symbol() public view override returns (string memory) {
        return string.concat(string.concat(tokenSymbol, " @"), Strings.toString(WorldAssetStorageAccessor.epochNumber()));
    }

    /// @dev ERC20 _beforeTokenTransfer hook
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        bytes32 BUILDING_ASSET_TYPE = keccak256(bytes("building"));

        if (world().worldAssets(WorldAssetStorageAccessor.epochNumber(), from) == BUILDING_ASSET_TYPE) {
            IBuilding(from).updateState();
        }

        if (world().worldAssets(WorldAssetStorageAccessor.epochNumber(), to) == BUILDING_ASSET_TYPE) {
            IBuilding(to).updateState();
        }
    }

    /// @dev ERC20 _afterTokenTransfer hook
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        bytes32 BUILDING_ASSET_TYPE = keccak256(bytes("building"));

        if (world().worldAssets(WorldAssetStorageAccessor.epochNumber(), from) == BUILDING_ASSET_TYPE) {
            IBuilding(from).productionResourcesChanged();

            // If anyone takes production resource from building -> we consider them as unlocked and increase zone toxicity
            if (to != address(0) && isRequiredForBuildingProduction(worldResourceName, from)) {
                ISettlement settlementOfBuilding = IBuilding(from).currentSettlement();
                settlementOfBuilding.currentZone().increaseToxicity(address(settlementOfBuilding), worldResourceName, amount);
            }
        }

        if (world().worldAssets(WorldAssetStorageAccessor.epochNumber(), to) == BUILDING_ASSET_TYPE) {
            IBuilding(to).productionResourcesChanged();

            // If anyone sends resource to building -> we consider them as locked and we should lower its zone toxicity
            // however it is done at #_transfer override since we need to decrease toxicity for all amount (not for amount building receives)
        }
    }

    /// @dev Checks if provided resource is required for building production
    function isRequiredForBuildingProduction(string memory resourceType, address buildingAddress) internal view returns (bool) {
        bytes32 resourceBytes = keccak256(bytes(resourceType));

        IBuilding.InitialResourceBlock[] memory initialResourceBlocks = IBuilding(buildingAddress).getConfig();
        for (uint256 i = 0; i < initialResourceBlocks.length; i++) {
            if (!initialResourceBlocks[i].isProducing && resourceBytes == keccak256(bytes(initialResourceBlocks[i].resourceName))) {
                return true;
            }
        }

        return false;
    }

    /// @dev Checks if provided address is reward pool
    function isRewardPool(address addressToCheck) internal view returns (bool) {
        return address(world().rewardPool()) == addressToCheck;
    }

    /// @dev Checks if provided address is world or world asset
    function isWorldAsset(address addressToCheck) internal view returns (bool) {
        return addressToCheck == address(world()) || world().worldAssets(WorldAssetStorageAccessor.epochNumber(), addressToCheck) != bytes32(0);
    }

    /// @inheritdoc IResource
    function mint(address to, uint256 amount) public override onlyWorldAssetFromSameEpoch {
        _mint(to, amount);
    }

    /// @inheritdoc IERC20Burnable
    function burn(uint256 amount) public override(ERC20Burnable, IERC20Burnable) {
        ERC20Burnable.burn(amount);
    }

    /// @inheritdoc IERC20Burnable
    function burnFrom(address account, uint256 amount) public override(ERC20Burnable, IERC20Burnable) {
        if (isWorldAsset(msg.sender)) {
            _burn(account, amount);
        } else {
            ERC20Burnable.burnFrom(account, amount);
        }
    }

    /// @notice Transferred disabled if trying to transfer to the game building which does not use this resource
    /// @inheritdoc IERC20
    function transfer(address to, uint256 amount) public override(ERC20, IERC20) returns (bool success) {
        bytes32 BUILDING_ASSET_TYPE = keccak256(bytes("building"));
        if (world().worldAssets(WorldAssetStorageAccessor.epochNumber(), to) == BUILDING_ASSET_TYPE && !IBuilding(to).isResourceAcceptable(worldResourceName)) {
            revert("resource is not acceptable");
        }

        return ERC20.transfer(to, amount);
    }

    /// @notice Transferred disabled if trying to transfer to the game building which does not use this resource
    /// @inheritdoc IERC20
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override(ERC20, IERC20) returns (bool success) {
        bytes32 BUILDING_ASSET_TYPE = keccak256(bytes("building"));
        if (world().worldAssets(WorldAssetStorageAccessor.epochNumber(), to) == BUILDING_ASSET_TYPE && !IBuilding(to).isResourceAcceptable(worldResourceName)) {
            revert("resource is not acceptable");
        }

        if (isWorldAsset(msg.sender) || isRewardPool(msg.sender)) {
            _transfer(from, to, amount);
            return true;
        } else {
            return ERC20.transferFrom(from, to, amount);
        }
    }

    /// @inheritdoc IResource
    function spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) public override onlyWorldAssetFromSameEpochOrRewardPool {
        _spendAllowance(owner, spender, amount);
    }

    /// @notice If called for building then it returns amount of resource as if building state was applied
    /// @inheritdoc IERC20
    function balanceOf(address tokenOwner) public view override(ERC20, IERC20) returns (uint256) {
        bytes32 BUILDING_ASSET_TYPE = keccak256(bytes("building"));
        if (world().worldAssets(WorldAssetStorageAccessor.epochNumber(), tokenOwner) == BUILDING_ASSET_TYPE) {
            return IBuilding(tokenOwner).getResourcesAmount(worldResourceName, block.timestamp);
        }

        return ERC20.balanceOf(tokenOwner);
    }

    /// @inheritdoc IResource
    function stateBalanceOf(address tokenOwner) public view override returns (uint256 balance) {
        return ERC20.balanceOf(tokenOwner);
    }

    /// @notice Behaves same as default ERC20._transfer, however if resource is transferred to the building part of the resource is burned according to cultists balance
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        bytes32 BUILDING_ASSET_TYPE = keccak256(bytes("building"));
        if (world().worldAssets(WorldAssetStorageAccessor.epochNumber(), to) == BUILDING_ASSET_TYPE) {
            ISettlement settlementOfBuilding = IBuilding(to).currentSettlement();
            uint256 penalty = settlementOfBuilding.currentZone().getPenaltyFromCultists();

            uint256 amountToBeBurned = amount * penalty / 1e18;
            uint256 amountToBeSent = amount - amountToBeBurned;

            ERC20._transfer(from, to, amountToBeSent);

            if (amountToBeBurned > 0) {
                ERC20._burn(from, amountToBeBurned);
            }

            settlementOfBuilding.currentZone().decreaseToxicity(address(settlementOfBuilding), worldResourceName, amount);
        } else {
            ERC20._transfer(from, to, amount);
        }
    }
}
