// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../core/IWorld.sol";

/// @title Settlements listings
/// @notice Functions related to selling settlements for specific amount of tokens
contract SettlementsListings is ReentrancyGuard {

    /// @notice Emitted when #createOrder is called
    /// @param orderId Newly created order id
    /// @param bannerId Banner id
    /// @param sellingTokenAddress Selling token address (address(0) if native eth currency is used)
    /// @param price Price
    event OrderCreated(uint256 orderId, uint256 bannerId, address sellingTokenAddress, uint256 price);

    /// @notice Emitted when #cancelOrder is called (can be emitted when #createOrder is called once again after banner owner is changed)
    /// @param orderId Order id
    event OrderCancelled(uint256 orderId);

    /// @notice Emitted when #acceptOrder is called
    /// @param orderId Order id
    event OrderAccepted(uint256 orderId);

    /// @notice Emitted when #modifyOrder is called
    /// @param orderId Order id
    /// @param sellingTokenAddress New selling token address (address(0) if native eth currency is used)
    /// @param price New price
    event OrderModified(uint256 orderId, address sellingTokenAddress, uint256 price);

    enum OrderStatus {
        NOT_EXIST,// This status is necessary because of enum-uint cast (0 if empty storage)
        NEW,
        CANCELLED,
        ACCEPTED
    }

    struct SharesInfo {
        string buildingType;
        uint256 minSharesAmount;
    }

    struct OrderDetails {
        address orderOwner;
        address sellingTokenAddress;
        uint256 price;
        uint256 bannerId;
        OrderStatus status;
    }

    /// @notice Banners contract
    /// @dev Immutable, initialized in constructor
    IERC721Enumerable public banners;

    /// @notice World contract
    /// @dev Immutable, initialized in constructor
    IWorld public world;

    /// @notice Mapping containing order id to related OrderDetails struct
    /// @dev Modified when #createOrder or #acceptOrder or #cancelOrder is called
    mapping(uint256 => OrderDetails) public orders;

    /// @notice Mapping containing link from banner id to order id
    /// @dev Modified when #createOrder or #createOrder is called
    mapping(uint256 => uint256) public bannersOrders;

    /// @notice Lastly created order id (0 if no orders is created)
    /// @dev Modified when #createOrder is called
    uint256 public lastOrderId = 0;

    constructor(
        address bannersAddress,
        address worldAddress
    ) public {
        banners = IERC721Enumerable(bannersAddress);
        world = IWorld(worldAddress);
    }

    /// @notice Creates settlement order
    /// @dev Creates order for specified amount of tokens
    /// @param bannerId Banner id
    /// @param sellingTokenAddress Selling token address (address(0) if native eth currency is used)
    /// @param price Price
    function createOrder(
        uint256 bannerId,
        address sellingTokenAddress,
        uint256 price
    ) public {
        address bannerOwner = banners.ownerOf(bannerId);

        uint256 orderId = bannersOrders[bannerId];
        OrderDetails storage orderDetails = orders[orderId];

        if (orderDetails.status == OrderStatus.NEW && orderDetails.orderOwner != bannerOwner) {
            cancelOrder(orderId);
        }

        require(bannerOwner == msg.sender, "only owner can create order for provided banner id");
        require(bannersOrders[bannerId] == 0, "order for this banner already exist");

        lastOrderId = lastOrderId + 1;
        bannersOrders[bannerId] = lastOrderId;

        OrderDetails storage newOrderDetails = orders[lastOrderId];

        newOrderDetails.bannerId = bannerId;
        newOrderDetails.orderOwner = msg.sender;
        newOrderDetails.sellingTokenAddress = sellingTokenAddress;
        newOrderDetails.price = price;
        newOrderDetails.status = OrderStatus.NEW;

        emit OrderCreated(lastOrderId, bannerId, sellingTokenAddress, price);
    }

    /// @notice Accepts order
    /// @dev Transfers banner id to msg.sender for provided amount of tokens (if ERC20 - they need to be approved beforehand, if native - they have to be sent to this function)
    /// @param orderId Order id
    /// @param minBuildingsSharesToReceive Minimum amount of building shares to receive with orders' banner
    function acceptOrder(
        uint256 orderId,
        SharesInfo[] memory minBuildingsSharesToReceive
    ) public payable nonReentrant {
        OrderDetails storage orderDetails = orders[orderId];

        require(orderDetails.status == OrderStatus.NEW, "not new order");

        bool isNativeCurrency = orderDetails.sellingTokenAddress == address(0);
        if (isNativeCurrency) {
            require(msg.value == orderDetails.price, "not enough tokens sent");
            Address.sendValue(payable(orderDetails.orderOwner), orderDetails.price);
        } else {
            IERC20(orderDetails.sellingTokenAddress).transferFrom(msg.sender, orderDetails.orderOwner, orderDetails.price);
        }

        banners.safeTransferFrom(orderDetails.orderOwner, msg.sender, orderDetails.bannerId);

        IDistributions distributions = world.distributions();
        IEpoch currentEpoch = world.epochs(world.currentEpochNumber());
        ISettlement settlement = currentEpoch.userSettlements(orderDetails.bannerId);

        uint256[] memory distributionIds = new uint256[](minBuildingsSharesToReceive.length);
        uint256[] memory amounts = new uint256[](minBuildingsSharesToReceive.length);

        for (uint256 i = 0; i < minBuildingsSharesToReceive.length; i++) {
            SharesInfo memory minSharesInfo = minBuildingsSharesToReceive[i];
            uint256 distributionId = settlement.buildings(minSharesInfo.buildingType).distributionId();
            uint256 sharesAmountOnOwner = distributions.balanceOf(orderDetails.orderOwner, distributionId);

            require(sharesAmountOnOwner >= minSharesInfo.minSharesAmount, "not enough shares");

            distributionIds[i] = distributionId;
            amounts[i] = sharesAmountOnOwner;
        }

        distributions.safeBatchTransferFrom(
            orderDetails.orderOwner,
            msg.sender,
            distributionIds,
            amounts,
            new bytes(0)
        );

        orderDetails.status = OrderStatus.ACCEPTED;
        bannersOrders[orderDetails.bannerId] = 0;

        emit OrderAccepted(orderId);
    }

    /// @notice Cancels order
    /// @dev Can be called by order owner OR order owner is not banner owner (anyone can cancel order if order is not valid)
    /// @param orderId Order id
    function cancelOrder(
        uint256 orderId
    ) public {
        OrderDetails storage orderDetails = orders[orderId];
        address bannerOwner = banners.ownerOf(orderDetails.bannerId);

        require(orderDetails.status == OrderStatus.NEW, "not new order");

        bool isOrderOwner = orderDetails.orderOwner == msg.sender;
        bool isOrderOwnerOwnsBanner = orderDetails.orderOwner == bannerOwner;
        require(isOrderOwner || !isOrderOwnerOwnsBanner, "unable to cancel order");

        orderDetails.status = OrderStatus.CANCELLED;
        bannersOrders[orderDetails.bannerId] = 0;

        emit OrderCancelled(orderId);
    }

    /// @notice Modifies order
    /// @dev Selling token address, price can be modified; banner id cannot be modified
    /// @param orderId Order id
    /// @param sellingTokenAddress New selling token address (address(0) if native eth currency is used)
    /// @param price New price
    function modifyOrder(
        uint256 orderId,
        address sellingTokenAddress,
        uint256 price
    ) public {
        OrderDetails storage orderDetails = orders[orderId];

        require(orderDetails.status == OrderStatus.NEW, "not new order");
        require(orderDetails.orderOwner == msg.sender, "unable to modify order");

        orderDetails.sellingTokenAddress = sellingTokenAddress;
        orderDetails.price = price;

        emit OrderModified(orderId, sellingTokenAddress, price);
    }
}
