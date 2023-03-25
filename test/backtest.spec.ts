import { Backtest } from '../src';
import { Stats } from '../src/stats';
import { SmaCross } from './sma-cross.strategy';

describe('Backtest', () => {
  const data = require('./fixtures/2330.json');

  describe('constructor()', () => {
    beforeEach(() => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should create Backtest instance', () => {
      const backtest = new Backtest(data, SmaCross);
      expect(backtest).toBeInstanceOf(Backtest);
    });

    it('should create Backtest instance with options', () => {
      const backtest = new Backtest(data, SmaCross, { cash: 1000000 });
      expect(backtest).toBeInstanceOf(Backtest);
    });

    it('should print warning when some prices are larger than initial cash value', () => {
      const backtest = new Backtest(data, SmaCross, { cash: 100 });
      expect(backtest).toBeInstanceOf(Backtest);
      expect(console.warn).toBeCalledWith('Some prices are larger than initial cash value.');
    });

    it('should throw error when Strategy is invalid', () => {
      expect(() => {
        // @ts-ignore
        new Backtest(data, {});
      }).toThrow(TypeError);
    });

    it('should throw error when data is empty', () => {
      expect(() => {
        new Backtest([], SmaCross);
      }).toThrow(TypeError);
    });

    it('should throw error when some data fields are missing', () => {
      expect(() => {
        // @ts-ignore
        new Backtest([{ date: '2023-01-03' }], SmaCross);
      }).toThrow(TypeError);
    });
  });

  describe('.run()', () => {
    it('should run backtest and generate stats', async () => {
      const backtest = new Backtest(data, SmaCross, {
        cash: 1000000,
        tradeOnClose: true,
      });
      expect(backtest.stats).toBeUndefined();
      await backtest.run();
      expect(backtest.stats).toBeDefined();
    });
  });

  describe('.optimize()', () => {
    it('should optimize strategy parameters', async () => {
      const backtest = new Backtest(data, SmaCross);
      expect(backtest.stats).toBeUndefined();
      await backtest.optimize({ params: { n1: [5, 10, 20], n2: [60, 120, 240] } });
      expect(backtest.stats).toBeDefined();
    });

    it('should throw error when no parameters provided', async () => {
      const backtest = new Backtest(data, SmaCross);
      // @ts-ignore
      await expect(() => backtest.optimize({})).rejects.toThrow();
    });

    it('should throw error when parameters are empty', async () => {
      const backtest = new Backtest(data, SmaCross);
      await expect(() => backtest.optimize({ params: {} })).rejects.toThrow();
    });
  });

  describe('.print()', () => {
    it('should print the results of the backtest run', async () => {
      const backtest = new Backtest(data, SmaCross);
      await backtest.run();
      Stats.prototype.print = jest.fn();
      expect(backtest.print()).toBeInstanceOf(Backtest);
      expect(Stats.prototype.print).toBeCalled();
    });

    it('should throw error when missing results', () => {
      const backtest = new Backtest(data, SmaCross);
      expect(() => backtest.print()).toThrow(Error);
    });
  });

  describe('.plot()', () => {
    it('should plot the equity curve of the backtest run', async () => {
      const backtest = new Backtest(data, SmaCross);
      await backtest.run();
      Stats.prototype.plot = jest.fn();
      expect(backtest.plot()).toBeInstanceOf(Backtest);
      expect(Stats.prototype.plot).toBeCalled();
    });

    it('should throw error when missing results', () => {
      const backtest = new Backtest(data, SmaCross);
      expect(() => backtest.plot()).toThrow(Error);
    });
  });
});
