export interface Candle {
  date: Date | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CandleList {
  date: Date[] | string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume?: number[];
}

export type HistoricalData = Array<Candle> | CandleList;
