import { Strategy, Context } from '../src';
import { SMA, CrossUp, CrossDown } from 'technicalindicators';

export class SmaCross extends Strategy {
  params = { n1: 20, n2: 60 };

  init() {
    const lineA = SMA.calculate({
      period: this.params.n1,
      values: this.data['close'].values,
    });
    this.addIndicator('lineA', lineA);

    const lineB = SMA.calculate({
      period: this.params.n2,
      values: this.data['close'].values,
    });
    this.addIndicator('lineB', lineB);

    const crossUp = CrossUp.calculate({
      lineA: this.getIndicator('lineA') as number[],
      lineB: this.getIndicator('lineB') as number[],
    });
    this.addSignal('crossUp', crossUp);

    const crossDown = CrossDown.calculate({
      lineA: this.getIndicator('lineA') as number[],
      lineB: this.getIndicator('lineB') as number[],
    });
    this.addSignal('crossDown', crossDown);
  }

  next(ctx: Context) {
    const { index, signals } = ctx;
    if (index < this.params.n1 || index < this.params.n2) return;
    const price = ctx.data['close'];
    if (signals.get('crossUp')) this.buy({ size: 1000, tpPrice: price * 1.15, slPrice: price * 0.9 });
    if (signals.get('crossDown')) this.sell({ size: 1000 });
  }
}
