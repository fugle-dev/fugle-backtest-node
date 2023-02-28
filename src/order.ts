import * as assert from 'assert';
import { remove } from 'lodash';
import { Broker } from './broker';
import { Trade } from './trade';
import { OrderOptions } from './interfaces';

export class Order {
  private _size: number;
  private _limitPrice?: number;
  private _stopPrice?: number;
  private _slPrice?: number;
  private _tpPrice?: number;
  private _parentTrade?: Trade;
  private _tag?: Record<string, string>;

  constructor(private readonly broker: Broker, options: OrderOptions) {
    assert(options.size !== 0);
    this._size = options.size;
    this._limitPrice = options.limitPrice;
    this._stopPrice = options.stopPrice;
    this._slPrice = options.slPrice;
    this._tpPrice = options.tpPrice;
    this._parentTrade = options.parentTrade;
    this._tag = options.tag;
  }

  /**
   * Order size (negative for short orders).
   *
   * If size is a value between 0 and 1, it is interpreted as a fraction of current
   * available liquidity (cash plus `Position.pl` minus used margin).
   * A value greater than or equal to 1 indicates an absolute number of units.
   */
  get size() {
    return this._size;
  }

  /**
   * Order limit price for [limit orders], or `undefined` for [market orders],
   * which are filled at next available price.
   *
   * [limit orders]: https://www.investopedia.com/terms/l/limitorder.asp
   * [market orders]: https://www.investopedia.com/terms/m/marketorder.asp
   */
  get limit() {
    return this._limitPrice;
  }

  /**
   * Order stop price for [stop-limit/stop-market][_] order,
   * otherwise `undefined` if no stop was set, or the stop price has already been hit.
   *
   * [_]: https://www.investopedia.com/terms/s/stoporder.asp
   */
  get stop() {
    return this._stopPrice;
  }

  /**
   * A stop-loss price at which, if set, a new contingent stop-market order
   * will be placed upon the `Trade` following this order's execution.
   */
  get sl() {
    return this._slPrice;
  }

  /**
   * A take-profit price at which, if set, a new contingent limit order
   * will be placed upon the `Trade` following this order's execution.
   */
  get tp() {
    return this._tpPrice;
  }

  get parentTrade() {
    return this._parentTrade;
  }

  /**
   * Arbitrary value (such as a string) which, if set, enables tracking
   * of this order and the associated `Trade`.
   */
  get tag() {
    return this._tag;
  }

  /**
   * True if the order is long (order size is positive).
   */
  get isLong() {
    return this._size > 0
  }

  /**
   * True if the order is short (order size is negative).
   */
  get isShort() {
    return this._size < 0;
  }

  /**
   * True for [contingent] orders, i.e. [OCO] stop-loss and take-profit bracket orders
   * placed upon an active trade. Remaining contingent orders are canceled when
   * their parent `Trade` is closed.
   *
   * [contingent]: https://www.investopedia.com/terms/c/contingentorder.asp
   * [OCO]: https://www.investopedia.com/terms/o/oco.asp
   */
  get isContingent() {
    return Boolean(this._parentTrade);
  }

  /**
   * Cancel the order.
   */
  public cancel() {
    remove(this.broker.orders, o => o === this);
    const trade = this.parentTrade;
    if (trade?.slOrder === this) {
      trade.replace({ slOrder: undefined });
    }
    if (trade?.tpOrder === this) {
      trade.replace({ tpOrder: undefined });
    }
  }

  /**
   * Replace the order.
   */
  public replace(options: Partial<OrderOptions>) {
    if (options.size !== undefined) this._size = options.size;
    if (options.limitPrice !== undefined) this._limitPrice = options.limitPrice;
    if (options.stopPrice !== undefined) this._stopPrice = options.stopPrice;
    if (options.slPrice !== undefined) this._slPrice = options.slPrice;
    if (options.tpPrice !== undefined) this._tpPrice = options.tpPrice;
    if (options.parentTrade !== undefined) this._parentTrade = options.parentTrade;
    if (options.tag !== undefined) this._tag = options.tag;
    return this;
  }
}
