import { Trade } from '../trade';

export interface OrderOptions {
  price?: number;
  size: number;
  limitPrice?: number;
  stopPrice?: number;
  slPrice?: number;
  tpPrice?: number;
  parentTrade?: Trade;
  tag?: Record<string, string>;
}
