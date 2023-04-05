# Fugle Backtest

[![NPM version][npm-image]][npm-url]
[![Build Status][action-image]][action-url]
[![Coverage Status][codecov-image]][codecov-url]

> A trading strategy backtesting library in Node.js based on [Danfo.js](https://github.com/javascriptdata/danfojs) and inspired by [backtesting.py](https://github.com/kernc/backtesting.py).

## Installation

```sh
$ npm install --save @fugle/backtest
```

## Importing

```js
// Using Node.js `require()`
const { Backtest, Strategy } = require('@fugle/backtest');

// Using ES6 imports
import { Backtest, Strategy } from '@fugle/backtest';
```

## Quick Start

The following example use [technicalindicators](https://github.com/anandanand84/technicalindicators) to calculate the indicators and signals, but you can replace it with any library.


```js
import { Backtest, Strategy } from '@fugle/backtest';
import { SMA, CrossUp, CrossDown } from 'technicalindicators';

class SmaCross extends Strategy {
  params = { n1: 20, n2: 60 };

  init() {
    const lineA = SMA.calculate({
      period: this.params.n1,
      values: this.data['close'].values,
    });
    this.addIndicator('lineA', lineA);

    const lineB = SMA.calculate({
      period: this.params.n2,
      values: this.data['close'].values,
    });
    this.addIndicator('lineB', lineB);

    const crossUp = CrossUp.calculate({
      lineA: this.getIndicator('lineA'),
      lineB: this.getIndicator('lineB'),
    });
    this.addSignal('crossUp', crossUp);

    const crossDown = CrossDown.calculate({
      lineA: this.getIndicator('lineA'),
      lineB: this.getIndicator('lineB'),
    });
    this.addSignal('crossDown', crossDown);
  }

  next(ctx) {
    const { index, signals } = ctx;
    if (index < this.params.n1 || index < this.params.n2) return;
    if (signals.get('crossUp')) this.buy({ size: 1000 });
    if (signals.get('crossDown')) this.sell({ size: 1000 });
  }
}

const data = require('./data.json');  // historical OHLCV data

const backtest = new Backtest(data, SmaCross, {
  cash: 1000000,
  tradeOnClose: true,
});

backtest.run()        // run the backtest
  .then(results => {
    results.print();  // print the results
    results.plot();   // plot the equity curve
  });
```

Results in:

```
╔════════════════════════╤═══════════════════════╗
║ Strategy               │ SmaCross(n1=20,n2=60) ║
╟────────────────────────┼───────────────────────╢
║ Start                  │ 2020-01-02            ║
╟────────────────────────┼───────────────────────╢
║ End                    │ 2022-12-30            ║
╟────────────────────────┼───────────────────────╢
║ Duration               │ 1093                  ║
╟────────────────────────┼───────────────────────╢
║ Exposure Time [%]      │ 55.102041             ║
╟────────────────────────┼───────────────────────╢
║ Equity Final [$]       │ 1105000               ║
╟────────────────────────┼───────────────────────╢
║ Equity Peak [$]        │ 1378000               ║
╟────────────────────────┼───────────────────────╢
║ Return [%]             │ 10.5                  ║
╟────────────────────────┼───────────────────────╢
║ Buy & Hold Return [%]  │ 32.300885             ║
╟────────────────────────┼───────────────────────╢
║ Return (Ann.) [%]      │ 3.482537              ║
╟────────────────────────┼───────────────────────╢
║ Volatility (Ann.) [%]  │ 8.204114              ║
╟────────────────────────┼───────────────────────╢
║ Sharpe Ratio           │ 0.424487              ║
╟────────────────────────┼───────────────────────╢
║ Sortino Ratio          │ 0.660431              ║
╟────────────────────────┼───────────────────────╢
║ Calmar Ratio           │ 0.175785              ║
╟────────────────────────┼───────────────────────╢
║ Max. Drawdown [%]      │ -19.811321            ║
╟────────────────────────┼───────────────────────╢
║ Avg. Drawdown [%]      │ -2.241326             ║
╟────────────────────────┼───────────────────────╢
║ Max. Drawdown Duration │ 708                   ║
╟────────────────────────┼───────────────────────╢
║ Avg. Drawdown Duration │ 54                    ║
╟────────────────────────┼───────────────────────╢
║ # Trades               │ 6                     ║
╟────────────────────────┼───────────────────────╢
║ Win Rate [%]           │ 16.666667             ║
╟────────────────────────┼───────────────────────╢
║ Best Trade [%]         │ 102.3729              ║
╟────────────────────────┼───────────────────────╢
║ Worst Trade [%]        │ -10.4418              ║
╟────────────────────────┼───────────────────────╢
║ Avg. Trade [%]         │ 5.718878              ║
╟────────────────────────┼───────────────────────╢
║ Max. Trade Duration    │ 322                   ║
╟────────────────────────┼───────────────────────╢
║ Avg. Trade Duration    │ 100                   ║
╟────────────────────────┼───────────────────────╢
║ Profit Factor          │ 2.880822              ║
╟────────────────────────┼───────────────────────╢
║ Expectancy [%]         │ 11.139483             ║
╟────────────────────────┼───────────────────────╢
║ SQN                    │ 0.305807              ║
╚════════════════════════╧═══════════════════════╝
```

![](./assets/equity-curve.png)
![](./assets/list-of-trades.png)

## Usage

To perform backtesting, you need to prepare historical data, implement a trading strategy, and then run a backtest on that strategy to obtain the results.

### Preparing historical data

First, prepare the historical OHLCV (Open, High, Low, Close, Volume) data of any financial instrument (such as stocks, futures, forex, cryptocurrencies, etc.). The input historical data will be converted to Danfo.js [DataFrame](https://danfo.jsdata.org/api-reference/dataframe), and the data format can be either `Array<Candle>` or `CandleList` type as follows:

```ts
interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandleList {
  date: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume?: number[];
}

type HistoricalData = Array<Candle> | CandleList;
```

### Implementing trading strategy

You can implement your own trading strategy by inheriting the `Strategy` class and overriding its two abstract methods:

- `Strategy.init(data)`: This method is called before running the strategy. You can pre-calculate all indicators and signals that the strategy depends on.
- `Strategy.next(context)`: This method will be iteratively called when running the strategy with the `Backtest` instance, and the `context` parameter represents the current candle and technical indicators and signals. You can decide whether to make buy or sell actions based on the current price, indicators, and signals.

Here's an example of implementing a simple average crossover strategy. The parameter `n1` represents the period of the short-term moving average, and `n2` represents the period of the long-term moving average. When the short-term moving average crosses above the long-term moving average, it buys `1000` trading unit. Conversely, when the short-term moving average crosses below the long-term moving average, the strategy sells `1000` trading unit.

```js
import { Backtest, Strategy } from '@fugle/backtest';
import { SMA, CrossUp, CrossDown } from 'technicalindicators';

class SmaCross extends Strategy {
  params = { n1: 20, n2: 60 };

  init() {
    const lineA = SMA.calculate({
      period: this.params.n1,
      values: this.data['close'].values,
    });
    this.addIndicator('lineA', lineA);

    const lineB = SMA.calculate({
      period: this.params.n2,
      values: this.data['close'].values,
    });
    this.addIndicator('lineB', lineB);

    const crossUp = CrossUp.calculate({
      lineA: this.getIndicator('lineA'),
      lineB: this.getIndicator('lineB'),
    });
    this.addSignal('crossUp', crossUp);

    const crossDown = CrossDown.calculate({
      lineA: this.getIndicator('lineA'),
      lineB: this.getIndicator('lineB'),
    });
    this.addSignal('crossDown', crossDown);
  }

  next(ctx) {
    const { index, signals } = ctx;
    if (index < this.params.n1 || index < this.params.n2) return;
    if (signals.get('crossUp')) this.buy({ size: 1000 });
    if (signals.get('crossDown')) this.sell({ size: 1000 });
  }
}
```

### Running the backtest

After preparing historical data and implementing the trading strategy, you can run the backtest. Calling the `Backtest.run()` method will execute the backtest and return a `Stats` instance, which includes the simulation results of our strategy and related statistical data.

```js
const backtest = new Backtest(data, SmaCross, {
  cash: 1000000,
  tradeOnClose: true,
});

backtest.run()        // run the backtest
  .then(results => {
    results.print();  // print the results
    results.plot();   // plot the equity curve
  });
```

### Optimizing the parameters

In the above strategy, we provide two variable parameters `params.n1` and `params.n2`, which represent the period of two moving averages. We can optimize the parameters and find the best combination of multiple parameters by calling the `Backtest.optimize()` method. Setting the `params` option in this method can change the parameter settings provided by the `Strategy`, and `Backtest.optimize()` will return the best combination of parameters provided.

```js
backtest.optimize({
  params: {
    n1: [5, 10, 20],
    n2: [60, 120, 240],
  },
})
  .then(results => {
    results.print();  // print out the results of the optimized parameters
    results.plot();   // plot the equity curve of the optimized parameters
  });
```

## Documentation

See [`/doc/fugle-backtest.md`](./doc/fugle-backtest.md) for Node.js-like documentation of `@fugle/backtest` classes.

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/@fugle/backtest.svg
[npm-url]: https://npmjs.com/package/@fugle/backtest
[action-image]: https://img.shields.io/github/actions/workflow/status/fugle-dev/fugle-backtest-node/node.js.yml?branch=master
[action-url]: https://github.com/fugle-dev/fugle-backtest-node/actions/workflows/node.js.yml
[codecov-image]: https://img.shields.io/codecov/c/github/fugle-dev/fugle-backtest-node.svg
[codecov-url]: https://codecov.io/gh/fugle-dev/fugle-backtest-node
