import { Strategy, Context } from '../src';
import { SMA, CrossUp, CrossDown } from 'technicalindicators';

export class TestStrategy extends Strategy {
  init() {
    const sma60 = SMA.calculate({
      period: 60,
      values: this.data['close'].values,
    });
    this.addIndicator('SMA60', sma60);

    const crossUp = CrossUp.calculate({
      lineA: this.data['close'].values,
      lineB: this.getIndicator('SMA60') as number[],
    });
    this.addSignal('CrossUp', crossUp);

    const crossDown = CrossDown.calculate({
      lineA: this.data['close'].values,
      lineB: this.getIndicator('SMA60') as number[],
    });
    this.addSignal('CrossDown', crossDown);
  }

  next(ctx: Context) {
    const { index, signals } = ctx;
    if (index === 0) this.buy({ size: 1000 });
    if (index < 60) return;
    if (signals.get('CrossDown')) this.sell({ size: 1000 });
    if (signals.get('CrossUp')) this.buy({ size: 1000 });
  }
}
