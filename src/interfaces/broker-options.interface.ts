import { BacktestOptions } from './backtest-options.interface';

export interface BrokerOptions extends Required<Omit<BacktestOptions, 'outputFile' | 'openBrowser'>> {}
