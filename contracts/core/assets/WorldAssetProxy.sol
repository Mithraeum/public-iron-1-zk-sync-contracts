// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../IWorld.sol";
import "./WorldAssetStorage.sol";

/// @title World asset proxy
/// @notice Acts as a proxy contract to specified world asset, implementation of which is dereferenced from its creation parameters
contract WorldAssetProxy {
    constructor(
        address worldAddress,
        uint256 epochNumber,
        string memory assetGroup,
        string memory assetType
    ) public {
        WorldAssetStorage storage proxyStorage = getWorldAssetStorage();
        proxyStorage.worldAddress = worldAddress;
        proxyStorage.epochNumber = epochNumber;
        proxyStorage.assetId = keccak256(abi.encodePacked(assetGroup, assetType));
        proxyStorage.assetGroup = assetGroup;
        proxyStorage.assetType = assetType;
    }

    /// @dev Fallback function that delegates calls to the address returned by registry script contract. Will run if no other function in the contract matches the call data.
    fallback() external payable {
        WorldAssetStorage storage proxyStorage = getWorldAssetStorage();
        address impl = IWorld(proxyStorage.worldAddress).registry().implementations(proxyStorage.assetId);
        assembly {
            let ptr := mload(0x40)

            // (1) copy incoming call data
            calldatacopy(ptr, 0, calldatasize())

            // (2) forward call to logic contract
            let result := delegatecall(gas(), impl, ptr, calldatasize(), 0, 0)
            let size := returndatasize()

            // (3) retrieve return data
            returndatacopy(ptr, 0, size)

            // (4) forward return data back to caller
            switch result
            case 0 {
                revert(ptr, size)
            }
            default {
                return(ptr, size)
            }
        }
    }
}
