import { DataFrame } from 'danfojs-node';

export interface Context {
  index: number;
  data: DataFrame;
  indicators: Map<string, number | Record<string, number>>;
  signals: Map<string, boolean>;
  prev?: Context;
}
