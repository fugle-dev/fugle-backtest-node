import { Broker } from '../src/broker';
import { Strategy } from '../src';
import { Stats } from '../src/stats';
import { Plotting } from '../src/plotting';
import { Trade } from '../src/trade';
import { SmaCross } from './sma-cross.strategy';

import DataFrame from '../src/ndframe/dataframe';
import Series from '../src/ndframe/series';

describe('Stats', () => {
  let data: DataFrame;
  let broker: Broker;
  let strategy: Strategy;
  let equity: Series;
  let trades: Trade[];

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    data = new DataFrame(require('./fixtures/2330.json'));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    data.setIndex({ index: data['date'].values, column: 'date', drop: true, inplace: true });
    strategy = new SmaCross(data, broker);
    broker = new Broker(data, {
      cash: 10000,
      commission: 0,
      margin: 1,
      tradeOnClose: false,
      hedging: false,
      exclusiveOrders: false,
    });
    strategy = new SmaCross(data, broker);
    equity = new Series(Array(data.index.length).fill(10000));
    trades = [new Trade(broker, { size: 10, entryPrice: 100, entryBar: 0, exitPrice: 110, exitBar: 1 })];
  });

  describe('constructor()', () => {
    it('should create a Stats instance', () => {
      const stats = new Stats(data, strategy, equity, trades, { riskFreeRate: 0 });
      expect(stats).toBeInstanceOf(Stats);
    });
  });

  describe('.compute()', () => {
    it('should compute the stats of the strategy and get the results', () => {
      const stats = new Stats(data, strategy, equity, trades, { riskFreeRate: 0 });
      expect(stats.equityCurve).toBeUndefined();
      expect(stats.tradeLog).toBeUndefined();
      expect(stats.results).toBeUndefined();
      stats.compute();
      expect(stats.equityCurve).toBeDefined();
      expect(stats.tradeLog).toBeDefined();
      expect(stats.results).toBeDefined();
    });
  });

  describe('.print()', () => {
    it('should print the results', () => {
      const stats = new Stats(data, strategy, equity, trades, { riskFreeRate: 0 });
      stats.compute();
      Series.prototype.print = jest.fn();
      stats.print();
      expect(stats.results?.print).toBeCalled();
    });

    it('should throw error when missing results', () => {
      expect(() => {
        const stats = new Stats(data, strategy, equity, trades, { riskFreeRate: 0 });
        stats.print();
      }).toThrow(Error);
    });
  });

  describe('.plot()', () => {
    it('should plot the equity curve', () => {
      const stats = new Stats(data, strategy, equity, trades, { riskFreeRate: 0 });
      stats.compute();
      Plotting.prototype.plot = jest.fn();
      stats.plot();
      expect(Plotting.prototype.plot).toBeCalled();
    });

    it('should throw error when missing results', () => {
      expect(() => {
        const stats = new Stats(data, strategy, equity, trades, { riskFreeRate: 0 });
        stats.plot();
      }).toThrow(Error);
    });
  });
});
