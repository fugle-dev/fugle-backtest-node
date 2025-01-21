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

import { ArrayType1D, ArrayType2D } from './arrays';

/**
 * General Utility class
 */
export default class Utils {

  /**
   * Checks if array is 1D
   * @param arr The array
   */
  is1DArray(arr: ArrayType1D | ArrayType2D): boolean {
    if (
      typeof arr[0] == "number" ||
      typeof arr[0] == "string" ||
      typeof arr[0] == "boolean" ||
      arr[0] === null
    ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Checks if a value is a date object
   * @param value A date object
   * @returns boolean
   */
  isDate(value: any): boolean {
    return value instanceof Date;
  }

  /**
   * Check if value is a string.
   * @param value The value to check.
   * @returns
   */
  isString<T>(value: T): boolean {
    return typeof value === "string";
  }

  /**
   * Checks if value is a number.
   * @param value The value to check.
   * @returns
   */
  isNumber<T>(value: T): boolean {
    return typeof value === "number" && isFinite(value);
  }

  /**
   * Checks if value is an object.
   * @param value The value to check.
   * @returns
   */
  isObject(value: any): boolean {
    return value && typeof value === "object" && value.constructor && value.constructor.name === "Object";
  }

  /**
   * Checks if a value is empty. Empty means it's either null, undefined or NaN
   * @param value The value to check.
   * @returns
   */
  isEmpty<T>(value: T): boolean {
    return value === undefined || value === null || (isNaN(value as any) && typeof value !== "string");
  }

  /**
   * Retrieve row array and column names from an object of the form {a: [1,2,3,4], b: [30,20, 30, 20]}
   * @param obj The object to retrieve rows and column names from.
   */
  getRowAndColValues(obj: object): [ArrayType1D | ArrayType2D, string[]] {
    const colNames = Object.keys(obj);
    const colData = Object.values(obj);
    const firstColLen = colData[0].length;

    colData.forEach((cdata) => {
      if (cdata.length != firstColLen) {
        throw Error("Length Error: Length of columns must be the same!");
      }
    });

    const rowsArr = this.transposeArray(colData)
    return [rowsArr, colNames];
  }

  /**
   * Generates an array of integers between specified range
   * @param start The starting number.
   * @param end The ending number.
   */
  range(start: number, end: number): Array<number> {
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

  /**
   * Infer data type from an array or array of arrays
   * @param arr An array or array of arrays
   */
  inferDtype(arr: ArrayType1D | ArrayType2D) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    if (this.is1DArray(arr)) {
      return [this.$typeChecker(arr)];
    } else {
      const arrSlice = this.transposeArray(arr.slice(0, 500))
      const dtypes = arrSlice.map((innerArr) => {
        return self.$typeChecker(innerArr as any);
      });
      return dtypes;
    }
  }

  /**
   * Private type checker used by inferDtype function
   * @param arr The array
   */
  private $typeChecker(arr: ArrayType1D | ArrayType2D) {
    let dtypes: string;
    let lim: number;
    const intTracker: Array<boolean> = [];
    const floatTracker: Array<boolean> = [];
    const stringTracker: Array<boolean> = [];
    const boolTracker: Array<boolean> = [];
    const dateTracker: Array<boolean> = [];

    if (arr.length < 500) {
      lim = arr.length;
    } else {
      lim = 500;
    }

    const arrSlice = arr.slice(0, lim);

    for (let i = 0; i < lim; i++) {
      const ele = arrSlice[i];
      if (typeof ele == "boolean") {
        floatTracker.push(false);
        intTracker.push(false);
        stringTracker.push(false);
        boolTracker.push(true);
        dateTracker.push(false);
      } else if (this.isEmpty(ele)) {
        floatTracker.push(true);
        intTracker.push(false);
        stringTracker.push(false);
        boolTracker.push(false);
        dateTracker.push(false);
      } else if (this.isDate(ele)) {
        floatTracker.push(false);
        intTracker.push(false);
        stringTracker.push(false);
        boolTracker.push(false);
        dateTracker.push(true);
      } else if (!isNaN(Number(ele))) {
        if ((ele as unknown as string).toString().includes(".")) {
          floatTracker.push(true);
          intTracker.push(false);
          stringTracker.push(false);
          boolTracker.push(false);
          dateTracker.push(false);
        } else {
          floatTracker.push(false);
          intTracker.push(true);
          stringTracker.push(false);
          boolTracker.push(false);
          dateTracker.push(false);
        }
      }  else {
        floatTracker.push(false);
        intTracker.push(false);
        stringTracker.push(true);
        boolTracker.push(false);
        dateTracker.push(false);
      }
    }

    const even = (ele: number | string | boolean) => ele == true;

    if (stringTracker.some(even)) {
      dtypes = "string";
    } else if (floatTracker.some(even)) {
      dtypes = "float32";
    } else if (intTracker.some(even)) {
      dtypes = "int32";
    } else if (boolTracker.some(even)) {
      dtypes = "boolean";
    } else if (dateTracker.some(even)) {
      dtypes = "datetime";
    } else {
      dtypes = "undefined";
    }

    return dtypes;
  }


  /**
   * Transposes an array of array
   * @param obj The object to check.
   * @param key The key to find.
   */
  transposeArray(arr: ArrayType1D | ArrayType2D): ArrayType1D | ArrayType2D { //old name: __get_col_values
    if (arr.length === 0) return arr

    const rowLen: number = arr.length;
    if (Array.isArray(arr[0])) {
      const colLen: number = arr[0].length;
      const newArr = [];

      for (let i = 0; i <= colLen - 1; i++) {
        const temp = [];
        for (let j = 0; j < rowLen; j++) {
          const _elem = (arr as any)[j][i]
          temp.push(_elem);
        }
        newArr.push(temp);
      }
      return newArr;
    } else {
      return arr;
    }
  }

  /**
   * Remove NaN values from 1D array
   * @param arr
   */
  removeMissingValuesFromArray(arr: Array<number> | ArrayType1D) {
    const values = arr.filter((val) => {
      return !(this.isEmpty(val))
    })
    return values;
  }

  /**
   * Custom sort for an array of index and values
   * @param arr The array of objects to sort
   * @param ascending Whether to sort in ascending order or not
   */
  sortObj(
    arr: Array<{ index: number | string, value: number | string | boolean }>,
    ascending: boolean
  ) {
    const sortedValues = arr.sort((obj1, obj2) => {
      let a = obj2.value;
      let b = obj1.value;

      if (!ascending) {
        if (typeof a === "string" && typeof b === "string") {
          a = a.toUpperCase();
          b = b.toUpperCase();

          if (a < b) {
            return -1;
          }

          if (a > b) {
            return 1;
          }

          return 0;

        } else {
          return Number(a) - Number(b);
        }
      } else {
        if (typeof a === "string" && typeof b === "string") {
          a = a.toUpperCase();
          b = b.toUpperCase();

          if (a > b) {
            return -1;
          }

          if (a < b) {
            return 1;
          }

          return 0;
        } else {
          return Number(b) - Number(a);
        }
      }
    });

    return sortedValues;
  }

  /**
   * Converts a 2D array of array to 1D array for Series Class
   * @param arr The array to convert.
   */
  convert2DArrayToSeriesArray(arr: ArrayType2D): Array<string> {
    const newArr = arr.map((val) => {
      if (this.isObject(val)) {
        return JSON.stringify(val)
      } else {
        return `${val}`
      }
    });
    return newArr;
  }

  /**
   * Checks if two series are compatible for a mathematical operation
   * @param object
   *
   *   firstSeries ==>  First Series object
   *
   *   secondSeries ==> Second Series object to comapre with
   *
   *   operation ==> The mathematical operation
   *//*
  checkSeriesOpCompactibility({ firstSeries, secondSeries, operation }: {
    firstSeries: Series, secondSeries: Series, operation: string
  }): void {

    if (firstSeries.shape[0] != secondSeries.shape[0]) {
      const msg = `ParamError: Row length mismatch. Length of other (${secondSeries.shape[0]}), must be the same as Ndframe (${firstSeries.shape[0]})`
      throw new Error(msg)
    }
    if (firstSeries.dtypes[0] == 'string' || secondSeries.dtypes[0] == 'string') {
      const msg = `DtypeError: String data type does not support ${operation} operation`
      throw new Error(msg)
    }
  }*/

  /**
   * Returns a new series with properties of the old series
   *
   * @param series The series to copy
   *//*
  createNdframeFromNewDataWithOldProps({ ndFrame, newData, isSeries }: { ndFrame: Series, newData: any, isSeries: boolean }) {
    if (isSeries) {
      return new Series(
        newData,
        {
          index: [...ndFrame.index],
          columns: [...ndFrame.columns],
          dtypes: [...ndFrame.dtypes],
        })
    } else {
      return new DataFrame(newData,
        {
          index: [...ndFrame.index],
          columns: [...ndFrame.columns],
          dtypes: [...ndFrame.dtypes],
        })
    }
  }*/

  /**
   * Maps boolean values (false, true) to integer equivalent (0, 1)
   * @param arr The array of booleans
   * @param dim The dimension of the array
   */
  mapBooleansToIntegers(arr: Array<boolean | boolean[]>, dim: number): Array<number | number[]> {
    if (dim == 2) {
      const newArr: Array<number[]> = [];
      arr.map((innerArr) => {
        const temp: Array<number> = [];
        (innerArr as Array<boolean>).map((val) => temp.push(val ? 1 : 0));
        newArr.push(temp);
      });
      return newArr;
    } else {
      const newArr: Array<number> = [];
      arr.map((val) => newArr.push(val ? 1 : 0));
      return newArr;
    }
  }

  /**
   * Round elements of an array or array of arrays to specified dp
   * @param arr The Array to round
   * @param dp The number of dp to round to
   * @param isSeries Whether the array is of type Series or not
   */
  round(arr: Array<number | number[]>, dp = 1, isSeries: boolean): ArrayType1D | ArrayType2D {
    if (dp < 0) {
      dp = 1;
    }

    if (isSeries) {
      const newArr = [];
      for (let i = 0; i < arr.length; i++) {
        const ele = arr[i];
        if (typeof ele == "number" && !isNaN(ele) && ele !== undefined && ele !== null) {
          newArr.push(Number((ele).toFixed(dp)));
        } else {
          newArr.push(ele)
        }
      }
      return newArr as ArrayType1D
    } else {
      const resultArr = [];
      for (let i = 0; i < arr.length; i++) {
        const innerVal = arr[i];
        const newArr: Array<number> = [];
        if (Array.isArray(innerVal)) {
          for (let i = 0; i < innerVal.length; i++) {
            const ele = innerVal[i];
            if (typeof ele == "number" && !isNaN(ele) && ele !== undefined && ele !== null) {
              newArr.push(Number((ele).toFixed(dp)));
            } else {
              newArr.push(ele)
            }
          }
          resultArr.push(newArr);
        } else {
          if (typeof innerVal == "number" && !isNaN(innerVal) && innerVal !== undefined && innerVal !== null) {
            newArr.push(Number((innerVal).toFixed(dp)));
          } else {
            newArr.push(innerVal)
          }
        }

      }
      return resultArr;
    }
  }

  /**
   * Returns the index of a sorted array
   * @param arr1 The first array
   * @param arr2 The second array
   * @param dtype The data type of the arrays
   *
   * @returns sorted index
   */
  sortArrayByIndex(arr1: ArrayType1D | ArrayType2D, arr2: ArrayType1D | ArrayType2D, dtype: string) {
    const sortedIdx = arr1.map((item, index) => {
      return [arr2[index], item];
    });
    if (dtype == "string") {
      sortedIdx.sort();
    } else {
      sortedIdx.sort(([arg1], [arg2]) => (arg2 as unknown as number) - (arg1 as unknown as number));
    }

    return sortedIdx.map(([, item]) => item) as number[]
  }

  /**
   * Checks if a func is a function
   * @param func
   */
  isFunction(func: object): boolean {
    return typeof func == "function";
  }
}
