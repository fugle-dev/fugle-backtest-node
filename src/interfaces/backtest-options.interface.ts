export interface BacktestOptions {
  cash?: number;
  commission?: number;
  margin?: number;
  tradeOnClose?: boolean;
  hedging?: boolean;
  exclusiveOrders?: boolean;
}
