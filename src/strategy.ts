import * as assert from 'assert';
import { DataFrame } from 'danfojs-node';
import { Broker } from './broker';
import { Context, OrderOptions } from './interfaces';

export abstract class Strategy {
  private _indicators: Record<string, number[] | Record<string, number>[]> = {};
  private _signals: Record<string, boolean[]> = {};

  constructor(protected readonly data: DataFrame, private readonly broker: Broker) {}

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
  abstract next(ctx: Context): void;

  /**
   * Place a new long order.
   */
  protected buy(options: Omit<OrderOptions, 'trade'>) {
    assert(
      ((options.size > 0 && options.size < 1 ) || Math.round(options.size) === options.size),
      'size must be a positive fraction of equity, or a positive whole number of units',
    );
    return this.broker.newOrder(options);
  }

  /**
   * Place a new short order.
   */
  protected sell(options: Omit<OrderOptions, 'trade'>) {
    assert(
      ((options.size > 0 && options.size < 1 ) || Math.round(options.size) === options.size),
      'size must be a positive fraction of equity, or a positive whole number of units',
    );
    return this.broker.newOrder({ ...options, size: -options.size });
  }

  /**
   * Add a indicator.
   */
  protected addIndicator(name: string, values: number[] | Record<string, number>[]) {
    if (values.length < this.data.index.length) {
      values = new Array(this.data.index.length - values.length).fill(null).concat(values);
    }
    this._indicators[name] = values;
  }

  /**
   * Get the indicator.
   */
  protected getIndicator(name: string) {
    return this._indicators[name];
  }

  /**
   * Add the indicator.
   */
  protected addSignal(name: string, values: boolean[]) {
    if (values.length < this.data.index.length) {
      values = new Array(this.data.index.length - values.length).fill(null).concat(values);
    }
    this._signals[name] = values;
  }

  /**
   * Get the signal.
   */
  protected getSignal(name: string) {
    return this._signals[name];
  }

  /**
   * Get the strategy name.
   */
  public toString() {
    // @ts-ignore
    if (this.params && Object.keys(this.params).length) {
      // @ts-ignore
      const params = Object.entries(this.params)
        .map(([key, value]) => `${key}=${value}`);
      return `${this.constructor.name}(${params.join(', ')})`
    }
    return this.constructor.name;
  }
}
