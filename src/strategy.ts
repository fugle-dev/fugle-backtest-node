import * as assert from 'assert';
import { Broker } from './broker';
import { Context, OrderOptions } from './interfaces';

import DataFrame from './ndframe/dataframe';

export abstract class Strategy {
  private _indicators: Record<string, number[] | Record<string, number>[]> = {};
  private _signals: Record<string, boolean[]> = {};

  constructor(public readonly data: DataFrame, private readonly broker: Broker) {}

  get equity() {
    return this.broker.equity;
  }

  get position() {
    return this.broker.position;
  }

  get orders() {
    return this.broker.orders;
  }

  get trades() {
    return this.broker.trades;
  }

  get closedTrades() {
    return this.broker.closedTrades;
  }

  get indicators() {
    return this._indicators;
  }

  get signals() {
    return this._signals;
  }

  /**
   * Initialize the strategy.
   * Declare indicators and signals.
   */
  abstract init(): void;

  /**
   * Implement the strategy decisions.
   */
  abstract next(context: Context): void;

  /**
   * Place a new long order.
   */
  public buy(options: Omit<OrderOptions, 'trade'>) {
    assert(
      (options.size > 0) && (options.size < 1 || Math.round(options.size) === options.size),
      'size must be a positive fraction of equity, or a positive whole number of units',
    );
    return this.broker.newOrder(options);
  }

  /**
   * Place a new short order.
   */
  public sell(options: Omit<OrderOptions, 'trade'>) {
    assert(
      (options.size > 0) && (options.size < 1 || Math.round(options.size) === options.size),
      'size must be a positive fraction of equity, or a positive whole number of units',
    );
    return this.broker.newOrder({ ...options, size: -options.size });
  }

  /**
   * Add an indicator.
   */
  public addIndicator(name: string, values: number[] | Record<string, number>[]) {
    if (values.length < this.data.index.length) {
      values = Array(this.data.index.length - values.length).fill(null).concat(values);
    }
    this._indicators[name] = values;
  }

  /**
   * Get the indicator.
   */
  public getIndicator(name: string) {
    return this._indicators[name];
  }

  /**
   * Add a signal.
   */
  public addSignal(name: string, values: boolean[]) {
    if (values.length < this.data.index.length) {
      values = Array(this.data.index.length - values.length).fill(null).concat(values);
    }
    this._signals[name] = values;
  }

  /**
   * Get the signal.
   */
  public getSignal(name: string) {
    return this._signals[name];
  }

  /**
   * Get the strategy name.
   */
  public toString() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (this.params && Object.keys(this.params).length) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const params = Object.entries(this.params)
        .map(([key, value]) => `${key}=${value}`);
      return `${this.constructor.name}(${params.join(',')})`
    }
    return this.constructor.name;
  }
}
