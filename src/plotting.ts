import * as fs from 'fs';
import * as assert from 'assert';
import * as open from 'open';
import { minify } from 'html-minifier';
import { Stats } from './stats';
import { PlottingOptions } from './interfaces';

import DataFrame from './ndframe/dataframe';

export class Plotting {
  private readonly openBrowser: boolean;
  private readonly filename: string;

  constructor(private readonly stats: Stats, private readonly options?: PlottingOptions) {
    this.openBrowser = options?.openBrowser ?? true;
    this.filename = options?.filename?.toLowerCase() ?? 'output.html';
  }

  public plot() {
    const html = minify(this.createHTML(), {
      collapseWhitespace: true,
      removeComments: true,
      collapseBooleanAttributes: true,
      useShortDoctype: true,
      removeEmptyAttributes: true,
      removeOptionalTags: true,
      minifyJS: true
    });
    const outputFile = this.filename.endsWith('.html') ? `./${this.filename}` : `./${this.filename}.html`;
    fs.writeFileSync(outputFile, html);

    if (this.openBrowser) open(outputFile);
  }

  private createHTML() {
    assert(this.stats.results);
    assert(this.stats.equityCurve);
    assert(this.stats.tradeLog);

    const df = this.stats.equityCurve.addColumn('Date', this.stats.equityCurve.index) as DataFrame;
    const equityCurve = JSON.stringify(df.toJSON());
    const tradesTable = JSON.stringify(this.stats.tradeLog.toJSON() as DataFrame);

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://cdn.jsdelivr.net/npm/danfojs@1.1.2/lib/bundle.min.js"></script>
          <title>Document</title>
        </head>
        <body>
          <div id="plot_equity"></div>
          <div id="plot_trades"></div>
          <script>
            const df = new dfd.DataFrame(JSON.parse('${equityCurve}'));
            const new_df = df.setIndex({ column: "Date" });
            new_df.plot("plot_equity").line({
              config: {
                columns: ["Equity"],
              },
              layout: {
                title: "Equity Curve",
              },
            });

            const tradesDf = new dfd.DataFrame(JSON.parse('${tradesTable}'));
            tradesDf.plot("plot_trades").table({
              layout: {
                title: "List of Trades",
              },
            });
          </script>
        </body>
      </html>
    `;
  }
}
