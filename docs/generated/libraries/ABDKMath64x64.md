## ABDKMath64x64


Smart contract library of mathematical functions operating with signed
64.64-bit fixed point numbers.  Signed 64.64-bit fixed point number is
basically a simple fraction whose numerator is signed 128-bit integer and
denominator is 2^64.  As long as denominator is always the same, there is no
need to store it, thus in Solidity signed 64.64-bit fixed point numbers are
represented by int128 type holding only the numerator.





### MIN_64x64

```solidity
int128 MIN_64x64
```







### MAX_64x64

```solidity
int128 MAX_64x64
```







### fromInt

```solidity
function fromInt(int256 x) internal pure returns (int128)
```

Convert signed 256-bit integer number into signed 64.64-bit fixed point
number.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int256 | signed 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### toInt

```solidity
function toInt(int128 x) internal pure returns (int64)
```

Convert signed 64.64 fixed point number into signed 64-bit integer number
rounding down.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int64 | signed 64-bit integer number |


### fromUInt

```solidity
function fromUInt(uint256 x) internal pure returns (int128)
```

Convert unsigned 256-bit integer number into signed 64.64-bit fixed point
number.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | uint256 | unsigned 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### toUInt

```solidity
function toUInt(int128 x) internal pure returns (uint64)
```

Convert signed 64.64 fixed point number into unsigned 64-bit integer
number rounding down.  Revert on underflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | unsigned 64-bit integer number |


### from128x128

```solidity
function from128x128(int256 x) internal pure returns (int128)
```

Convert signed 128.128 fixed point number into signed 64.64-bit fixed point
number rounding down.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int256 | signed 128.128-bin fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### to128x128

```solidity
function to128x128(int128 x) internal pure returns (int256)
```

Convert signed 64.64 fixed point number into signed 128.128 fixed point
number.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | signed 128.128 fixed point number |


### add

```solidity
function add(int128 x, int128 y) internal pure returns (int128)
```

Calculate x + y.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### sub

```solidity
function sub(int128 x, int128 y) internal pure returns (int128)
```

Calculate x - y.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### mul

```solidity
function mul(int128 x, int128 y) internal pure returns (int128)
```

Calculate x * y rounding down.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### muli

```solidity
function muli(int128 x, int256 y) internal pure returns (int256)
```

Calculate x * y rounding towards zero, where x is signed 64.64 fixed point
number and y is signed 256-bit integer number.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64 fixed point number |
| y | int256 | signed 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | signed 256-bit integer number |


### mulu

```solidity
function mulu(int128 x, uint256 y) internal pure returns (uint256)
```

Calculate x * y rounding down, where x is signed 64.64 fixed point number
and y is unsigned 256-bit integer number.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64 fixed point number |
| y | uint256 | unsigned 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | unsigned 256-bit integer number |


### div

```solidity
function div(int128 x, int128 y) internal pure returns (int128)
```

Calculate x / y rounding towards zero.  Revert on overflow or when y is
zero.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### divi

```solidity
function divi(int256 x, int256 y) internal pure returns (int128)
```

Calculate x / y rounding towards zero, where x and y are signed 256-bit
integer numbers.  Revert on overflow or when y is zero.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int256 | signed 256-bit integer number |
| y | int256 | signed 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### divu

```solidity
function divu(uint256 x, uint256 y) internal pure returns (int128)
```

Calculate x / y rounding towards zero, where x and y are unsigned 256-bit
integer numbers.  Revert on overflow or when y is zero.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | uint256 | unsigned 256-bit integer number |
| y | uint256 | unsigned 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### neg

```solidity
function neg(int128 x) internal pure returns (int128)
```

Calculate -x.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### abs

```solidity
function abs(int128 x) internal pure returns (int128)
```

Calculate |x|.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### inv

```solidity
function inv(int128 x) internal pure returns (int128)
```

Calculate 1 / x rounding towards zero.  Revert on overflow or when x is
zero.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### avg

```solidity
function avg(int128 x, int128 y) internal pure returns (int128)
```

Calculate arithmetics average of x and y, i.e. (x + y) / 2 rounding down.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### gavg

```solidity
function gavg(int128 x, int128 y) internal pure returns (int128)
```

Calculate geometric average of x and y, i.e. sqrt (x * y) rounding down.
Revert on overflow or in case x * y is negative.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### pow

```solidity
function pow(int128 x, uint256 y) internal pure returns (int128)
```

Calculate x^y assuming 0^0 is 1, where x is signed 64.64 fixed point number
and y is unsigned 256-bit integer number.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | uint256 | uint256 value |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### sqrt

```solidity
function sqrt(int128 x) internal pure returns (int128)
```

Calculate sqrt (x) rounding down.  Revert if x < 0.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### log_2

```solidity
function log_2(int128 x) internal pure returns (int128)
```

Calculate binary logarithm of x.  Revert if x <= 0.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### ln

```solidity
function ln(int128 x) internal pure returns (int128)
```

Calculate natural logarithm of x.  Revert if x <= 0.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### exp_2

```solidity
function exp_2(int128 x) internal pure returns (int128)
```

Calculate binary exponent of x.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### exp

```solidity
function exp(int128 x) internal pure returns (int128)
```

Calculate natural exponent of x.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### divuu

```solidity
function divuu(uint256 x, uint256 y) private pure returns (uint128)
```

Calculate x / y rounding towards zero, where x and y are unsigned 256-bit
integer numbers.  Revert on overflow or when y is zero.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | uint256 | unsigned 256-bit integer number |
| y | uint256 | unsigned 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint128 | unsigned 64.64-bit fixed point number |


### sqrtu

```solidity
function sqrtu(uint256 x) private pure returns (uint128)
```

Calculate sqrt (x) rounding down, where x is unsigned 256-bit integer
number.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | uint256 | unsigned 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint128 | unsigned 128-bit integer number |


## ABDKMath64x64


Smart contract library of mathematical functions operating with signed
64.64-bit fixed point numbers.  Signed 64.64-bit fixed point number is
basically a simple fraction whose numerator is signed 128-bit integer and
denominator is 2^64.  As long as denominator is always the same, there is no
need to store it, thus in Solidity signed 64.64-bit fixed point numbers are
represented by int128 type holding only the numerator.





### MIN_64x64

```solidity
int128 MIN_64x64
```







### MAX_64x64

```solidity
int128 MAX_64x64
```







### fromInt

```solidity
function fromInt(int256 x) internal pure returns (int128)
```

Convert signed 256-bit integer number into signed 64.64-bit fixed point
number.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int256 | signed 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### toInt

```solidity
function toInt(int128 x) internal pure returns (int64)
```

Convert signed 64.64 fixed point number into signed 64-bit integer number
rounding down.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int64 | signed 64-bit integer number |


### fromUInt

```solidity
function fromUInt(uint256 x) internal pure returns (int128)
```

Convert unsigned 256-bit integer number into signed 64.64-bit fixed point
number.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | uint256 | unsigned 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### toUInt

```solidity
function toUInt(int128 x) internal pure returns (uint64)
```

Convert signed 64.64 fixed point number into unsigned 64-bit integer
number rounding down.  Revert on underflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | unsigned 64-bit integer number |


### from128x128

```solidity
function from128x128(int256 x) internal pure returns (int128)
```

Convert signed 128.128 fixed point number into signed 64.64-bit fixed point
number rounding down.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int256 | signed 128.128-bin fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### to128x128

```solidity
function to128x128(int128 x) internal pure returns (int256)
```

Convert signed 64.64 fixed point number into signed 128.128 fixed point
number.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | signed 128.128 fixed point number |


### add

```solidity
function add(int128 x, int128 y) internal pure returns (int128)
```

Calculate x + y.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### sub

```solidity
function sub(int128 x, int128 y) internal pure returns (int128)
```

Calculate x - y.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### mul

```solidity
function mul(int128 x, int128 y) internal pure returns (int128)
```

Calculate x * y rounding down.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### muli

```solidity
function muli(int128 x, int256 y) internal pure returns (int256)
```

Calculate x * y rounding towards zero, where x is signed 64.64 fixed point
number and y is signed 256-bit integer number.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64 fixed point number |
| y | int256 | signed 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | signed 256-bit integer number |


### mulu

```solidity
function mulu(int128 x, uint256 y) internal pure returns (uint256)
```

Calculate x * y rounding down, where x is signed 64.64 fixed point number
and y is unsigned 256-bit integer number.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64 fixed point number |
| y | uint256 | unsigned 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | unsigned 256-bit integer number |


### div

```solidity
function div(int128 x, int128 y) internal pure returns (int128)
```

Calculate x / y rounding towards zero.  Revert on overflow or when y is
zero.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### divi

```solidity
function divi(int256 x, int256 y) internal pure returns (int128)
```

Calculate x / y rounding towards zero, where x and y are signed 256-bit
integer numbers.  Revert on overflow or when y is zero.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int256 | signed 256-bit integer number |
| y | int256 | signed 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### divu

```solidity
function divu(uint256 x, uint256 y) internal pure returns (int128)
```

Calculate x / y rounding towards zero, where x and y are unsigned 256-bit
integer numbers.  Revert on overflow or when y is zero.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | uint256 | unsigned 256-bit integer number |
| y | uint256 | unsigned 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### neg

```solidity
function neg(int128 x) internal pure returns (int128)
```

Calculate -x.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### abs

```solidity
function abs(int128 x) internal pure returns (int128)
```

Calculate |x|.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### inv

```solidity
function inv(int128 x) internal pure returns (int128)
```

Calculate 1 / x rounding towards zero.  Revert on overflow or when x is
zero.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### avg

```solidity
function avg(int128 x, int128 y) internal pure returns (int128)
```

Calculate arithmetics average of x and y, i.e. (x + y) / 2 rounding down.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### gavg

```solidity
function gavg(int128 x, int128 y) internal pure returns (int128)
```

Calculate geometric average of x and y, i.e. sqrt (x * y) rounding down.
Revert on overflow or in case x * y is negative.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### pow

```solidity
function pow(int128 x, uint256 y) internal pure returns (int128)
```

Calculate x^y assuming 0^0 is 1, where x is signed 64.64 fixed point number
and y is unsigned 256-bit integer number.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |
| y | uint256 | uint256 value |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### sqrt

```solidity
function sqrt(int128 x) internal pure returns (int128)
```

Calculate sqrt (x) rounding down.  Revert if x < 0.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### log_2

```solidity
function log_2(int128 x) internal pure returns (int128)
```

Calculate binary logarithm of x.  Revert if x <= 0.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### ln

```solidity
function ln(int128 x) internal pure returns (int128)
```

Calculate natural logarithm of x.  Revert if x <= 0.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### exp_2

```solidity
function exp_2(int128 x) internal pure returns (int128)
```

Calculate binary exponent of x.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### exp

```solidity
function exp(int128 x) internal pure returns (int128)
```

Calculate natural exponent of x.  Revert on overflow.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | int128 | signed 64.64-bit fixed point number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int128 | signed 64.64-bit fixed point number |


### divuu

```solidity
function divuu(uint256 x, uint256 y) private pure returns (uint128)
```

Calculate x / y rounding towards zero, where x and y are unsigned 256-bit
integer numbers.  Revert on overflow or when y is zero.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | uint256 | unsigned 256-bit integer number |
| y | uint256 | unsigned 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint128 | unsigned 64.64-bit fixed point number |


### sqrtu

```solidity
function sqrtu(uint256 x) private pure returns (uint128)
```

Calculate sqrt (x) rounding down, where x is unsigned 256-bit integer
number.


| Name | Type | Description |
| ---- | ---- | ----------- |
| x | uint256 | unsigned 256-bit integer number |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint128 | unsigned 128-bit integer number |


