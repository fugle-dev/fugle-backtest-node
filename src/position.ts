import { sum, sumBy } from 'lodash';
import { Broker } from './broker';

export class Position {
  constructor(private readonly broker: Broker) {}

  /**
   * Position size in units of asset. Negative if position is short.
   */
  get size() {
    return sumBy(this.broker.trades, trade => trade.size);
  }

  /**
   * Profit (positive) or loss (negative) of the current position in cash units.
   */
  get pl() {
    return sumBy(this.broker.trades, trade => trade.pl);
  }

  /**
   * Profit (positive) or loss (negative) of the current position in percent.
   */
  get plPct() {
    const sizes = this.broker.trades.map(trade => Math.abs(trade.size));
    const weights = sizes.map(size => size / sum(sizes));
    const plPcts = this.broker.trades.map((trade, i) => trade.plPct * weights[i]);
    return sum(plPcts);
  }

  /**
   * True if the position is long (position size is positive).
   */
  get isLong() {
    return this.size > 0;
  }

  /**
   * True if the position is short (position size is negative).
   */
  get isShort() {
    return this.size < 0;
  }

  /**
   * Close portion of position by closing `portion` of each active trade.
   */
  public close(portion: number = 1) {
    this.broker.trades.forEach(trade => trade.close(portion));
  }
}
