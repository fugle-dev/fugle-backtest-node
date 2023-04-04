import { sum, sumBy } from 'lodash';
import { DataFrame } from 'danfojs-node';
import { Broker } from '../src/broker';
import { Position } from '../src/position';
import { Trade } from '../src/trade';

describe('Position', () => {
  let data: DataFrame;
  let broker: Broker;

  beforeEach(() => {
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
    it('should create a Position instance', () => {
      const position = new Position(broker);
      expect(position).toBeInstanceOf(Position);
    });
  });

  describe('.size', () => {
    it('should return the sum of trade sizes', () => {
      broker.trades = [
        new Trade(broker, { size: 10, entryPrice: 100, entryBar: 0 }),
      ];
      const position = new Position(broker);
      expect(position.size).toBe(sumBy(broker.trades, trade => trade.size));
    });
  });

  describe('.pl', () => {
    it('should return the sum of trade profits and losses', () => {
      broker.trades = [
        new Trade(broker, { size: 10, entryPrice: 100, entryBar: 0 }),
      ];
      const position = new Position(broker);
      expect(position.pl).toBe(sumBy(broker.trades, trade => trade.pl));
    });
  });

  describe('.plPct', () => {
    it('should return the weighted average of trade profit percentages', () => {
      broker.trades = [
        new Trade(broker, { size: 10, entryPrice: 100, entryBar: 0 }),
      ];
      const position = new Position(broker);
      const sizes = broker.trades.map(trade => Math.abs(trade.size));
      const weights = sizes.map(size => size / sum(sizes));
      const plPcts = broker.trades.map((trade, i) => trade.plPct * weights[i]);
      expect(position.plPct).toBeCloseTo(sum(plPcts));
    });
  });

  describe('.isLong', () => {
    it('should return true if position size is positive', () => {
      broker.trades = [
        new Trade(broker, { size: 10, entryPrice: 100, entryBar: 0 }),
      ];
      const position = new Position(broker);
      expect(position.isLong).toBe(true);
    });

    it('should return false if position size is negative', () => {
      broker.trades = [
        new Trade(broker, { size: -10, entryPrice: 100, entryBar: 0 }),
      ];
      const position = new Position(broker);
      expect(position.isLong).toBe(false);
    });
  });

  describe('.isShort', () => {
    it('should return true if position size is negative', () => {
      broker.trades = [
        new Trade(broker, { size: -10, entryPrice: 100, entryBar: 0 }),
      ];
      const position = new Position(broker);
      expect(position.isShort).toBe(true);
    });

    it('should return false if position size is positive', () => {
      broker.trades = [
        new Trade(broker, { size: 10, entryPrice: 100, entryBar: 0 }),
      ];
      const position = new Position(broker);
      expect(position.isShort).toBe(false);
    });
  });

  describe('.close()', () => {
    it('should close position', () => {
      broker.trades = [
        new Trade(broker, { size: 10, entryPrice: 100, entryBar: 0 }),
        new Trade(broker, { size: 10, entryPrice: 100, entryBar: 10 }),
      ];
      broker.trades[0].close = jest.fn();
      broker.trades[1].close = jest.fn();
      const position = new Position(broker);
      position.close();
      expect(broker.trades[0].close).toHaveBeenCalledWith(1);
      expect(broker.trades[1].close).toHaveBeenCalledWith(1);
    });

    it('should close portion of position', () => {
      broker.trades = [
        new Trade(broker, { size: 10, entryPrice: 100, entryBar: 0 }),
        new Trade(broker, { size: 10, entryPrice: 100, entryBar: 10 }),
      ];
      broker.trades[0].close = jest.fn();
      broker.trades[1].close = jest.fn();
      const position = new Position(broker);
      position.close(0.5);
      expect(broker.trades[0].close).toHaveBeenCalledWith(0.5);
      expect(broker.trades[1].close).toHaveBeenCalledWith(0.5);
    });
  });
});
