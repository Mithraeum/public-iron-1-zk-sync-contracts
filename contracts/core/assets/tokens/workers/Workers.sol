// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "../../building/IBuilding.sol";
import "../../workersPool/IWorkersPool.sol";
import "./IWorkers.sol";
import "../../WorldAsset.sol";

contract Workers is ERC20Burnable, IWorkers, WorldAsset {

    /// @dev Removes error for compiling, default constructor does nothing because its a proxy
    constructor() ERC20("", "") public {

    }

    /// @inheritdoc IWorkers
    function init() public override initializer {

    }

    /// @dev Checks if provided address is world or world asset
    function isWorldAsset(address addressToCheck) internal view returns (bool) {
        return addressToCheck == address(world()) || world().worldAssets(WorldAssetStorageAccessor.epochNumber(), addressToCheck) != bytes32(0);
    }

    /// @dev Returns this buildings settlement
    function getSettlementByBuilding(address buildingAddress) internal view returns (address) {
        return address(IBuilding(buildingAddress).currentSettlement());
    }

    /// @dev ERC20 _beforeTokenTransfer hook
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        bytes32 WORKERS_POOL_ASSET_TYPE = keccak256(bytes("workersPool"));
        bytes32 SETTLEMENT_ASSET_TYPE = keccak256(bytes("settlement"));
        bytes32 BUILDING_ASSET_TYPE = keccak256(bytes("building"));

        IWorld world = world();
        uint256 epochNumber = WorldAssetStorageAccessor.epochNumber();

        bool isFromWorkersPool = world.worldAssets(epochNumber, from) == WORKERS_POOL_ASSET_TYPE;
        bool isFromSettlement = world.worldAssets(epochNumber, from) == SETTLEMENT_ASSET_TYPE;
        bool isFromBuilding = world.worldAssets(epochNumber, from) == BUILDING_ASSET_TYPE;

        //From can be address(0) or settlement or building
        require(from == address(0) || isFromWorkersPool || isFromSettlement || isFromBuilding, "invalid from");

        bool isToSettlement = world.worldAssets(epochNumber, to) == SETTLEMENT_ASSET_TYPE;
        bool isToBuilding = world.worldAssets(epochNumber, to) == BUILDING_ASSET_TYPE;

        //To can be address(0) or workers market or settlement or building
        require(to == address(0) || isToSettlement || isToBuilding, "invalid to");

        //Workers can be minted to settlement
        //Workers can be transferred from settlement to building
        //Workers can be transferred from building to settlement
        //Workers can be transferred from building to building
        //Everything else is disabled

        if (to == address(0)) {
            return;
        }

        if (from == address(0) && isToSettlement) {
            return;
        }

        if (isFromSettlement && isToBuilding && getSettlementByBuilding(to) == from) {
            IBuilding(to).updateState();
            return;
        }

        if (isFromBuilding && isToSettlement && getSettlementByBuilding(from) == to) {
            IBuilding(from).updateState();
            return;
        }

        if (isFromBuilding && isToBuilding && getSettlementByBuilding(from) == getSettlementByBuilding(to)) {
            IBuilding(from).updateState();
            IBuilding(to).updateState();
            return;
        }

        revert("Worker transfer disabled");
    }

    /// @inheritdoc IERC20Metadata
    function name() public view override returns (string memory) {
        return string.concat("Workers @", Strings.toString(WorldAssetStorageAccessor.epochNumber()));
    }

    /// @inheritdoc IERC20Metadata
    function symbol() public view override returns (string memory) {
        return string.concat("WRK @", Strings.toString(WorldAssetStorageAccessor.epochNumber()));
    }

    /// @inheritdoc IWorkers
    function mint(address to, uint256 amount) public override onlyWorldAssetFromSameEpoch {
        _mint(to, amount);
    }

    /// @inheritdoc IERC20Burnable
    function burnFrom(address from, uint256 amount) public override(ERC20Burnable, IERC20Burnable) {
        if (isWorldAsset(msg.sender)) {
            _burn(from, amount);
        } else {
            ERC20Burnable.burnFrom(from, amount);
        }
    }

    /// @inheritdoc IERC20Burnable
    function burn(uint256 amount) public override(ERC20Burnable, IERC20Burnable) {
        ERC20Burnable.burn(amount);
    }

    /// @inheritdoc IERC20
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override(ERC20, IERC20) returns (bool) {
        if (isWorldAsset(msg.sender)) {
            _transfer(from, to, amount);
            return true;
        } else {
            return ERC20.transferFrom(from, to, amount);
        }
    }
}
