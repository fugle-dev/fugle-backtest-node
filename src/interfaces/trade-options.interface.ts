import { Order } from '../order';

export interface TradeOptions {
  size: number;
  entryPrice: number;
  entryBar: number;
  exitPrice?: number;
  exitBar?: number;
  slOrder?: Order;
  tpOrder?: Order;
  tag?: Record<string, string>;
}
