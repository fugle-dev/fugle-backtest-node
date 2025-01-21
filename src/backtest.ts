import { intersection, maxBy } from 'lodash';
import { Strategy as BaseStrategy } from './strategy';
import { Broker } from './broker';
import { Trade } from './trade';
import { Stats } from './stats';
import { HistoricalData, BacktestOptions, Context } from './interfaces';
import { StatsIndex } from './enums';

import DataFrame from './ndframe/dataframe';
import Series from './ndframe/series';

export class Backtest {
  private _data: DataFrame;
  private _stats?: Stats;

  constructor(data: HistoricalData,
    private readonly Strategy: new (data: DataFrame, broker: Broker) => BaseStrategy,
    private readonly options?: BacktestOptions,
  ) {
    this._data = new DataFrame(data);

    if (!(Strategy.prototype instanceof BaseStrategy)) {
      throw new TypeError('Invalid `Strategy`');
    }

    if (!this._data.size) {
      throw new TypeError('The `data` is empty');
    }

    if (!this._data['volume']) {
      this._data.addColumn('volume', Array(this._data.index.length).fill(NaN), { inplace: true });
    }

    if (intersection(this._data.columns, ['date', 'open', 'high', 'low', 'close', 'volume']).length !== 6) {
      throw new TypeError('The `data` must contain `date`, `open`, `high`, `low`, `close`, and `volume` (optional)');
    }

    if (this._data['close'].values.some((value: number) => value > (options?.cash || 10000))) {
      console.warn('Some prices are larger than initial cash value.');
    }

    this._data.setIndex({ index: this._data['date'].values, column: 'date', drop: true, inplace: true });
    this._data.sortIndex({ ascending: true, inplace: true });
  }

  get data() {
    return this._data;
  }

  get stats() {
    return this._stats;
  }

  /**
   * Run the backtest for the strategy.
   */
  public async run(options?: { params?: Record<string, number> }) {
    const data = this.data;
    const broker = new Broker(data, {
      cash: 10000,
      commission: 0,
      margin: 1,
      tradeOnClose: false,
      hedging: false,
      exclusiveOrders: false,
      ...this.options,
    });
    const strategy = new this.Strategy(data, broker);

    if (options?.params) (strategy as any).params = options.params;

    strategy.init();

    const iterator = this.runner(strategy);

    for await (const context of iterator) {
      broker.next();
      strategy.next(context as Context);
    }
    broker.trades.forEach(t => t.close());
    broker.last();

    const stats = new Stats(
      data,
      strategy,
      new Series(broker.equities),
      broker.closedTrades as Trade[],
      { riskFreeRate: 0 },
    ).compute();

    this._stats = stats;

    return stats;
  }

  /**
   * Optimize strategy parameters.
   */
  public async optimize(options: { params: Record<string, number[]>, max?: StatsIndex }) {
    /* istanbul ignore next */
    if (!options?.params || !Object.keys(options?.params).length) {
      throw new Error('Need some strategy parameters to optimize');
    }

    const paramsCombinations = ((params: Record<string, number[]>): Record<string, number>[] => {
      const keys = Object.keys(params);
      const result: Record<string, number>[] = [];
      const combine = (index: number, current: Record<string, number>) => {
        if (index === keys.length) {
          result.push(current);
          return;
        }
        const key = keys[index];
        const values = params[key];
        for (let i = 0; i < values.length; i++) {
          const param = { [key]: values[i] }
          combine(index + 1, { ...current, ...param });
        }
      };
      combine(0, {});
      return result;
    })(options.params);

    const max = options.max || StatsIndex.EquityFinal;

    const stats = await Promise.all(paramsCombinations.map(params => this.run({ params })))
      .then(data => maxBy(data, (stats) => stats.results && stats.results.at(max)))

    this._stats = stats;

    return stats;
  }

  /**
   * Print the results of the backtest run.
   */
  public print() {
    if (!this.stats) {
      throw new Error('First issue `backtest.run()` to obtain results');
    }
    this.stats.print();

    return this;
  }

  /**
   * Plot the equity curve of the backtest run.
   */
  public plot() {
    if (!this.stats) {
      throw new Error('First issue `backtest.run()` to obtain results');
    }
    this.stats.plot();

    return this;
  }

  private * runner(strategy: BaseStrategy) {
    for (let i = 0, context = {}; i < strategy.data.index.length; i++) {
      const index = i;
      const rows = strategy.data.iloc({ rows: [i] });

      const data = {
        date: rows.index[0],
        ...(rows.toJSON() as Record<string, number>[])[0],
      };

      const indicators = new Map(
        Object
          .keys(strategy.indicators)
          .map(key => [key, strategy.indicators[key][i]])
      );

      const signals = new Map(
        Object
          .keys(strategy.signals)
          .map(key => [key, strategy.signals[key][i]])
      );

      const prev = context;
      const current = { index, data, indicators, signals };
      context = { ...current, prev };

      yield context;
    }
  }
}
