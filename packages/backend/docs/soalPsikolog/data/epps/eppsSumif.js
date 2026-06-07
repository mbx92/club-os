// SUMIF-like helpers for EPPS tallies (JavaScript + JSDoc)

/** @typedef {string|number|null|undefined} Answer */

/** @param {Answer} v */
const normalize = (v) => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') {
    if (v === 1 || v === 2) return v
    return null
  }
  const s = String(v).trim().toUpperCase()
  if (s === 'A' || s === '1') return 1
  if (s === 'B' || s === '2') return 2
  return null
}

/** @param {Answer[]} range @param {'A'|'B'|1|2|'1'|'2'} target */
export const countMatches = (range, target) => {
  const tv = normalize(target)
  return range.reduce((cnt, x) => (normalize(x) === tv ? cnt + 1 : cnt), 0)
}

/** SUMIF(range,target) - SUMIF(excludeCell,target) */
/** @param {Answer[]} range @param {'A'|'B'|1|2|'1'|'2'} target @param {Answer} excludeCell */
export const sumifMinusExclude = (range, target, excludeCell) => {
  const total = countMatches(range, target)
  const minus = normalize(excludeCell) === normalize(target) ? 1 : 0
  return total - minus
}

/** @param {Answer[]} row @param {number} excludeIndex */
export const computeRowATally = (row, excludeIndex) => {
  const exclude = row?.[excludeIndex]
  return sumifMinusExclude(row, 'A', exclude)
}

/** @param {Answer[][]} grid @param {number} colIndex */
export const extractColumn = (grid, colIndex) => grid.map((row) => row?.[colIndex])

/** @param {Answer[][]} grid @param {number} colIndex @param {number} excludeRowIndex */
export const computeColumnBTally = (grid, colIndex, excludeRowIndex) => {
  const col = extractColumn(grid, colIndex)
  const exclude = col?.[excludeRowIndex]
  return sumifMinusExclude(col, 'B', exclude)
}

/** @param {number} bj */
export const computeBD = (bj) => bj / 2
/** @param {number} bb @param {number} bd */
export const computeBH = (bb, bd) => bb + bd

/** @typedef {{ excludeColIndexByRow: number[] }} GridTalliesOptions */
/** @typedef {{ bbPerRow:number[], bjPerRow:number[], bdPerRow:number[], bhPerRow:number[] }} GridTalliesResult */

/** @param {Answer[][]} grid @param {GridTalliesOptions} opt @returns {GridTalliesResult} */
export const computeGridTallies = (grid, opt) => {
  const rows = grid.length
  const bbPerRow = Array(rows).fill(0)
  const bjPerRow = Array(rows).fill(0)
  const bdPerRow = Array(rows).fill(0)
  const bhPerRow = Array(rows).fill(0)

  for (let r = 0; r < rows; r++) {
    const row = grid[r] || []
    const excludeCol = opt.excludeColIndexByRow?.[r] ?? 0
    bbPerRow[r] = computeRowATally(row, excludeCol)
    bjPerRow[r] = computeColumnBTally(grid, excludeCol, r)
    bdPerRow[r] = computeBD(bjPerRow[r])
    bhPerRow[r] = computeBH(bbPerRow[r], bdPerRow[r])
  }

  return { bbPerRow, bjPerRow, bdPerRow, bhPerRow }
}

