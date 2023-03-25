import * as open from 'open';
import { minify } from 'html-minifier';
import { Plotting } from '../src/plotting';
import { Backtest } from '../src/backtest';
import { Stats } from '../src/stats';
import { SmaCross } from './sma-cross.strategy';

jest.mock('fs');
jest.mock('open');
jest.mock('html-minifier');

describe('Plotting', () => {
  let backtest: Backtest;
  let stats: Stats;

  beforeEach(async () => {
    backtest = new Backtest(require('./fixtures/2330.json'), SmaCross, {
      cash: 10000,
      commission: 0,
      margin: 1,
      tradeOnClose: false,
      hedging: false,
      exclusiveOrders: false,
    });
    stats = await backtest.run();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor()', () => {
    it('should set default options if not provided', () => {
      const plotting = new Plotting(stats);
      expect(plotting).toBeInstanceOf(Plotting);
      expect(plotting['openBrowser']).toBe(true);
      expect(plotting['filename']).toBe('output.html');
    });

    it('should set provided options if any', () => {
      const options = { openBrowser: false, filename: 'test.html' };
      const plotting = new Plotting(stats, options);
      expect(plotting).toBeInstanceOf(Plotting);
      expect(plotting['openBrowser']).toBe(false);
      expect(plotting['filename']).toBe('test.html');
    });
  });

  describe('.plot()', () => {
    it('should create the HTML file with minified content', () => {
      const options = { openBrowser: false, filename: 'test.html' };
      const plotting = new Plotting(stats, options);
      plotting.plot();
      expect(minify).toHaveBeenCalled();
      expect(open).not.toBeCalled();
    });

    it('should create the HTML file with minified content and open it in the browser', () => {
      const options = { openBrowser: true, filename: 'test.html' };
      const plotting = new Plotting(stats, options);
      plotting.plot();
      expect(minify).toHaveBeenCalled();
      expect(open).toHaveBeenCalledWith(`./${options.filename}`);
    });
  });
});
