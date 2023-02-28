import * as assert from 'assert';
import { DataFrame } from 'danfojs-node';
import { Broker } from './broker';
import { Context, OrderOptions } from './interfaces';

export abstract class Strategy {
  private _indicators: Record<string, number[] | Record<string, number>[]> = {};
  private _signals: Record<string, boolean[]> = {};
  private _broker: Broker;
  private _data: DataFrame;

  constructor(broker: Broker, data: DataFrame, params?: any) {
    this._indicators = {};
    this._signals = {};
    this._broker = broker;
    this._data = data;
  }

  get data() {
    return this._data;
  }

  get equity() {
    return this._broker.equity;
  }

  get position() {
    return this._broker.position;
  }

  get orders() {
    return this._broker.orders;
  }

  get trades() {
    return this._broker.trades;
  }

  get closedTrades() {
    return this._broker.closedTrades;
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
    return this._broker.newOrder(options);
  }

  /**
   * Place a new short order.
   */
  protected sell(options: Omit<OrderOptions, 'trade'>) {
    assert(
      ((options.size > 0 && options.size < 1 ) || Math.round(options.size) === options.size),
      'size must be a positive fraction of equity, or a positive whole number of units',
    );
    return this._broker.newOrder({ ...options, size: -options.size });
  }

  /**
   * Add a indicator.
   */
  protected addIndicator(name: string, values: number[] | Record<string, number>[]) {
    if (values.length < this._data.index.length) {
      values = new Array(this._data.index.length - values.length).fill(null).concat(values);
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
    if (values.length < this._data.index.length) {
      values = new Array(this._data.index.length - values.length).fill(null).concat(values);
    }
    this._signals[name] = values;
  }

  /**
   * Get the signal.
   */
  protected getSignal(name: string) {
    return this._signals[name];
  }
}
