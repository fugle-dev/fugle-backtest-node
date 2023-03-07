# @fugle/backtest

## Table of Contents

- [Class: Backtest](#class-backtest)
  - [Constructor: new Backtest(data, Strategy[, options])](#constructor-new-backtestdata-strategy-options)
  - [backtest.run()](#backtestrun)
  - [backtest.print()](#backtestprint)
  - [backtest.plot()](#backtestplot)
- [Class: Strategy](#class-strategy)
  - [strategy.init()](#strategyinit)
  - [strategy.next(context)](#strategynextcontext)
  - [strategy.buy(options)](#strategybuyoptions)
  - [strategy.sell(options)](#strategyselloptions)
  - [strategy.addIndicator(name, values)](#strategyaddindicatorname-values)
  - [strategy.getIndicator(name)](#strategygetindicatorname)
  - [strategy.getSignal(name, values)](#strategyaddsignalname-values)
  - [strategy.getSignal(name)](#strategygetsignalname)
  - [strategy.data](#strategydata)
  - [strategy.equity](#strategyequity)
  - [strategy.position](#strategyposition)
  - [strategy.orders](#strategyorders)
  - [strategy.trades](#strategytrades)
  - [strategy.closedTrades](#strategyclosedtrades)
- [Class: Position](#class-position)
  - [position.size](#positionsize)
  - [position.pl](#positionpl)
  - [position.plPct](#positionplPct)
  - [position.isLong](#positionislong)
  - [position.isShort](#positionisshort)
  - [position.close()](#positioncloseportion)
- [Class: Order](#class-order)
  - [order.size](#ordersize)
  - [order.limit](#orderlimit)
  - [order.stop](#orderstop)
  - [order.sl](#ordersl)
  - [order.tp](#ordertp)
  - [order.isLong](#orderislong)
  - [order.isShort](#orderisshort)
  - [order.isContingent](#orderiscontingent)
  - [order.cancel()](#ordercancel)
- [Class: Trade](#class-trade)
  - [trade.size](#tradesize)
  - [trade.entryPrice](#tradeentryprice)
  - [trade.exitPrice](#tradeexitprice)
  - [trade.entryBar](#tradeentrybar)
  - [trade.exitBar](#tradeexitbar)
  - [trade.slOrder](#tradeslorder)
  - [trade.tpOrder](#tradetporder)
  - [trade.entryTime](#tradeentrytime)
  - [trade.exitTime](#tradeexittime)
  - [trade.isLong](#tradeislong)
  - [trade.isShort](#tradeisshort)
  - [trade.pl](#tradepl)
  - [trade.plPct](#tradeplpct)
  - [trade.value](#tradevalue)
  - [trade.sl](#tradesl)
  - [trade.tp](#tradetp)
  - [trade.close()](#tradeclose)

## Class: Backtest

This class represents a backtesting task that backtest a custom strategy on input data.

### Constructor: `new Backtest(data, Strategy[, options])`

- `data` {Object | Array} The historical candles data.
- `Strategy` {Strategy} A custom trading strategy class, which inherits from `Strategy`.
- `options` {Object}
  - `cash` {number} The initial cash. **Default:** `10000`.
  - `commission` {number} The commission ratio. **Default:** `0`.
  - `margin` {number} The margin ratio required for a leveraged account. **Default:** `1`.
  - `tradeOnClose` {boolean} `true` if market orders will be filled based on the current bar's closing price instead of the next bar's open. **Default:** `false`.
  - `hedging` {boolean} Whether or not to allow trading in both long and short positions concurrently. `false` if the opposite-facing orders first close existing trades in a FIFO manner. **Default:** `false`.
  - `exclusiveOrders` {boolean} `true` if each new order automatically closes the previous trade or position, making at most a single trade (long or short) in effect at each time. **Default:** `false`.

Create a new `Backtest` instance.

### `backtest.run(options)`

- `options` {Object}
  - `params` {Record<string, number>} The parameters for the trading strategy.
- Returns: {Promise} Fulfills with `Stats` results upon success.

Run the backtest for the strategy.

### `backtest.optimize(options)`

- `options` {Object}
  - `params` {Record<string, number[]>} The combination of parameters for the trading strategy.
- Returns: {Promise} Fulfills with `Stats` results upon success.

Optimize strategy parameters.

### `backtest.print()`

- Returns: {this}

Print the results of the backtest run.

### `backtest.plot()`

- Returns: {this}

Plot the equity curve of the backtest run.

## Class: Strategy

Abstract class for implementing a trading strategy.

### `strategy.init()`

Initialize the strategy to declare indicators and signals.

### `strategy.next(context)`

- `context` {Object} The context of the current bar.
  - `index` {number} The index of the current bar.
  - `data` {Object} The OHLCV data of the current bar.
    - `date` {string} The ISO 8601 date string.
    - `open` {number} The open price of the bar period.
    - `high` {number} The highest price of the bar period.
    - `low` {number} The lowest price of the bar period.
    - `close` {number} The close price of the bar period.
    - `volume` {number} The volume of the bar period.
  - `indicators` {Map} To access the values of the custom indicators for the current bar.
  - `signals` {Map} To access the custom trading signals for the current bar.
  - `prev` {Object} The context of the previous bar.

### `strategy.buy(options)`

- `options` {Object}
  - `size` {number} The size of the order.
  - `limitPrice` {number} The limit price of the order.
  - `stopPrice` {number} The stop price of the order.
  - `slPrice` {number} The stop-loss price of the order.
  - `tpPrice` {number} The take-profit price of the order.

Place a new long order.

### `strategy.sell(options)`

- `options` {Object}
  - `size` {number} The size of the order.
  - `limitPrice` {number} The limit price of the order.
  - `stopPrice` {number} The stop price of the order.
  - `slPrice` {number} The stop-loss price of the order.
  - `tpPrice` {number} The take-profit price of the order.

Place a new short order.

### `strategy.addIndicator(name, values)`

- `name` {string} The indicator name.
- `values` {number[] | Record<string, number>[]} The values of the indicator.

Add an indicator.

### `strategy.getIndicator(name)`

- `name` {string} The indicator name.

Get indicator by name.

### `strategy.addSignal(name, values)`

- `name` {string} The signal name.
- `values` {boolean[]} The values of the signal.

Add a signal.

### `strategy.getSignal(name)`

- `name` {string} The signal name.

Get signal by name.

### `strategy.data`

- {danfo.DataFrame}

Get the DataFrame of the historical candles data.

### `strategy.equity`

- {number}

Get current account equity.

### `strategy.position`

- {Position}

Get current position.

### `strategy.orders`

- {Order[]}

Get a list of orders waiting to be executed.

### `strategy.trades`

- {Trade[]}

Get a list of active trades.

### `strategy.closedTrades`

- {Trade[]}

Get a list of settled trades.

## Class: Position

Currently held asset position.

### position.size

- {number}

Position size in units of asset. Negative if position is short.

### position.pl

- {number}

Profit (positive) or loss (negative) of the current position in cash units.

### position.plPct

- {number}

Profit (positive) or loss (negative) of the current position in percent.

### position.isLong

- {boolean}

`true` if the position is long (position size is positive).

### position.isShort

- {boolean}

`true` if the position is short (position size is negative).

### position.close(portion)

- `portion` {number} The portion of the position.

Close portion of position by closing `portion` of each active trade.

## Class: Order

### order.size

- {number}

Order size (negative for short orders).

### order.limit

- {number}

Order limit price for limit orders, or `undefined` for market orders, which are filled at next available price.

### order.stop

- {number}

Order stop price for stop-limit/stop-market order, otherwise `undefined` if no stop was set, or the stop price has already been hit.

### order.sl

- {number}

A stop-loss price at which, if set, a new contingent stop-market order will be placed upon the `Trade` following this order's execution.

### order.tp

- {number}

A take-profit price at which, if set, a new contingent limit order will be placed upon the `Trade` following this order's execution.

### order.isLong

- {boolean}

`true` if the order is long (order size is positive).

### order.isShort

- {boolean}

`true` if the order is short (order size is negative).

### order.isContingent

- {boolean}

`true` for contingent orders, i.e. OCO stop-loss and take-profit bracket orders placed upon an active trade. Remaining contingent orders are canceled when their parent `Trade` is closed.

### order.cancel()

Cancel the order.

## Class: Trade

### trade.size

- {number}

Trade size (volume; negative for short trades).

### trade.entryPrice

- {number}

Trade entry price.

### trade.exitPrice

- {number}

Trade exit price (or undefined if the trade is still active).

### trade.entryBar

- {number}

Candlestick bar index of when the trade was entered.

### trade.exitBar

- {number}

Candlestick bar index of when the trade was exited (or undefined if the trade is still active).


### trade.slOrder

- {Order}

Get stop-loss order.

### trade.tpOrder

- {Order}

Get take-profit order.

### trade.entryTime

- {string}

Datetime of when the trade was entered.

### trade.exitTime

- {string}

Datetime of when the trade was exited.

### trade.isLong

- {boolean}

`true` if the trade is long (trade size is positive).

### trade.isShort

- {boolean}

`true` if the trade is short (trade size is negative).

### trade.pl

- {number}

Trade profit (positive) or loss (negative) in cash units.

### trade.plPct

- {number}

Trade profit (positive) or loss (negative) in percent.

### trade.value

- {number}

Trade total value in cash (volume * price).

### trade.sl

- {number}

Stop-loss price at which to close the trade.

### trade.tp

- {number}

Take-profit price at which to close the trade.

### trade.close()

Place new `Order` to close `portion` of the trade at next market price.
