import { Backtest } from '../src';
import { TestStrategy } from './test-strategy';

describe('Backtest', () => {
  describe('constructor()', () => {
    it('should be instantiated', () => {
      const data = require('./fixtures/2330.json');
      const backtest = new Backtest(data, TestStrategy, { cash: 1000000 });
      expect(backtest).toBeInstanceOf(Backtest);
    });
  });
});
