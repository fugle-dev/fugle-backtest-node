import { DataFrame, Series, toJSON } from 'danfojs-node';
import { intersection, mapKeys } from 'lodash';
import { Strategy as BaseStrategy } from './strategy';
import { Broker } from './broker';
import { Trade } from './trade';
import { Stats } from './stats';
import { Plotting } from './plotting';
import { HistoricalData, BacktestOptions } from './interfaces';

export class Backtest {
  private _data: DataFrame;
  private _Strategy: new(broker: Broker, data: DataFrame) => BaseStrategy;
  private _broker: Broker;
  private _stats?: Stats;

  constructor(data: HistoricalData, Strategy: new(broker: Broker, data: DataFrame) => BaseStrategy, options?: BacktestOptions) {
    this._data = new DataFrame(data, { index: (Array.isArray(data) ? data.map(d => d.date) : data.date) as string[] });
    this._data.setIndex({ column: 'date', drop: true, inplace: true });
    this._data.sortIndex({ ascending: true, inplace: true });

    if (!this._data['volume']) {
      this._data.addColumn('volume', Array(this._data.index.length).fill(NaN), { inplace: true });
    }

    if (!this._data.size) {
      throw new Error('OHLC `data` is empty');
    }

    if (intersection(this._data.columns, ['open', 'high', 'low', 'close', 'volume']).length !== 5) {
      throw new Error('`data` must contain `open`, `high`, `low`, `close`, and `volume` (optional)');
    }

    if (this._data['close'].values.some((value: number) => value > (options?.cash || 10000))) {
      console.warn('Some prices are larger than initial cash value.');
    }

    this._Strategy = Strategy;
    this._broker = new Broker(this._data, {
      cash: 10000,
      commission: 0,
      margin: 1,
      tradeOnClose: false,
      hedging: false,
      exclusiveOrders: false,
      ...options,
    });
  }

  get results() {
    return this._stats?.results;
  }

  /**
   * Run the backtest for the strategy.
   */
  public run() {
    const data = this._data.copy() as DataFrame;
    const broker = Object.assign(Object.create(Object.getPrototypeOf(this._broker)), this._broker) as Broker;
    const strategy = new this._Strategy(broker, data);

    strategy.init();

    const iterator = this.runner(strategy);
    for (const context of iterator) {
      broker.next();
      strategy.next(context as any);
    }
    broker.trades.forEach(t => t.close());
    broker.last();

    this._stats = new Stats(
      data,
      new Series(broker.equities),
      broker.closedTrades as Trade[],
      { riskFreeRate: 0 },
    ).compute();

    return this;
  }

  private * runner(strategy: BaseStrategy) {
    for (let i = 0, context = {}; i < this._data.index.length; i++) {
      const prev = context;
      const index = i;

      const data = mapKeys(
        (toJSON(this._data) as Record<string, number>[])[i],
        (_, key) => key.toLowerCase(),
      );
      const indicators = new Map(
        Object
          .keys(strategy.indicators)
          .map(key => [ key, strategy.indicators[key][i] ])
      );

      const signals = new Map(
        Object
          .keys(strategy.signals)
          .map(key => [ key, strategy.signals[key][i] ])
      );

      const current = { index, data, indicators, signals };
      context = { ...current, prev };

      yield context;
    }
  }
}
