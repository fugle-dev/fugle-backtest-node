import * as assert from 'assert';
import { DataFrame, Series } from 'danfojs-node';
import { uniq, first, last } from 'lodash';
import { DateTime } from 'luxon';
import { StatsOptions } from './interfaces';
import { StatsIndex, EquityCurveColumn, TradeLogColumn } from './enums';
import { Strategy } from './strategy';
import { Trade } from './trade';
import { Plotting } from './plotting';

export class Stats {
  private _equityCurve?: DataFrame;
  private _tradeLog?: DataFrame;
  private _results?: Series;

  constructor(
    private readonly data: DataFrame,
    private readonly strategy: Strategy,
    private readonly equity: Series,
    private readonly trades: Trade[],
    private readonly options: StatsOptions,
  ) {}

  get equityCurve() {
    return this._equityCurve;
  }

  get tradeLog() {
    return this._tradeLog;
  }

  get results() {
    return this._results;
  }

  public compute() {
    const { riskFreeRate = 0 } = this.options;

    assert(riskFreeRate > -1 && riskFreeRate < 1);

    const index = this.data.index as string[];
    const dd = new Series(Array(this.equity.count()).fill(1), { index }).sub(this.equity.div(this.equity.cumMax())) as Series;
    const [ ddDur, ddPeaks ] = this.computeDrawdownDurationPeaks(dd);

    const equityCurve = new DataFrame({
      [EquityCurveColumn.Equity]: this.equity.values,
      [EquityCurveColumn.DrawdownPct]: dd.values,
      [EquityCurveColumn.DrawdownDuration]: ddDur.values,
    }, { index });

    const tradeLog = new DataFrame(
      this.trades.map(trade => ({
        [TradeLogColumn.Size]: trade.size,
        [TradeLogColumn.EntryBar]: trade.entryBar,
        [TradeLogColumn.ExitBar]: trade.exitBar,
        [TradeLogColumn.EntryPrice]: trade.entryPrice,
        [TradeLogColumn.ExitPrice]: trade.exitPrice,
        [TradeLogColumn.PnL]: this.foramt(trade.pl),
        [TradeLogColumn.ReturnPct]: this.foramt(trade.plPct),
        [TradeLogColumn.EntryTime]: trade.entryTime,
        [TradeLogColumn.ExitTime]: trade.exitTime,
        [TradeLogColumn.Tag]: trade.tag,
        [TradeLogColumn.Duration]: DateTime.fromISO(trade.exitTime).diff(DateTime.fromISO(trade.entryTime), 'days').get('days'),
      }))
    );

    const pl = tradeLog[TradeLogColumn.PnL] as Series;
    const returns = tradeLog[TradeLogColumn.ReturnPct] as Series;
    const durations = tradeLog[TradeLogColumn.Duration] as Series;

    const start = DateTime.fromISO(first(index) as string);
    const end = DateTime.fromISO(last(index) as string);

    const results = new Series(
      [ this.strategy.toString(), start.toISODate(), end.toISODate(), end.diff(start, 'days').get('days')],
      { index: [ StatsIndex.Strategy, StatsIndex.Start, StatsIndex.End, StatsIndex.Duration] },
    );

    const exposureTime = this.computeExposureTime(index, tradeLog);
    const equityFinal = this.equity.iat(index.length - 1) as number;
    const equityPeak = this.equity.max();
    const returnPct = this.computeReturnPct(this.equity);
    const buyAndHoldReturn = this.computeReturnPct(this.data['close']);

    results.append(
      [ exposureTime, equityFinal, equityPeak, returnPct, buyAndHoldReturn ],
      [ StatsIndex.ExposureTime, StatsIndex.EquityFinal, StatsIndex.EquityPeak, StatsIndex.Return, StatsIndex.BuyAndHoldReturn ],
      { inplace: true },
    );

    let gmeanDayReturn = 0;
    let dayReturns = new Series(Array(this.equity.count()).fill(NaN));
    let annualTradingDays = NaN;

    if (index.length) {
      dayReturns = this.computeDayReturns(equityCurve['Equity']);
      gmeanDayReturn = this.computeGeometricMean(dayReturns);
      const d = new Series(index.map(date => DateTime.fromISO(date).get('weekday')));
      annualTradingDays = (d.eq(0).or(d.eq(6)).mean() > 2 / 7 * 0.6) ? 365 : 252;
    }

    const annualizedReturn = (1 + gmeanDayReturn) ** annualTradingDays - 1;
    const volatility = Math.sqrt((dayReturns.var() + (1 + gmeanDayReturn)**2)**annualTradingDays - (1 + gmeanDayReturn) ** (2*annualTradingDays)) * 100;
    const sharpeRatio = ((annualizedReturn * 100) - riskFreeRate) / (volatility || NaN);
    const sortinoRatio = (annualizedReturn - riskFreeRate) / (Math.sqrt(dayReturns.apply(v => (v > Number.NEGATIVE_INFINITY && v < 0) ? v ** 2 : 0).mean()) * Math.sqrt(annualTradingDays));
    const calmarRatio = annualizedReturn / (dd.max() || NaN);

    results.append(
      [ annualizedReturn * 100, volatility, sharpeRatio, sortinoRatio, calmarRatio ],
      [ StatsIndex.ReturnAnn, StatsIndex.VolatilityAnn, StatsIndex.SharpeRatio, StatsIndex.SortinoRatio, StatsIndex.CalmarRatio ],
      { inplace: true },
    );

    const maxDrawdown = -dd.max() * 100;
    const avgDrawdown = ddPeaks.count() ? -ddPeaks.mean() * 100 : NaN;
    const maxDrawdownDuration = ddDur.count() ? Math.ceil(ddDur.max()) : NaN;
    const avgDrawdownDuration = ddDur.count() ? Math.ceil(ddDur.mean()) : NaN;

    results.append(
      [ maxDrawdown, avgDrawdown, maxDrawdownDuration, avgDrawdownDuration ],
      [ StatsIndex.MaxDrawdown, StatsIndex.AvgDrawdown, StatsIndex.MaxDrawdownDuration, StatsIndex.AvgDrawdownDuration ],
      { inplace: true },
    );

    const nTrades = this.trades.length;
    const winRate = nTrades ? pl.gt(0).mean() * 100 : NaN;
    const bestTrade = nTrades ? returns.max() * 100 : NaN;
    const worstTrade = nTrades ? returns.min() * 100 : NaN;
    const meanReturn = nTrades ? this.computeGeometricMean(returns) : NaN;
    const avgTrade = nTrades ? meanReturn * 100 : NaN;
    const maxTradeDuration = nTrades ? Math.ceil(durations.max()) : NaN;
    const avgTradeDuration = nTrades ? Math.ceil(durations.mean()) : NaN;

    results.append(
      [ nTrades, winRate, bestTrade, worstTrade, avgTrade, maxTradeDuration, avgTradeDuration ],
      [ StatsIndex.Trades, StatsIndex.WinRate, StatsIndex.BestTrade, StatsIndex.WorstTrade, StatsIndex.AvgTrade, StatsIndex.MaxTradeDuration, StatsIndex.AvgTradeDuration ],
      { inplace: true },
    );

    const profitFactor = nTrades ? returns.apply(r => r > 0 ? r : null).sum() / (Math.abs(returns.apply(r => r < 0 ? r : null).sum())) : NaN;
    const expectancy = nTrades ? returns.mean() * 100 : NaN;
    const sqn = nTrades ? Math.sqrt(nTrades) * pl.mean() / pl.std() : NaN;

    results.append(
      [ profitFactor, expectancy, sqn ],
      [ StatsIndex.ProfitFactor, StatsIndex.Expectancy, StatsIndex.SQN ],
      { inplace: true },
    );

    results.apply(v => (typeof v === 'number') ? this.foramt(v) : v, { inplace: true });
    results.config.setMaxRow(results.index.length);

    this._equityCurve = equityCurve;
    this._tradeLog = tradeLog;
    this._results = results;

    return this;
  }

  public print() {
    this.results?.print();
  }

  public plot() {
    new Plotting(this).plot();
  }

  private computeExposureTime(index: string[], tradeLog: DataFrame) {
    const trades = tradeLog.values as Array<number[]>;

    const havePosition = new Series(
      trades.reduce((havePosition: number[], t: number[]) => {
        const [ size, entryBar, exitBar ] = t;
        return havePosition.map((value, index) => {
          return Array.from(
            { length: (exitBar - entryBar) + 1 },
            (v, i) => i + entryBar
          ).includes(index) ? 1 : value;
        });
      }, Array(index.length).fill(0)),
    );

    return havePosition.mean() * 100;
  }

  private computeReturnPct(values: Series) {
    const finalValue = values.iat(values.size - 1) as number;
    const initialValue = values.iat(0) as number;
    return (finalValue - initialValue) / initialValue * 100;
  }

  private computeDrawdownDurationPeaks(drawdown: Series) {
    //@ts-ignore
    const iloc = uniq([ ...drawdown.eq(0).values.reduce((arr, v, i) => v ? [ ...arr, i ] : arr, []), drawdown.index.length - 1]);
    const prev = [ NaN, ...iloc.slice(0, -1) ];
    const df = new DataFrame({ iloc, prev });

    // @ts-ignore
    df.query(df['iloc'].gt(df['prev'].add(1)), { inplace: true });

    // @ts-ignore
    df.setIndex({ index: df['iloc'].values.map(i => drawdown.index[i]), inplace: true })

    if (!df.size) {
      const nan = new Series(Array(drawdown.count()).fill(NaN))
      return [ nan, nan ];
    }

    df.addColumn('duration', df.values.map((row, i) => {
      const [ iloc, prev ] = row as number[];
      const start = DateTime.fromISO(drawdown.index[prev] as string);
      const end = DateTime.fromISO(drawdown.index[iloc] as string);
      return end.diff(start, 'days').get('days');
    }), { inplace: true });

    //@ts-ignore
    df.addColumn('peaks', df.apply(([iloc, prev, duration]) =>
      drawdown.iloc(Array.from({ length: (iloc - prev) + 1 }, (v, k) => k + prev)).max(), { axis: 1 },
    ), { inplace: true });

    const ddDur = new Series(drawdown.index.map(i => df.index.includes(i) ? df.at(i, 'duration') : NaN));
    const ddPeaks = new Series(drawdown.index.map(i => df.index.includes(i) ? df.at(i, 'peaks') : NaN));

    return [ ddDur, ddPeaks ];
  }

  private computeDayReturns(returns: Series) {
    const index = returns.index as string[];

    const iloc = index.reduce((iloc, d, i) => {
      if (i > 0) {
        const prev = DateTime.fromISO(returns.index[i - 1] as string).toISODate();
        const current = DateTime.fromISO(d as string).toISODate();
        if (current === prev) iloc[i - 1] = NaN;
      }
      return [ ...iloc, i ];
    }, [] as number[]).filter(v => !isNaN(v));

    const returnsByDate = returns.iloc(iloc);
    const returnValues = returnsByDate.values as number[];
    const dayReturns = new Series(returnValues.map((_, i) =>
      (i === 0) ? 0 : (returnValues[i] - returnValues[i - 1]) / returnValues[i - 1],
    ), { index: returnsByDate.index });

    return dayReturns;
  }

  private computeGeometricMean(returns: Series) {
    returns = returns.fillNa(0).add(1) as Series;
    if (returns.values.some(v => v <= 0)) return 0;
    return Math.exp(returns.apply(v => Math.log(v)).sum() / (returns.values.length || 0)) - 1;
  }

  private foramt(value: number) {
    const { precision = 12, digits = 6 } = this.options;
    return Math.round(parseFloat(value.toPrecision(precision)) * Math.pow(10, digits)) / Math.pow(10, digits);
  }
}
