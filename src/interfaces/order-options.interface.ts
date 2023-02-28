import { Trade } from '../trade';

export interface OrderOptions {
  size: number;
  limitPrice?: number;
  stopPrice?: number;
  slPrice?: number;
  tpPrice?: number;
  parentTrade?: Trade;
  tag?: Record<string, string>;
}
