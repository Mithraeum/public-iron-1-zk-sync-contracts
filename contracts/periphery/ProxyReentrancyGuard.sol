// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

abstract contract ProxyReentrancyGuard {
    bool private _status;

    modifier nonReentrant() {
        require(_status == false, "ProxyReentrancyGuard: reentrant call");
        _status = true;
        _;
        _status = false;
    }
}
