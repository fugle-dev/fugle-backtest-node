import * as assert from 'assert';
import { Broker } from './broker';
import { Order } from './order';
import { TradeOptions } from './interfaces';

export class Trade {
  private _size: number;
  private _entryPrice: number;
  private _exitPrice?: number;
  private _entryBar: number;
  private _exitBar?: number;
  private _slOrder?: Order;
  private _tpOrder?: Order;
  private _tag?: Record<string, string>;

  constructor(private readonly broker: Broker, options: TradeOptions) {
    this._size = options.size;
    this._entryPrice = options.entryPrice;
    this._exitPrice = options.exitPrice;
    this._entryBar = options.entryBar;
    this._exitBar = options.exitBar;
    this._slOrder = options.slOrder;
    this._tpOrder = options.tpOrder;
    this._tag = options.tag;
  }

  /**
   * Trade size (volume; negative for short trades).
   */
  get size() {
    return this._size;
  }

  /**
   * Trade entry price.
   */
  get entryPrice() {
    return this._entryPrice;
  }

  /**
   * Trade exit price (or undefined if the trade is still active).
   */
  get exitPrice() {
    return this._exitPrice;
  }

  /**
   * Candlestick bar index of when the trade was entered.
   */
  get entryBar() {
    return this._entryBar;
  }

  /**
   * Candlestick bar index of when the trade was exited
   * (or undefined if the trade is still active).
   */
  get exitBar() {
    return this._exitBar;
  }

  /**
   * A tag value inherited from the `Order` that opened this trade.
   * This can be used to track trades and apply conditional logic / subgroup analysis.
   */
  get tag() {
    return this._tag;
  }

  /**
   * Get stop-loss order.
   */
  get slOrder() {
    return this._slOrder;
  }

  /**
   * Get take-profit order.
   */
  get tpOrder() {
    return this._tpOrder;
  }

  /**
   * Datetime of when the trade was entered.
   */
  get entryTime() {
    return this.broker.index[this._entryBar as number] as string;
  }

  /**
   * Datetime of when the trade was exited.
   */
  get exitTime() {
    return this.broker.index[this._exitBar as number] as string;
  }

  /**
   * True if the trade is long (trade size is positive).
   */
  get isLong() {
    return this._size > 0;
  }

  /**
   * True if the trade is short (trade size is negative).
   */
  get isShort() {
    return !this.isLong;
  }

  /**
   * Trade profit (positive) or loss (negative) in cash units.
   */
  get pl() {
    const price = this._exitPrice || this.broker.lastPrice;
    return this._size * (price - this._entryPrice);
  }

  /**
   * Trade profit (positive) or loss (negative) in percent.
   */
  get plPct() {
    const price = this._exitPrice || this.broker.lastPrice;
    return Math.sign(this._size) * (price / this._entryPrice - 1);
  }

  /**
   * Trade total value in cash (volume * price).
   */
  get value() {
    const price = this._exitPrice || this.broker.lastPrice;
    return Math.abs(this._size) * price;
  }

  /**
   * Stop-loss price at which to close the trade.
   *
   * This variable is writable. By assigning it a new price value,
   * you create or modify the existing SL order.
   * By assigning it `undefined`, you cancel it.
   */
  get sl() {
    return this._slOrder?.stop as number;
  }

  /**
   * Set stop-loss price.
   */
  set sl(price: number) {
    this.setContingent('sl', price);
  }

  /**
   * Take-profit price at which to close the trade.
   *
   * This property is writable. By assigning it a new price value,
   * you create or modify the existing TP order.
   * By assigning it `undefined`, you cancel it.
   */
  get tp() {
    return this._tpOrder?.limit as number;
  }

  /**
   * Set take-profit price.
   */
  set tp(price: number) {
    this.setContingent('tp', price);
  }

  /**
   * Place new `Order` to close `portion` of the trade at next market price.
   */
  public close(portion: number = 1) {
    assert(portion > 0 && portion <= 1, 'portion must be a fraction between 0 and 1');
    const size = Math.max(1, Math.round(Math.abs(this._size) * portion)) * Math.sign(-this._size);
    const order = new Order(this.broker, { size, parentTrade: this, tag: this.tag });
    this.broker.orders.push(order);
  }

  /**
   * Replace the trade.
   */
  public replace(options: Partial<TradeOptions>) {
    if (options.size !== undefined) this._size = options.size;
    if (options.entryPrice !== undefined) this._entryPrice = options.entryPrice;
    if (options.exitPrice !== undefined) this._exitPrice = options.exitPrice;
    if (options.entryBar !== undefined) this._entryBar = options.entryBar;
    if (options.exitBar !== undefined) this._exitBar = options.exitBar;
    if (options.slOrder !== undefined) this._slOrder = options.slOrder;
    if (options.tpOrder !== undefined) this._tpOrder = options.tpOrder;
    if (options.tag !== undefined) this._tag = options.tag;
    return this;
  }

  /**
   * Copy the trade.
   */
  public copy(options: Partial<TradeOptions>) {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this.replace(options));
  }

  private setContingent(type: string, price: number) {
    assert(type === 'sl' || type === 'tp');
    assert(price === 0 || price < Number.POSITIVE_INFINITY);

    const order = (type === 'sl') ? this._slOrder : this._tpOrder;
    if (order) order.cancel();
    if (price) {
      const options = (type === 'sl') ? { stopPrice: price } : { limitPrice: price };
      const order = this.broker.newOrder({ size: -this.size, parentTrade: this, tag: this.tag, ...options });
      if (type === 'sl') this._slOrder = order;
      if (type === 'tp') this._tpOrder = order;
    }
  }
}
