import { Backtest, HistoricalData } from '../src';
import { Stats } from '../src/stats';
import { TestStrategy } from './test-strategy';

describe('Backtest', () => {
  describe('#constructor()', () => {
    beforeAll(() => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('should create Backtest instance', () => {
      const data = require('./fixtures/2330.json');
      const backtest = new Backtest(data, TestStrategy);
      expect(backtest).toBeInstanceOf(Backtest);
    });

    it('should create Backtest instance with options', () => {
      const data = require('./fixtures/2330.json');
      const backtest = new Backtest(data, TestStrategy, { cash: 1000000 });
      expect(backtest).toBeInstanceOf(Backtest);
    });

    it('should print warning when some prices are larger than initial cash value', () => {
      const data = require('./fixtures/2330.json');
      const backtest = new Backtest(data, TestStrategy, { cash: 10 });
      expect(backtest).toBeInstanceOf(Backtest);
      expect(console.warn).toBeCalledWith('Some prices are larger than initial cash value.');
    });

    it('should throw error when Strategy is invalid', () => {
      expect(() => {
        const data = require('./fixtures/2330.json');
        // @ts-ignore
        new Backtest(data, {});
      }).toThrow(TypeError);
    });

    it('should throw error when data is empty', () => {
      expect(() => {
        const data: HistoricalData = [];
        new Backtest(data, TestStrategy);
      }).toThrow(TypeError);
    });

    it('should throw error when some data fields are missing', () => {
      expect(() => {
        const data = [{ date: '2023-01-03' }];
        // @ts-ignore
        new Backtest(data, TestStrategy);
      }).toThrow(TypeError);
    });
  });

  describe('.run()', () => {
    it('should run backtest and generate results', () => {
      const data = require('./fixtures/2330.json');
      const backtest = new Backtest(data, TestStrategy);
      expect(backtest.stats).toBeUndefined();
      expect(backtest.run()).toBeInstanceOf(Backtest);
      expect(backtest.stats).toBeDefined();
    });
  });

  describe('.print()', () => {
    it('should print the results of the backtest run', () => {
      const data = require('./fixtures/2330.json');
      const backtest = new Backtest(data, TestStrategy).run();
      Stats.prototype.print = jest.fn();
      expect(backtest.print()).toBeInstanceOf(Backtest);
      expect(Stats.prototype.print).toBeCalled();
    });

    it('should throw error when missing results', () => {
      expect(() => {
        const data = require('./fixtures/2330.json');
        const backtest = new Backtest(data, TestStrategy);
        backtest.print();
      }).toThrow(Error);
    });
  });

  describe('.plot()', () => {
    it('should plot the equity curve of the backtest run', () => {
      const data = require('./fixtures/2330.json');
      const backtest = new Backtest(data, TestStrategy).run();
      Stats.prototype.plot = jest.fn();
      expect(backtest.plot()).toBeInstanceOf(Backtest);
      expect(Stats.prototype.plot).toBeCalled();
    });

    it('should throw error when missing results', () => {
      expect(() => {
        const data = require('./fixtures/2330.json');
        const backtest = new Backtest(data, TestStrategy);
        backtest.plot();
      }).toThrow(Error);
    });
  });
});
