/**
 *  @license
 * Copyright 2022 JsData. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ==========================================================================
 */

import Utils from '../utils/utils';
import { ArrayType1D, ArrayType2D } from "../utils/arrays";

export interface NdframeInputDataType {
  data: any
  type?: number;
  index?: Array<string | number>
  columns?: string[]
  dtypes?: Array<string>
  isSeries: boolean;
}

/**
 * N-Dimension data structure. Stores multi-dimensional
 * data in a size-mutable, labeled data structure. Analogous to the Python Pandas DataFrame.
 *
 * @param  Object
 *
 *  data:  1D or 2D Array, JSON, Tensor, Block of data.
 *
 *  index: Array of numeric or string names for subseting array. If not specified, indexes are auto generated.
 *
 *  columns: Array of column names. If not specified, column names are auto generated.
 *
 *  dtypes: Array of data types for each the column. If not specified, dtypes inferred.
 *
 *  config: General configuration object for NDframe
 *
 * @returns NDframe
 */
export default class NDframe {
  static DATA_TYPES = ["float32", "int32", "string", "boolean", "datetime",'undefined'];
  static utils = new Utils();
  $isSeries: boolean;
  protected $data: any
  protected $dataIncolumnFormat: ArrayType1D | ArrayType2D = []
  protected $index: Array<string | number> = []
  protected $columns: string[] = []
  protected $dtypes: Array<string> = []

  constructor({ data, index, columns, dtypes, isSeries }: NdframeInputDataType) {
    this.$isSeries = isSeries

    if (data === undefined || (Array.isArray(data) && data.length === 0)) {
      if (columns === undefined) columns = [];
      if (dtypes === undefined) dtypes = [];
      if (columns.length === 0 && dtypes.length !== 0) {
        const msg = `DtypeError: columns parameter must be provided when dtypes parameter is provided`
        throw new Error(msg)
      }
      this.loadArrayIntoNdframe({ data: [], index: [], columns: columns, dtypes: dtypes });
    } else if (NDframe.utils.is1DArray(data)) {
      this.loadArrayIntoNdframe({ data, index, columns, dtypes });
    } else {
      if (Array.isArray(data) && NDframe.utils.isObject(data[0])) {
        this.loadObjectIntoNdframe({ data, type: 1, index, columns, dtypes });

      } else if (NDframe.utils.isObject(data)) {
        this.loadObjectIntoNdframe({ data, type: 2, index, columns, dtypes });

      } else if (
        Array.isArray((data)[0]) ||
        NDframe.utils.isNumber((data)[0]) ||
        NDframe.utils.isString((data)[0])
      ) {
        this.loadArrayIntoNdframe({ data, index, columns, dtypes });
      } else if (Array.isArray(data) && data.length > 0 && NDframe.utils.isDate(data[0])) {
        this.loadArrayIntoNdframe({ data, index, columns, dtypes });
      } else {
        throw new Error("File format not supported!");
      }
    }
  }

  /**
   * Internal function to load array of data into NDFrame
   * @param data The array of data to load into NDFrame
   * @param index Array of numeric or string names for subsetting array.
   * @param columns Array of column names.
   * @param dtypes Array of data types for each the column.
   */
  private loadArrayIntoNdframe({ data, index, columns, dtypes }: any): void {
    // this.$data = utils.replaceUndefinedWithNaN(data, this.$isSeries);
    this.$data = data
    /*if (!this.$config.isLowMemoryMode) {*/
    //In NOT low memory mode, we transpose the array and save in column format.
    //This makes column data retrieval run in constant time
    this.$dataIncolumnFormat = NDframe.utils.transposeArray(data)
    //}
    this.$setIndex(index);
    this.$setDtypes(dtypes);
    this.$setColumnNames(columns);
  }

  /**
   * Internal function to format and load a Javascript object or object of arrays into NDFrame.
   * @param data Object or object of arrays.
   * @param type The type of the object. There are two recognized types:
   *
   * - type 1 object are in JSON format `[{a: 1, b: 2}, {a: 30, b: 20}]`.
   *
   * - type 2 object are of the form `{a: [1,2,3,4], b: [30,20, 30, 20}]}`
   * @param index Array of numeric or string names for subsetting array.
   * @param columns Array of column names.
   * @param dtypes Array of data types for each the column.
   */
  private loadObjectIntoNdframe({ data, type, index, columns, dtypes }: any): void {
    if (type === 1 && Array.isArray(data)) {
      const _data = (data).map((item) => {
        return Object.values(item);
      });

      let _columnNames;

      if (columns) {
        _columnNames = columns
      } else {
        _columnNames = Object.keys((data)[0]);
      }

      this.loadArrayIntoNdframe({ data: _data, index, columns: _columnNames, dtypes });

    } else {
      const [_data, _colNames] = NDframe.utils.getRowAndColValues(data);
      let _columnNames;

      if (columns) {
        _columnNames = columns
      } else {
        _columnNames = _colNames
      }
      this.loadArrayIntoNdframe({ data: _data, index, columns: _columnNames, dtypes });
    }
  }

  /**
   * Returns the dtypes of the columns
   */
  get dtypes(): Array<string> {
    return this.$dtypes
  }

  /**
   * Internal function to set the Dtypes of the NDFrame from an array. This function
   * performs the necessary checks.
   */
  $setDtypes(dtypes: Array<string> | undefined): void {
    if (this.$isSeries) {
      if (dtypes) {
        if (this.$data.length != 0 && dtypes.length != 1) {
          const msg = `DtypeError: You provided a dtype array of length ${dtypes.length} but Ndframe columns has length of ${this.shape[1]}`
          throw new Error(msg)
        }

        if (!(NDframe.DATA_TYPES.includes(`${dtypes[0]}`))) {
          const msg = `DtypeError: Dtype "${dtypes[0]}" not supported. dtype must be one of "${NDframe.DATA_TYPES}"`
          throw new Error(msg)
        }

        this.$dtypes = dtypes
      } else {
        this.$dtypes = NDframe.utils.inferDtype(this.$data)
      }

    } else {
      if (dtypes) {
        if (this.$data.length != 0 && dtypes.length != this.shape[1]) {
          const msg = `DtypeError: You provided a dtype array of length ${dtypes.length} but Ndframe columns has length of ${this.shape[1]}`
          throw new Error(msg)
        }

        if (this.$data.length == 0 && dtypes.length == 0) {
          this.$dtypes = dtypes
        } else {
          dtypes.forEach((dtype) => {
            if (!(NDframe.DATA_TYPES.includes(dtype))) {
              const msg = `DtypeError: Dtype "${dtype}" not supported. dtype must be one of "${NDframe.DATA_TYPES}"`
              throw new Error(msg)
            }
          })

          this.$dtypes = dtypes

        }

      } else {
        this.$dtypes = NDframe.utils.inferDtype(this.$data)
      }
    }
  }

  /**
   * Returns the dimension of the data. Series have a dimension of 1,
   * while DataFrames have a dimension of 2.
   */
  /*get ndim(): number {
    if (this.$isSeries) {
      return 1;
    } else {
      return 2
    }
  }*/

  /**
   * Returns the axis labels of the NDFrame.
   *//*
  get axis(): AxisType {
    return {
      index: this.$index,
      columns: this.$columns
    };
  }*/

  /**
   * Returns the indices of the NDFrame
   */
  get index(): Array<string | number> {
    return this.$index

  }

  /**
   * Internal function to set the index of the NDFrame with the specified
   * array of indices. Performs all necessary checks to ensure that the
   * index is valid.
   */
  $setIndex(index: Array<string | number> | undefined): void {
    if (index) {

      if (this.$data.length != 0 && index.length != this.shape[0]) {
        const msg = `IndexError: You provided an index of length ${index.length} but Ndframe rows has length of ${this.shape[0]}`
        throw new Error(msg)
      }
      if (Array.from(new Set(index)).length !== this.shape[0]) {
        const msg = `IndexError: Row index must contain unique values`
        throw new Error(msg)
      }

      this.$index = index
    } else {
      this.$index = NDframe.utils.range(0, this.shape[0] - 1) //generate index
    }
  }

  /**
   * Internal function to reset the index of the NDFrame using a range of indices.
   */
  $resetIndex(): void {
    this.$index = NDframe.utils.range(0, this.shape[0] - 1)
  }

  /**
   * Returns the column names of the NDFrame
   */
  get columns(): string[] {
    return this.$columns
  }

  /**
   * Internal function to set the column names for the NDFrame. This function
   * performs a check to ensure that the column names are unique, and same length as the
   * number of columns in the data.
   */
  $setColumnNames(columns?: string[]) {

    // console.log(columns);
    if (this.$isSeries) {
      if (columns) {
        if (this.$data.length != 0 && columns.length != 1 && typeof columns != 'string') {
          const msg = `ParamError: Column names length mismatch. You provided a column of length ${columns.length} but Ndframe columns has length of ${this.shape[1]}`
          throw new Error(msg)
        }
        this.$columns = columns
      } else {
        this.$columns = ["0"]
      }
    } else {
      if (columns) {
        if (this.$data.length != 0 && columns.length != this.shape[1]) {
          const msg = `ParamError: Column names length mismatch. You provided a column of length ${columns.length} but Ndframe columns has length of ${this.shape[1]}`
          throw new Error(msg)
        }
        if (Array.from(new Set(columns)).length !== columns.length) {
          const msg = `ColumnIndexError: Column index must contain unique values`
          throw new Error(msg)
        }

        this.$columns = columns
      } else {
        this.$columns = (NDframe.utils.range(0, this.shape[1] - 1)).map((val) => `${val}`) //generate columns
      }
    }
  }

  /**
   * Returns the shape of the NDFrame. Shape is determined by [row length, column length]
   */
  get shape(): Array<number> {
    if (this.$data.length === 0) {
      if (this.$columns.length === 0) return [0, 0];
      else return [0, this.$columns.length];
    }
    if (this.$isSeries) {
      return [this.$data.length, 1];
    } else {
      const rowLen = (this.$data).length
      const colLen = (this.$data[0] as []).length
      return [rowLen, colLen]
    }
  }

  /**
   * Returns the underlying data in Array format.
   */
  get values(): ArrayType1D | ArrayType2D {
    return this.$data;
  }

  /**
   * Updates the internal $data property to the specified value
   * @param values An array of values to set
   * @param checkLength Whether to check the length of the new values and the existing row length
   * @param checkColumnLength Whether to check the length of the new values and the existing column length
   * */
  $setValues(values: ArrayType1D | ArrayType2D, checkLength = true, checkColumnLength = true): void {
    if (this.$isSeries) {
      if (checkLength && values.length != this.shape[0]) {
        const msg = `ParamError: Row data length mismatch. You provided data with length ${values.length} but Ndframe has row of length ${this.shape[0]}`
        throw new Error(msg)
      }

      this.$data = values
      this.$dtypes = NDframe.utils.inferDtype(values) //Dtype may change depeneding on the value set
      this.$dataIncolumnFormat = values

    } else {
      if (checkLength && values.length != this.shape[0]) {
        const msg = `ParamError: Row data length mismatch. You provided data with length ${values.length} but Ndframe has row of length ${this.shape[0]}`
        throw new Error(msg)
      }

      if (checkColumnLength) {
        values.forEach(value => {
          if ((value as ArrayType1D).length != this.shape[1]) {
            const msg = `ParamError: Column data length mismatch. You provided data with length ${values.length} but Ndframe has column of length ${this.shape[0]}`
            throw new Error(msg)
          }
        })
      }

      this.$data = values
      this.$dtypes = NDframe.utils.inferDtype(values)
      this.$dataIncolumnFormat = NDframe.utils.transposeArray(values)
    }
  }

  /**
   * Returns the underlying data in Array column format.
   * Similar to this.values, but in column format.
   *//*
  get getColumnData() {
    if (this.config.isLowMemoryMode) {
      return utils.transposeArray(this.values);
    } else {
      return this.$dataIncolumnFormat;
    }
  }*/

  /**
   * Returns the size of the NDFrame object
   *
   */
  get size(): number {
    return this.shape[0] * this.shape[1]
  }

  /**
   * Converts a DataFrame or Series to CSV.
   * @deprecated Use `toCSV` function directly instead.
   * @example
   * ```
   * import * as dfd from "danfojs"
   * const df = new dfd.DataFrame([[1, 2, 3], [4, 5, 6]])
   * const csv = dfd.toCSV(df)
   * ```
   * @example
   * ```
   * import { toCSV } from "danfojs-node"
   * const df = new DataFrame([[1, 2, 3], [4, 5, 6]])
   * toCSV(df, {
   *     filePath: "./data/sample.csv",
   *     header: true,
   *     sep: "+"
   *   })
   *//*
  toCSV(options?: any): string | void {
    throw new Error("`toCSV` function is deprecated. Use `toCSV` function directly instead. e.g. `dfd.toCSV(df)`")
  }*/

  /**
   * Converts a DataFrame or Series to JSON.
   * deprecated Use `toJSON` function directly instead.
   * @example
   * ```
   * import * as dfd from "danfojs-node"
   * const df = new dfd.DataFrame([[1, 2, 3], [4, 5, 6]])
   * const json = dfd.toJSON(df)
   * ```
   * @example
   * ```
   * import { toJSON } from "danfojs-node"
   * const df = new DataFrame([[1, 2, 3], [4, 5, 6]])
   * toJSON(df, {
   *     filePath: "./data/sample.json",
   *     format: "row"
   *   })
   * ```
   */
  toJSON(options?: any): object | void {
      //let { fileName, format, download } = { fileName: "output.json", download: false, format: "column", ...options }

    if (this.$isSeries) {
      const obj: { [key: string]: ArrayType1D } = {};
      obj[this.columns[0]] = this.values as ArrayType1D;

      /*if (download) {
        if (!fileName.endsWith(".json")) {
          fileName = fileName + ".json"
        }
        $downloadFileInBrowser(obj, fileName)
      } else {
        return obj
      }*/

    } else {
      /*if (format === "row") {
        const obj: { [key: string]: ArrayType1D } = {};
        for (let i = 0; i < df.columns.length; i++) {
          obj[df.columns[i]] = (df as DataFrame).column(df.columns[i]).values as ArrayType1D;
        }
        if (download) {
          if (!(fileName.endsWith(".json"))) {
            fileName = fileName + ".json"
          }

          $downloadFileInBrowser(obj, fileName)
        } else {
          return obj
        }
      } else {*/
      const values = this.values as ArrayType2D
      const header = this.columns
      const jsonArr: any = [];

      values.forEach((val) => {
        const obj: any = {};
        header.forEach((h: any, i: any) => {
          obj[h] = val[i]
        });
        jsonArr.push(obj);
      });
      /*if (download) {
        if (!fileName.endsWith(".json")) {
          fileName = fileName + ".json"
        }
        $downloadFileInBrowser(jsonArr, fileName)
      } else {*/
      return jsonArr
      //}
      //}
    }
  }

  /**
   * Converts a DataFrame or Series to Excel.
   * @deprecated Use `toExcel` function directly instead.
   * @example
   * ```
   * import * as dfd from "danfojs"
   * const df = new dfd.DataFrame([[1, 2, 3], [4, 5, 6]])
   * dfd.toExcel(df, {
   *     filePath: "./data/sample.xlsx",
   *     sheetName: "MySheet",
   *   })
   * ```
   *
   * @example
   * ```
   * import { toExcel } from "danfojs-node"
   * const df = new DataFrame([[1, 2, 3], [4, 5, 6]])
   * toExcel(df, {
   *     filePath: "./data/sample.xlsx",
   *     sheetName: "MySheet",
   *   })
   * ```
   *//*
  toExcel(options?: any): void {
    throw new Error("Deprecated. Use `toExcel` function directly instead. e.g. `dfd.toExcel(df, {filePath: 'path/to/file.xlsx'})`")
  }*/

  /**
   * Pretty prints a DataFrame or Series to the console
   */
  print() {
    console.log(this + "");
  }
}
