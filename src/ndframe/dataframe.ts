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

import { ArrayType1D, ArrayType2D } from '../utils/arrays';
import NDframe from "./ndframe";
import Series from './series';

/**
 * Two-dimensional ndarray with axis labels.
 * The object supports both integer- and label-based indexing and provides a host of methods for performing operations involving the index.
 * Operations between DataFrame (+, -, /, , *) align values based on their associated index values– they need not be the same length.
 * @param data 2D Array, JSON, Tensor, Block of data.
 * @param options.index Array of numeric or string names for subseting array. If not specified, indices are auto generated.
 * @param options.columns Array of column names. If not specified, column names are auto generated.
 * @param options.dtypes Array of data types for each the column. If not specified, dtypes are/is inferred.
 * @param options.config General configuration object for extending or setting NDframe behavior.
 */
export default class DataFrame extends NDframe {
  [key: string]: any
  constructor(data: any, options: any = {}) {
    const { index, columns, dtypes } = options;
    super({ data, index, columns, dtypes, isSeries: false });
    this.$setInternalColumnDataProperty();
  }

  /**
   * Access a single value for a row/column label pair.
   * Similar to {@link loc}, in that both provide label-based lookups.
   * Use at if you only need to get or set a single value in a DataFrame.
   * @param row Row index of the value to access.
   * @param column Column label of the value to access.
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * df.at(0,'A') // 1
   * df.at(1, 'A') // 3
   * df.at(1, 'B') // 4
   * ```
   */
  at(row: string | number, column: string): string | number | boolean | undefined {
    if (typeof column !== 'string') {
      throw new Error('ParamError: column index must be a string. Use .iat to get a row or column by index.')
    }
    return (this.values as ArrayType2D)[this.index.indexOf(row)][this.columns.indexOf(column)]
  }

  /**
   * Access a single value for a row/column pair by integer position.
   * Similar to {@link iloc}, in that both provide integer-based lookups.
   * Use iat if you only need to get or set a single value in a DataFrame.
   * @param row Row index of the value to access.
   * @param column Column index of the value to access.
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * df.iat(0, 0) // 1
   * df.iat(0, 1) // 2
   * df.iat(1, 0) // 3
   * ```
   */
  iat(row: number, column: number): string | number | boolean | undefined {
    if (typeof row === 'string' || typeof column === 'string') {
      throw new Error('ParamError: row and column index must be an integer. Use .at to get a row or column by label.')
    }

    return (this.values as ArrayType2D)[row][column]
  }

  /**
   * Returns the first n values in a DataFrame
   * @param rows The number of rows to return
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * const df2 = df.head(1)
   * ```
   */
  head(rows = 5): DataFrame {

    if (rows <= 0) {
      throw new Error("ParamError: Number of rows cannot be less than 1")
    }
    if (this.shape[0] <= rows) {
      return this.copy()
    }
    if (this.shape[0] - rows < 0) {
      throw new Error("ParamError: Number of rows cannot be greater than available rows in data")
    }

    return this.iloc({ rows: [`0:${rows}`] })
  }

  /**
   * Purely integer-location based indexing for selection by position.
   * ``.iloc`` is primarily integer position based (from ``0`` to
   * ``length-1`` of the axis), but may also be used with a boolean array.
   *
   * @param rows Array of row indexes
   * @param columns Array of column indexes
   *
   * Allowed inputs are in rows and columns params are:
   *
   * - An array of single integer, e.g. ``[5]``.
   * - A list or array of integers, e.g. ``[4, 3, 0]``.
   * - A slice array string with ints, e.g. ``["1:7"]``.
   * - A boolean array.
   * - A ``callable`` function with one argument (the calling Series or
   * DataFrame) and that returns valid output for indexing (one of the above).
   * This is useful in method chains, when you don't have a reference to the
   * calling object, but would like to base your selection on some value.
   *
   * ``.iloc`` will raise ``IndexError`` if a requested indexer is
   * out-of-bounds.
   *
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B'] })
   * const df2 = df.iloc({ rows: [1], columns: ["A"] })
   * ```
   */
  iloc({ rows, columns }: {
    rows?: Array<string | number | boolean> | Series,
    columns?: Array<string | number>
  }): DataFrame {
    /**
     * Generates an array of integers between specified range
     * @param start The starting number.
     * @param end The ending number.
     */
    function range(start: number, end: number): Array<number> {
      if (end < start) {
        throw new Error("ParamError: end must be greater than start")
      }

      if (start === end) {
        return [start]
      }

      const arr = [];
      for (let i = start; i <= end; i++) {
        arr.push(i);
      }
      return arr;
    }

    let _rowIndexes: Array<number>
    let _columnIndexes: Array<number>

    const _data = this.values;
    const _index = this.index;

    if (rows instanceof Series) {
      rows = rows.values as Array<string | number>
    }

    if (rows !== undefined && !Array.isArray(rows)) {
      throw new Error(`rows parameter must be an Array. For example: rows: [1,2] or rows: ["0:10"]`)
    }

    if (columns !== undefined && !Array.isArray(columns)) {
      throw new Error(`columns parameter must be an Array. For example: columns: [1,2] or columns: ["0:10"]`)
    }

    if (!rows) {
      _rowIndexes = range(0, this.shape[0] - 1);

    } else if (rows.length == 1 && typeof rows[0] == "string") {
      const rowSplit = rows[0].split(":")

      if (rowSplit.length != 2) {
        throw new Error(`Invalid row split parameter: If using row split string, it must be of the form; rows: ["start:end"]`);
      }
      if (isNaN(parseInt(rowSplit[0])) && rowSplit[0] != "") {
        throw new Error(`Invalid row split parameter. Split parameter must be a number`);
      }

      if (isNaN(parseInt(rowSplit[1])) && rowSplit[1] != "") {
        throw new Error(`Invalid row split parameter. Split parameter must be a number`);
      }

      const start = rowSplit[0] == "" ? 0 : parseInt(rowSplit[0])
      const end = rowSplit[1] == "" ? this.shape[0] : parseInt(rowSplit[1])

      if (start < 0) {
        throw new Error(`row slice [start] index cannot be less than 0`);
      }

      if (end > this.shape[0]) {
        throw new Error(`row slice [end] index cannot be bigger than ${this.shape[0]}`);
      }
      //_rowIndexes = utils.range(start, end - 1)
      _rowIndexes = range(start, end - 1)
    } else {
      const _formatedRows = []
      for (let i = 0; i < rows.length; i++) {
        const _indexToUse = rows[i];
        if (_indexToUse > this.shape[0]) {
          throw new Error(`Invalid row parameter: Specified index ${_indexToUse} cannot be bigger than index length ${this.shape[0]}`);
        }

        if (typeof _indexToUse !== "number" && typeof _indexToUse !== "boolean") {
          throw new Error(`Invalid row parameter: row index ${_indexToUse} must be a number or boolean`);
        }

        if (typeof _indexToUse === "boolean" && _indexToUse === true) {
          _formatedRows.push(_index[i])
        }

        if (typeof _indexToUse === "number") {
          _formatedRows.push(_indexToUse)
        }
      }

      _rowIndexes = _formatedRows as number[]
    }

    if (!columns) {
      //_columnIndexes = utils.range(0, ndFrame.shape[1] - 1)
      _columnIndexes = range(0, this.shape[1] - 1)

    } else if (columns.length == 1 && typeof columns[0] == "string") {
      const columnSplit = columns[0].split(":")

      if (columnSplit.length != 2) {
        throw new Error(`Invalid column split parameter: If using column split string, it must be of the form; columns: ["start:end"]`);
      }
      if (isNaN(parseInt(columnSplit[0])) && columnSplit[0] != "") {
        throw new Error(`Invalid column split parameter. Split parameter must be a number`);
      }

      if (isNaN(parseInt(columnSplit[1])) && columnSplit[1] != "") {
        throw new Error(`Invalid column split parameter. Split parameter must be a number`);
      }

      const start = columnSplit[0] == "" ? 0 : parseInt(columnSplit[0])
      const end = columnSplit[1] == "" ? this.shape[1] : parseInt(columnSplit[1])

      if (start < 0) {
        throw new Error(`column slice [start] index cannot be less than 0`);
      }

      if (end > this.shape[1]) {
        throw new Error(`column slice [end] index cannot be bigger than ${this.shape[1]}`);
      }
      //_columnIndexes = utils.range(start, end - 1)
      _columnIndexes = range(start, end - 1)
    } else {

      for (let i = 0; i < columns.length; i++) {
        const _indexToUse = columns[i];
        if (_indexToUse > this.shape[1]) {
          throw new Error(`Invalid column parameter: Specified index ${_indexToUse} cannot be bigger than index length ${this.shape[1]}`);
        }

        if (typeof _indexToUse != "number") {
          throw new Error(`Invalid column parameter: column index ${_indexToUse} must be a number`);
        }

      }

      _columnIndexes = columns as number[]
    }
    const newData = []
    const newIndex = []
    const newColumnNames: string[] = []
    const newDtypes = []

    for (let i = 0; i < _rowIndexes.length; i++) {
      const rowIndx = _rowIndexes[i]
      const rowData: any = _data[rowIndx]
      const newRowDataWithRequiredCols = []

      for (let j = 0; j < _columnIndexes.length; j++) {
        const colIndx = _columnIndexes[j]
        newRowDataWithRequiredCols.push(rowData[colIndx])
      }
      newData.push(newRowDataWithRequiredCols)
      newIndex.push(_index[rowIndx])
    }

    for (let i = 0; i < _columnIndexes.length; i++) {
      const colIndx = _columnIndexes[i]
      newColumnNames.push(this.columns[colIndx])
      newDtypes.push(this.dtypes[colIndx])

    }
    const df = new DataFrame(
      newData,
      {
        index: newIndex,
        columns: newColumnNames,
        dtypes: newDtypes,
      })
    return df
  }

  /**
   * Makes a deep copy of a DataFrame.
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * const df2 = df.copy()
   * df2.print()
   * ```
   */
  copy(): DataFrame {
    const df = new DataFrame([...this.$data], {
      columns: [...this.columns],
      index: [...this.index],
      dtypes: [...this.dtypes],
    });
    return df;
  }

  /**
   * Returns "greater than" of dataframe and other.
   * @param other DataFrame, Series, Array or Scalar number to compare with
   * @param options.axis 0 or 1. If 0, add column-wise, if 1, add row-wise
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * df.gt(2).print()
   * ```
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * df.gt([2, 3], { axis: 0 }).print()
   * ```
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * const sf = new Series([2, 3])
   * df.gt(sf, { axis: 1 }).print()
   * ```
   */
  gt(other: DataFrame | Series | number | Array<number>, options?: { axis?: 0 | 1 }): DataFrame {
    const { axis } = { axis: 1, ...options }

    if (this.$frameIsNotCompactibleForArithmeticOperation()) {
      throw Error("TypeError: gt operation is not supported for string dtypes");
    }

    if ([0, 1].indexOf(axis) === -1) {
      throw Error("ParamError: Axis must be 0 or 1");
    }

    const tensors = this.$getTensorsForArithmeticOperationByAxis(other, axis);
    return this.$logicalOps(tensors, "gt")
  }

  /**
   * Queries the DataFrame for rows that meet the boolean criteria. This is just a wrapper for the `iloc` method.
   * @param condition An array of boolean mask, one for each row in the DataFrame. Rows where the value are true will be returned.
   * @param options.inplace Boolean indicating whether to perform the operation inplace or not. Defaults to false
   *
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4], [1, 2], [5, 6]], { columns: ['A', 'B'] })
   * const df2 = df.query([true, false, true, true])
   * df2.print()
   * ```
   *
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4], [1, 2], [5, 6]], { columns: ['A', 'B'] })
   * const df2 = df.query(df["A"].gt(2))
   * df2.print()
   * ```
   *
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4], [1, 2], [5, 6]], { columns: ['A', 'B'] })
   * const df2 = df.query(df["A"].gt(2).and(df["B"].lt(5)))
   * df2.print()
   * ```
   *
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4], [1, 2], [5, 6]], { columns: ['A', 'B'] })
   * df.query(df["A"].gt(2), { inplace: true })
   * df.print()
   * ```
   **/
  query(condition: Series | Array<boolean>, options?: { inplace?: boolean }): DataFrame
  query(condition: Series | Array<boolean>, options?: { inplace?: boolean }): DataFrame | void {
    const { inplace } = { inplace: false, ...options }

    if (!condition) {
      throw new Error("ParamError: condition must be specified");
    }

    const result = this.iloc({
      rows: condition,
    }) as DataFrame

    if (inplace) {
      this.$setValues(result.values, false, false)
      this.$setIndex(result.index)
    } else {
      return result
    }
  }

  /**
   * Adds a new column to the DataFrame. If column exists, then the column values is replaced.
   * @param column The name of the column to add or replace.
   * @param values An array of values to be inserted into the DataFrame. Must be the same length as the columns
   * @param options.inplace Boolean indicating whether to perform the operation inplace or not. Defaults to false
   * @param options.atIndex Column index to insert after. Defaults to the end of the columns.
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * const df2 = df.addColumn('C', [5, 6])
   * df2.print()
   * ```
   *
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * df.addColumn('C', [5, 6], { inplace: true }).print()
   * ```
   *
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * df.addColumn('C', [5, 6], { inplace: true, atIndex: 0 }).print()
   * ```
   */
  addColumn(
    column: string,
    values: Series | ArrayType1D,
    options?: { inplace?: boolean, atIndex?: number | string }
  ): DataFrame
  addColumn(
    column: string,
    values: Series | ArrayType1D,
    options?: { inplace?: boolean, atIndex?: number | string }
  ): DataFrame | void {
    // eslint-disable-next-line prefer-const
    let { inplace, atIndex } = { inplace: false, atIndex: this.columns.length, ...options };
    if (typeof atIndex === "string") {
      if (!(this.columns.includes(atIndex))) {
        throw new Error(`${atIndex} not a column`)
      }
      atIndex = this.columns.indexOf(atIndex)
    }

    if (!column) {
      throw new Error("ParamError: column must be specified")
    }

    if (!values) {
      throw new Error("ParamError: values must be specified")
    }

    const columnIndex = this.$columns.indexOf(column)

    if (columnIndex === -1) {
      let colunmValuesToAdd: ArrayType1D

      if (values instanceof Series) {
        colunmValuesToAdd = values.values as ArrayType1D
      } else if (Array.isArray(values)) {
        colunmValuesToAdd = values;
      } else {
        throw new Error("ParamError: specified value not supported. It must either be an Array or a Series of the same length")
      }

      if (colunmValuesToAdd.length !== this.shape[0]) {
        const msg = `ParamError: Column data length mismatch. You provided data with length ${colunmValuesToAdd.length} but Ndframe has column of length ${this.shape[0]}`
        throw new Error(msg)
      }

      const newData = []
      const oldValues = this.$data
      for (let i = 0; i < oldValues.length; i++) {
        const innerArr = [...oldValues[i]] as ArrayType1D
        innerArr.splice(atIndex, 0, colunmValuesToAdd[i])
        newData.push(innerArr)
      }

      if (inplace) {
        this.$setValues(newData, true, false)
        const columns = [...this.columns]
        columns.splice(atIndex, 0, column)
        this.$setColumnNames(columns)
        this.$setInternalColumnDataProperty(column);

      } else {
        const columns = [...this.columns]
        columns.splice(atIndex, 0, column)

        const df = new DataFrame(newData, {
          index: [...this.index],
          columns: columns,
          dtypes: [...this.dtypes, NDframe.utils.inferDtype(colunmValuesToAdd)[0]],
        })
        return df
      }
    } else {
      this.$setColumnData(column, values);
    }

  }

  /**
   * Updates the internal column data via column name.
   * @param column The name of the column to update.
   * @param arr The new column data
   */
  private $setColumnData(column: string, arr: ArrayType1D | Series): void {

    const columnIndex = this.$columns.indexOf(column)

    if (columnIndex == -1) {
      throw new Error(`ParamError: column ${column} not found in ${this.$columns}. If you need to add a new column, use the df.addColumn method. `)
    }

    let colunmValuesToAdd: ArrayType1D

    if (arr instanceof Series) {
      colunmValuesToAdd = arr.values as ArrayType1D
    } else if (Array.isArray(arr)) {
      colunmValuesToAdd = arr;
    } else {
      throw new Error("ParamError: specified value not supported. It must either be an Array or a Series of the same length")
    }

    if (colunmValuesToAdd.length !== this.shape[0]) {
      const msg = `ParamError: Column data length mismatch. You provided data with length ${colunmValuesToAdd.length} but Ndframe has column of length ${this.shape[0]}`
      throw new Error(msg)
    }

    //Update row ($data) array
    for (let i = 0; i < this.values.length; i++) {
      (this.$data as any)[i][columnIndex] = colunmValuesToAdd[i]
    }
    //Update column ($dataIncolumnFormat) array since it's available in object
    (this.$dataIncolumnFormat as any)[columnIndex] = arr

    //Update the dtypes
    this.$dtypes[columnIndex] = NDframe.utils.inferDtype(colunmValuesToAdd)[0]

  }

  /**
   * Maps all column names to their corresponding data, and return them as Series objects.
   * This makes column subsetting works. E.g this can work ==> `df["col1"]`
   * @param column Optional, a single column name to map
   */
  private $setInternalColumnDataProperty(column?: string) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    if (column && typeof column === "string") {
      if (typeof self[column] === 'function') throw new Error(`${column} is a instance method`);
      Object.defineProperty(self, column, {
        get() {
          return self.$getColumnData(column)
        },
        set(arr: ArrayType1D | Series) {
          self.$setColumnData(column, arr);
        }
      })
    } else {
      const columns = this.columns;
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        if (typeof this[column] === 'function') throw new Error(`${column} is an instance method`);
        Object.defineProperty(this, column, {
          get() {
            return self.$getColumnData(column)
          },
          set(arr: ArrayType1D | Series) {
            self.$setColumnData(column, arr);
          }
        })
      }
    }

  }

  /**
   * Returns the column data from the DataFrame by column name.
   * @param column column name to get the column data
   * @param returnSeries Whether to return the data in series format or not. Defaults to true
   */
  private $getColumnData(column: string, returnSeries = true) {
    const columnIndex = this.columns.indexOf(column)

    if (columnIndex == -1) {
      const msg = `ParamError: Column not found!. Column name must be one of ${this.columns}`
      throw new Error(msg)
    }

    const dtypes = [this.$dtypes[columnIndex]]
    const index = [...this.$index]
    const columns = [column]

    const data = this.$dataIncolumnFormat[columnIndex]
    if (returnSeries) {
      return new Series(data, {
        dtypes,
        index,
        columns,
      })
    } else {
      return data
    }

  }

  /**
   * Return data aligned to the specified axis. Transposes the array if needed.
   * @param axis 0 or 1. If 0, column-wise, if 1, row-wise
   */
  private $getDataArraysByAxis(axis: number): ArrayType2D {
    if (axis === 1) {
      return this.values as ArrayType2D
    } else {
      return this.$dataIncolumnFormat as ArrayType2D
    }
  }

  /**
   * Return data with missing values removed from a specified axis
   * @param axis 0 or 1. If 0, column-wise, if 1, row-wise
   */
  private $getDataByAxisWithMissingValuesRemoved(axis: number): Array<number[]> {
    const oldValues = this.$getDataArraysByAxis(axis);
    const cleanValues = [];
    for (let i = 0; i < oldValues.length; i++) {
      const values = oldValues[i] as number[]
      cleanValues.push(NDframe.utils.removeMissingValuesFromArray(values) as number[]);
    }
    return cleanValues;
  }

  /**
   * Drop specified columns or rows.
   * @param options.columns Array of column names to drop.
   * @param options.index Array of index to drop.
   * @param options.inplace Boolean indicating whether to perform the operation inplace or not. Defaults to false.
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * const df2 = df.drop({ columns: ['A'] })
   * df2.print()
   * ```
   *
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * df.drop({ index: [0], inplace: true }).print()
   * ```
   */
  drop(options?:
         {
           columns?: string | Array<string>,
           index?: Array<string | number>,
           inplace?: boolean
         }
  ): DataFrame
  drop(options?:
         {
           columns?: string | Array<string>,
           index?: Array<string | number>,
           inplace?: boolean
         }
  ): DataFrame | void {
    const { columns, index, inplace } = { inplace: false, ...options }

    if (!columns && !index) {
      throw Error('ParamError: Must specify one of columns or index');
    }

    if (columns && index) {
      throw Error('ParamError: Can only specify one of columns or index');
    }

    if (columns) {
      const columnIndices: Array<number> = []

      if (typeof columns === "string") {
        columnIndices.push(this.columns.indexOf(columns))
      } else if (Array.isArray(columns)) {
        for (const column of columns) {
          if (this.columns.indexOf(column) === -1) {
            throw Error(`ParamError: specified column "${column}" not found in columns`);
          }
          columnIndices.push(this.columns.indexOf(column))
        }

      } else {
        throw Error('ParamError: columns must be an array of column names or a string of column name');
      }

      const newRowData: ArrayType2D = []
      const newColumnNames = []
      const newDtypes = []

      for (let i = 0; i < this.values.length; i++) {
        const tempInnerArr = []
        const innerArr = this.values[i] as ArrayType1D
        for (let j = 0; j < innerArr.length; j++) {
          if (!(columnIndices.includes(j))) {
            tempInnerArr.push(innerArr[j])
          }
        }
        newRowData.push(tempInnerArr)
      }

      for (let i = 0; i < this.columns.length; i++) {
        const element = this.columns[i]
        if (!(columns.includes(element))) {
          newColumnNames.push(element)
          newDtypes.push(this.dtypes[i])
        }
      }

      if (inplace) {
        this.$setValues(newRowData, true, false)
        this.$setColumnNames(newColumnNames)
      } else {
        const df = new DataFrame(newRowData,
          {
            index: [...this.index],
            columns: newColumnNames,
            dtypes: newDtypes,
          });
        return df;
      }

    }

    if (index) {
      const rowIndices: Array<number> = []

      if (typeof index === "string" || typeof index === "number" || typeof index === "boolean") {
        rowIndices.push(this.index.indexOf(index))
      } else if (Array.isArray(index)) {
        for (const indx of index) {
          if (this.index.indexOf(indx) === -1) {
            throw Error(`ParamError: specified index "${indx}" not found in indices`);
          }
          rowIndices.push(this.index.indexOf(indx));
        }
      } else {
        throw Error('ParamError: index must be an array of indices or a scalar index');
      }

      const newRowData: ArrayType2D = []
      const newIndex = []

      for (let i = 0; i < this.values.length; i++) {
        const innerArr = this.values[i] as ArrayType1D
        if (!(rowIndices.includes(i))) {
          newRowData.push(innerArr)
        }
      }

      for (let i = 0; i < this.index.length; i++) {
        const indx = this.index[i]
        if (!(index.includes(indx))) {
          newIndex.push(indx)
        }
      }

      if (inplace) {
        this.$setValues(newRowData, false)
        this.$setIndex(newIndex)
      } else {
        const df = new DataFrame(newRowData,
          {
            index: newIndex,
            columns: [...this.columns],
            dtypes: [...this.dtypes],
          });
        return df;
      }
    }

  }

  /**
   * Sets the index of the DataFrame to the specified value.
   * @param options.index An array of index values to set
   * @param options.column A column name whose values set in place of the index
   * @param options.drop Whether to drop the column whose index was set. Defaults to false
   * @param options.inplace Boolean indicating whether to perform the operation inplace or not. Defaults to false
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * const df2 = df.setIndex({ index: ['a', 'b'] })
   * df2.print()
   * ```
   *
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * df.setIndex({ column: "A", inplace: true })
   * df.print()
   * ```
   */
  setIndex(
    options:
      {
        index?: Array<number | string | (number | string)>,
        column?: string,
        drop?: boolean,
        inplace?: boolean
      }
  ): DataFrame
  setIndex(
    options:
      {
        index?: Array<number | string | (number | string)>,
        column?: string,
        drop?: boolean,
        inplace?: boolean
      }
  ): DataFrame | void {
    const { index, column, drop, inplace } = { drop: false, inplace: false, ...options }

    if (!index && !column) {
      throw new Error("ParamError: must specify either index or column")
    }

    let newIndex: Array<string | number> = [];

    if (index) {
      if (!Array.isArray(index)) {
        throw Error(`ParamError: index must be an array`);
      }

      if (index.length !== this.values.length) {
        throw Error(`ParamError: index must be the same length as the number of rows`);
      }
      newIndex = index;
    }

    if (column) {
      if (this.columns.indexOf(column) === -1) {
        throw Error(`ParamError: column not found in column names`);
      }

      newIndex = this.$getColumnData(column, false) as Array<string | number>
    }

    if (drop) {
      const dfDropped = this.drop({ columns: [column as string] })

      const newData = dfDropped?.values as ArrayType2D
      const newColumns = dfDropped?.columns
      const newDtypes = dfDropped?.dtypes

      if (inplace) {
        this.$setValues(newData, true, false)
        this.$setIndex(newIndex)
        this.$setColumnNames(newColumns)
      } else {
        const df = new DataFrame(newData,
          {
            index: newIndex,
            columns: newColumns,
            dtypes: newDtypes,
          });
        return df;
      }
    } else {
      if (inplace) {
        this.$setIndex(newIndex)
      } else {
        const df = new DataFrame(this.values,
          {
            index: newIndex,
            columns: [...this.columns],
            dtypes: [...this.dtypes],
          });
        return df;
      }
    }

  }

  /**
   * Sorts the Dataframe by the index.
   * @param options.inplace Boolean indicating whether to perform the operation inplace or not. Defaults to false
   * @param options.ascending Whether to sort values in ascending order or not. Defaults to true
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4], [1, 2], [5, 6]], { columns: ['A', 'B'] })
   * const df2 = df.sortIndex()
   * df2.print()
   * ```
   *
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4], [1, 2], [5, 6]], { columns: ['A', 'B'] })
   * df.sortIndex({ inplace: true })
   * df.print()
   * ```
   *
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4], [1, 2], [5, 6]], { columns: ['A', 'B'] })
   * df.sortIndex({ ascending: false, inplace: true })
   * df.print()
   * ```
   */
  sortIndex(options?:
              {
                inplace?: boolean
                ascending?: boolean
              }
  ): DataFrame
  sortIndex(options?:
              {
                inplace?: boolean
                ascending?: boolean
              }
  ): DataFrame | void {
    const { ascending, inplace } = { ascending: true, inplace: false, ...options }

    const indexPosition = NDframe.utils.range(0, this.index.length - 1)
    const index = [...this.index]

    const objToSort = index.map((idx, i) => {
      return { index: indexPosition[i], value: idx }
    })

    const sortedObjectArr = NDframe.utils.sortObj(objToSort, ascending)
    let sortedIndex = sortedObjectArr.map((obj) => obj.index);
    const newData = sortedIndex.map(i => (this.values as ArrayType2D)[i as number])
    sortedIndex = sortedIndex.map((i) => index[i as number]);

    if (inplace) {
      this.$setValues(newData)
      this.$setIndex(sortedIndex)
    } else {
      return new DataFrame(newData, {
        index: sortedIndex,
        columns: [...this.columns],
        dtypes: [...this.dtypes]
      })
    }

  }

  /**
   * Apply a function along an axis of the DataFrame. To apply a function element-wise, use `applyMap`.
   * Objects passed to the function are Series values whose
   * index is either the DataFrame’s index (axis=0) or the DataFrame’s columns (axis=1)
   * @param callable Function to apply to each column or row.
   * @param options.axis 0 or 1. If 0, apply "callable" column-wise, else apply row-wise
   *
   * @example
   * ```
   * const df = new DataFrame([[1, 2], [3, 4]], { columns: ['A', 'B']})
   * const df2 = df.apply(Math.sqrt, { axis: 0 })
   * df2.print()
   * ```
   */
  apply(callable: any, options?: { axis?: 0 | 1 }): DataFrame | Series {
    const { axis } = { axis: 1, ...options }

    if ([0, 1].indexOf(axis) === -1) {
      throw Error(`ParamError: axis must be 0 or 1`);
    }

    const valuesForFunc = this.$getDataByAxisWithMissingValuesRemoved(axis)

    const result = valuesForFunc.map(row => {
      return callable(row)
    })

    if (axis === 0) {
      if (NDframe.utils.is1DArray(result)) {
        return new Series(result, {
          index: [...this.columns]
        })
      } else {
        return new DataFrame(result, {
          index: [...this.columns],
          columns: [...this.columns],
          dtypes: [...this.dtypes]
        })
      }
    } else {
      if (NDframe.utils.is1DArray(result)) {
        return new Series(result, {
          index: [...this.index]
        })
      } else {
        return new DataFrame(result, {
          index: [...this.index],
          columns: [...this.columns],
          dtypes: [...this.dtypes]
        })
      }
    }
  }
}
