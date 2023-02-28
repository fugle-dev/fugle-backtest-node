import { DataFrame } from 'danfojs-node';
import { Stats } from '../stats';

export interface PlottingOptions {
  results: Stats;
  data: DataFrame;
  indicators?: Array<any>;
  filename?: string;
  plotWidth?: boolean;
  plotEquity?: boolean;
  plotReturn?: boolean;
  plotPl?: boolean;
  plotVolume?: boolean;
  plotDrawdown?: boolean;
  plotTrades?: boolean;
  smoothEquity?: boolean;
  relativeEquity?: boolean;
  superimpose?: boolean;
  resample?: boolean;
  reverseIndicators?: boolean;
  showLegend?: boolean;
  openBrowser?: boolean;
}
