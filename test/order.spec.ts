import { Broker } from '../src/broker';
import { Order } from '../src/order';
import { Trade } from '../src/trade';

import DataFrame from '../src/ndframe/dataframe';

describe('Order', () => {
  let data: DataFrame;
  let broker: Broker;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    data = new DataFrame(require('./fixtures/2330.json'));
    broker = new Broker(data, {
      cash: 10000,
      commission: 0,
      margin: 1,
      tradeOnClose: false,
      hedging: false,
      exclusiveOrders: false,
    });
  });

  describe('constructor()', () => {
    it('should create an Order instance', () => {
      const options = { size: 1 };
      const order = new Order(broker, options);
      expect(order).toBeInstanceOf(Order);
    });

    it('should throw an error if options.size is zero', () => {
      const options = { size: 0 };
      expect(() => new Order(broker, options)).toThrow();
    });
  });

  describe('.size', () => {
    it('should get the size of the order', () => {
      const options = { size: 1 };
      const order = new Order(broker, options);
      expect(order.size).toBe(options.size);
    });
  });

  describe('.limit', () => {
    it('should get the limit price of the order', () => {
      const options = { size: 1, limitPrice: 100 };
      const order = new Order(broker, options);
      expect(order.limit).toBe(options.limitPrice);
    });
  });

  describe('.stop', () => {
    it('should get the stop price of the order', () => {
      const options = { size: 1, stopPrice: 100 };
      const order = new Order(broker, options);
      expect(order.stop).toBe(options.stopPrice);
    });
  });

  describe('.sl', () => {
    it('should get the stop-loss price of the order', () => {
      const options = { size: 1, slPrice: 100 };
      const order = new Order(broker, options);
      expect(order.sl).toBe(options.slPrice);
    });
  });

  describe('.tp', () => {
    it('should get the take-profit price of the order', () => {
      const options = { size: 1, tpPrice: 100 };
      const order = new Order(broker, options);
      expect(order.tp).toBe(options.tpPrice);
    });
  });

  describe('.parentTrade', () => {
    it('should get the parent trade of the order', () => {
      const trade = new Trade(broker, { size: 1, entryPrice: 100, entryBar: 1 });
      const options = { size: 1, parentTrade: trade };
      const order = new Order(broker, options);
      expect(order.parentTrade).toBe(options.parentTrade);
    });

    it('should return undefined if parent trade is not set', () => {
      const options = { size: 1 };
      const order = new Order(broker, options);
      expect(order.parentTrade).toBeUndefined();
    });
  });

  describe('.tag', () => {
    it('should get the tag of the order if set', () => {
      const options = { size: 1, tag: { key: 'value' } };
      const order = new Order(broker, options);
      expect(order.tag).toBe(options.tag);
    });

    it('should return undefined if tag is not set', () => {
      const options = { size: 1 };
      const order = new Order(broker, options);
      expect(order.tag).toBeUndefined();
    });
  });

  describe('.isLong', () => {
    it('should return true when the size is positive', () => {
      const options = { size: 1 };
      const order = new Order(broker, options);
      expect(order.isLong).toBe(true);
    });

    it('should return false when the size is negative', () => {
      const options = { size: -1 };
      const order = new Order(broker, options);
      expect(order.isLong).toBe(false);
    });
  });

  describe('.isShort', () => {
    it('should return true when the size is negative', () => {
      const options = { size: -1 };
      const order = new Order(broker, options);
      expect(order.isShort).toBe(true);
    });

    it('should return false when the size is positive', () => {
      const options = { size: 1 };
      const order = new Order(broker, options);
      expect(order.isShort).toBe(false);
    });
  });

  describe('.isContingent', () => {
    it('should return true when the parant trade is exist', () => {
      const trade = new Trade(broker, { size: 1, entryPrice: 100, entryBar: 1 });
      const options = { size: 1, parentTrade: trade };
      const order = new Order(broker, options);
      expect(order.isContingent).toBe(true);
    });

    it('should return true when the parant trade does not exist', () => {
      const options = { size: 1 };
      const order = new Order(broker, options);
      expect(order.isContingent).toBe(false);
    });
  });

  describe('.cancel()', () => {
    it('should remove the order from the broker', () => {
      broker.newOrder({ size: 1 });
      expect(broker.orders[0]).toBeInstanceOf(Order);
      broker.orders[0].cancel();
      expect(broker.orders[0]).toBeUndefined();
    });

    it('should remove the stop-loss order of the parent trade', () => {
      const trade = new Trade(broker, { size: 1, entryPrice: 100, entryBar: 1 });
      expect(trade.slOrder).toBeUndefined();
      trade.sl = 100;
      expect(trade.slOrder).toBeInstanceOf(Order);
      trade.slOrder?.cancel();
      expect(trade.slOrder).toBeUndefined();
    });

    it('should remove the take-profit order of the parent trade', () => {
      const trade = new Trade(broker, { size: 1, entryPrice: 100, entryBar: 1 });
      expect(trade.slOrder).toBeUndefined();
      trade.tp = 100;
      expect(trade.tpOrder).toBeInstanceOf(Order);
      trade.tpOrder?.cancel();
      expect(trade.tpOrder).toBeUndefined();
    });
  });

  describe('.replace()', () => {
    it('should update the size of the order', () => {
      const options = { size: 1 };
      const order = new Order(broker, options);
      const newOptions = { size: -1 };
      expect(order.size).toBe(options.size);
      order.replace(newOptions);
      expect(order.size).toBe(newOptions.size);
    });

    it('should update the limit price of the order', () => {
      const options = { size: 1, limitPrice: 100 };
      const order = new Order(broker, options);
      const newOptions = { ...options, limitPrice: 101 };
      expect(order.limit).toBe(options.limitPrice);
      order.replace(newOptions);
      expect(order.limit).toBe(newOptions.limitPrice);
    });

    it('should update the stop price of the order', () => {
      const options = { size: 1, stopPrice: 100 };
      const order = new Order(broker, options);
      const newOptions = { ...options, stopPrice: 101 };
      expect(order.stop).toBe(options.stopPrice);
      order.replace(newOptions);
      expect(order.stop).toBe(newOptions.stopPrice);
    });

    it('should update the stop-loss price of the order', () => {
      const options = { size: 1, slPrice: 100 };
      const order = new Order(broker, options);
      const newOptions = { ...options, slPrice: 101 };
      expect(order.sl).toBe(options.slPrice);
      order.replace(newOptions);
      expect(order.sl).toBe(newOptions.slPrice);
    });

    it('should update the take-profit price of the order', () => {
      const options = { size: 1, tpPrice: 100 };
      const order = new Order(broker, options);
      const newOptions = { ...options, tpPrice: 101 };
      expect(order.tp).toBe(options.tpPrice);
      order.replace(newOptions);
      expect(order.tp).toBe(newOptions.tpPrice);
    });

    it('should update the parent trade of the order', () => {
      const options = { size: 1, parantTrade: undefined };
      const order = new Order(broker, options);
      const trade = new Trade(broker, { size: 1, entryPrice: 100, entryBar: 1 });
      const newOptions = { ...options, parentTrade: trade };
      expect(order.parentTrade).toBe(options.parantTrade);
      order.replace(newOptions);
      expect(order.parentTrade).toBe(newOptions.parentTrade);
    });

    it('should update the tag of the order', () => {
      const options = { size: 1, tag: undefined };
      const order = new Order(broker, options);
      const newOptions = { ...options, tag: { key: 'value' } };
      expect(order.tag).toBe(options.tag);
      order.replace(newOptions);
      expect(order.tag).toBe(newOptions.tag);
    });
  });
});
