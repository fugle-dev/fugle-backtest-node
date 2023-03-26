import * as assert from 'assert';
import { DataFrame } from 'danfojs-node';
import { last, first, sumBy, remove } from 'lodash';
import { Order } from './order';
import { Trade } from './trade';
import { Position } from './position';
import { BrokerOptions, OrderOptions } from './interfaces';

export class Broker {
  private _i: number;
  private _cash: number;
  private _commission: number;
  private _leverage: number;
  private _tradeOnClose: boolean;
  private _hedging: boolean;
  private _exclusiveOrders: boolean;
  public equities: number[];
  public orders: Order[];
  public trades: Trade[];
  public position?: Position;
  public closedTrades?: Trade[];

  constructor(private readonly data: DataFrame, options: BrokerOptions) {
    assert(0 < options.cash, `cash should be > 0, is ${options.cash}`);
    assert(options.commission >= -0.1 && options.commission < 0.1,
      `commission should be between -10% (e.g. market-maker's rebates) and 10% (fees), is ${options.commission}`,
    );
    assert(options.margin > 0 && options.margin <= 1, `margin should be between 0 and 1, is ${options.margin}`);

    this._i = 0;
    this._cash = options.cash;
    this._commission = options.commission;
    this._leverage = 1 / options.margin;
    this._tradeOnClose = options.tradeOnClose;
    this._hedging = options.hedging;
    this._exclusiveOrders = options.exclusiveOrders;

    this.equities = Array(data.index.length).fill(NaN);
    this.orders = [];
    this.trades = [];
    this.position = new Position(this);
    this.closedTrades = [];
  }

  get index() {
    return this.data.index;
  }

  get lastPrice() {
    const i = (this._i === this.data.index.length) ? this._i - 1 : this._i;
    return this.data['close'].iat(i);
  }

  get equity() {
    return this._cash + sumBy(this.trades, t => t.pl);
  }

  get marginAvailable() {
    const marginUsed = sumBy(this.trades, t => t.value / this._leverage);
    return Math.max(0, this.equity - marginUsed);
  }

  public newOrder(options: OrderOptions) {
    const { size, stopPrice, limitPrice, slPrice, tpPrice, parentTrade } = options;
    const isLong = size > 0;
    const adjustedPrice = this.adjustPrice({ size });

    if (isLong) {
      if (!((limitPrice || stopPrice || adjustedPrice) > (slPrice || Number.NEGATIVE_INFINITY) && (limitPrice || stopPrice || adjustedPrice) < (tpPrice || Number.POSITIVE_INFINITY))) {
        throw new RangeError(`Long orders require: SL (${slPrice}) < LIMIT (${limitPrice || stopPrice || adjustedPrice}) < TP (${tpPrice})`);
      }
    } else {
      if (!((limitPrice || stopPrice || adjustedPrice) > (tpPrice || Number.NEGATIVE_INFINITY) && (limitPrice || stopPrice || adjustedPrice) < (slPrice || Number.POSITIVE_INFINITY))) {
        throw new RangeError(`Short orders require: TP (${tpPrice}) < LIMIT (${limitPrice || stopPrice || adjustedPrice}) < SL (${slPrice})`);
      }
    }

    const order = new Order(this, options);

    if (parentTrade) {
      this.orders.unshift(order);
    } else {
      if (this._exclusiveOrders) {
        for (const order of this.orders) {
          if (!order.isContingent) order.cancel();
        }
        for (const trade of this.trades) {
          trade.close();
        }
      }
      this.orders.push(order);
    }

    return order;
  }

  public next() {
    this.processOrders();

    this.equities[this._i] = this.equity;

    if (this.equity <= 0) {
      assert(this.marginAvailable <= 0);
      for (const trade of this.trades) {
        this.closeTrade({ trade, price: last(this.data['close'].values) as number, timeIndex: this._i });
      }
      this._cash = 0;
      this.equities.fill(0);
    }

    this._i += 1;
  }

  public last() {
    this._i = this.index.length - 1;
    this.next();
  }

  private processOrders() {
    const data = this.data.head(this._i + 1);
    const open = last(data['open'].values) as number;
    const high = last(data['high'].values) as number;
    const low = last(data['low'].values) as number;
    const prevClose = first(data['close'].values.slice(-2)) as number;
    let reprocessOrders = false;

    for (let i = 0; i < this.orders.length; i = 0) {
      const order = this.orders[i];

      if (!this.orders.includes(order)) continue;

      const stopPrice = order.stop;
      if (stopPrice) {
        const isStopHit = order.isLong ? (high > stopPrice) : (low < stopPrice);
        if (!isStopHit) continue;

        order.replace({ size: order.size, stopPrice: undefined });
      }

      let price;
      if (order.limit) {
        const isLimitHit = order.isLong ? (low < order.limit) : (high > order.limit);
        const isLimitHitBeforeStop = isLimitHit &&
          order.isLong
          ? (order.limit < (stopPrice || Number.NEGATIVE_INFINITY))
          : (order.limit > (stopPrice || Number.POSITIVE_INFINITY));
        if (!isLimitHit || isLimitHitBeforeStop) continue;
        price = order.isLong
          ? Math.min(stopPrice || open, order.limit)
          : Math.max(stopPrice || open, order.limit);
      } else {
        price = this._tradeOnClose ? prevClose : open;
        price = order.isLong
          ? Math.max(price, stopPrice || Number.NEGATIVE_INFINITY)
          : Math.min(price, stopPrice || Number.POSITIVE_INFINITY);
      }

      const isMarketOrder = !order.limit && !stopPrice;
      const timeIndex = isMarketOrder && this._tradeOnClose ? (this._i - 1) : this._i;

      if (order.parentTrade) {
        const trade = order.parentTrade;
        const prevSize = trade.size;
        const size = Math.min(Math.abs(prevSize), Math.abs(order.size)) * Math.sign(order.size);

        if (this.trades.includes(trade)) {
          this.reduceTrade({ trade, price, size, timeIndex });
          assert(order.size !== -prevSize || !this.trades.includes(trade));
        }
        if ([trade.slOrder, trade.tpOrder].includes(order)) {
          assert(order.size === -trade.size);
          assert(!this.orders.includes(order));
        } else {
          assert(Math.abs(size) <= Math.abs(prevSize) && Math.abs(size) >= 1);
          remove(this.orders, o => o === order);
        }
        continue;
      }

      const adjustedPrice = this.adjustPrice({ size: order.size, price });

      let size = order.size
      if (size > -1 && size < 1) {
        size = Math.floor((this.marginAvailable * this._leverage * Math.abs(size)) / adjustedPrice) * Math.sign(size);
        if (!size) {
          remove(this.orders, o => o === order);
          continue;
        }
      }

      assert(size === Math.round(size));
      let needSize = Math.floor(size);

      if (!this._hedging) {
        for (const trade of this.trades) {
          if (trade.isLong === order.isLong) continue;
          assert(trade.size * order.size < 0);

          if (Math.abs(needSize) >= Math.abs(trade.size)) {
            this.closeTrade({ trade, price, timeIndex });
            needSize += trade.size;
          } else {
            this.reduceTrade({ trade, price, size: needSize, timeIndex });
            needSize = 0;
          }

          if (!needSize) break;
        }
      }

      if (Math.abs(needSize) * adjustedPrice > this.marginAvailable * this._leverage) {
        remove(this.orders, o => o === order);
        continue;
      }

      if (needSize) {
        this.openTrade({ price: adjustedPrice, size: needSize, sl: order.sl, tp: order.tp, timeIndex, tag: order.tag });
        if ((order.sl || order.tp) && isMarketOrder) reprocessOrders = true;
      }

      remove(this.orders, o => o === order);
    }

    if (reprocessOrders) this.processOrders();
  }

  /**
   * Long/short `price`, adjusted for commisions.
   * In long positions, the adjusted price is a fraction higher, and vice versa.
   */
  private adjustPrice(options: { size: number, price?: number }) {
    const { size, price } = options;
    return (price || this.lastPrice) * (1 + (this._commission * Math.sign(size)));
  }

  private openTrade(options: { price: number, size: number, sl?: number, tp?: number, timeIndex: number, tag?: Record<string, string> }) {
    const { price, size, sl, tp, timeIndex, tag } = options;

    const trade = new Trade(this, { size, entryPrice: price, entryBar: timeIndex, tag });
    this.trades.push(trade);

    if (tp) trade.tp = tp;
    if (sl) trade.sl = sl;
  }

  private closeTrade(options: { trade: Trade, price: number, timeIndex: number }) {
    const { trade, price, timeIndex } = options;

    remove(this.trades, t => t === trade);
    if (trade.slOrder) remove(this.orders, o => o === trade.slOrder);
    if (trade.tpOrder) remove(this.orders, o => o === trade.tpOrder);

    this.closedTrades?.push(trade.replace({ exitPrice: price, exitBar: timeIndex }));
    this._cash += options.trade.pl;
  }

  private reduceTrade(options: { trade: Trade, price: number, size: number, timeIndex: number }) {
    const { trade, price, size, timeIndex } = options;

    assert(trade.size * size < 0);
    assert(Math.abs(trade.size) >= Math.abs(size));

    const sizeLeft = trade.size + size;
    assert(sizeLeft * trade.size >= 0);

    let closeTrade;
    if (!sizeLeft) {
      closeTrade = trade;
    } else {
      trade.replace({ size: sizeLeft });
      if (trade.slOrder) trade.slOrder.replace({ size: -trade.size });
      if (trade.tpOrder) trade.tpOrder.replace({ size: -trade.size });

      closeTrade = trade.copy({ size: -size, slOrder: undefined, tpOrder: undefined });
      this.trades.push(closeTrade);
    }

    this.closeTrade({ trade: closeTrade, price, timeIndex });
  }
}
