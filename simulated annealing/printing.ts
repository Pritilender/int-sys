import fs = require('fs')
import path = require('path')
import {TimeTableElement, ScheduleOptions} from './interfaces'

/**
 * Generate HTML string for a single cell representing one term.
 * @param  {TimeTableElement[]} cell Term.
 * @return {string} HTML string.
 */
function printCell(cell: TimeTableElement[]): string {
  return '<td><pre>' +
  cell.map((item, indexItem) =>
    item && `${item.subject} (${item.professor} @${indexItem + 1})`).filter(x => !!x).join('\n')
  + '</pre></td>'
}

/**
 * Generate HTML string for a single day.
 * @param  {TimeTableElement[][]} termDayState Day.
 * @return {string} HTML string.
 */
function printRow(termDayState: TimeTableElement[][]): string {
  return '<tr>' + termDayState.map(printCell).join('\n') + '</tr>'
}

/**
 * Generate HTML string for a single schedule.
 * @param  {TimeTableElement[][][]} state Schedule.
 * @return {string} HTML string.
 */
export function getHtmlString(state: TimeTableElement[][][]): string {
  const transpose = (m: any[][]) => m[0].map((x, i) => m.map(k => k[i]))
  return `
<table>
  <thead>
    <tr>
      ${state.map((day, dayIndex) => `<th>${dayIndex + 1}</th>`).join('')}
    </tr>
  </thead>
  <tbody>
    ${transpose(state).map(printRow).join('')}
  </tbody>
</table>
  `
}

/**
 * Write strings of initial and final schedule to HTML file.
 * @param {string} initial Initial schedule.
 * @param {string} final   Final (optimal) schedule.
 */
export function toHtml(initial: string, final: string): void {
  const html = `
<!DOCTYPE html>
<html>
  <head>
  <style>
    td { border: 1px solid black; vertical-align: top; padding: 1em; }
  </style>
  </head>
  <body>
    <h1>Initial schedule</h1>
    ${initial}
    <h1>Final schedule</h1>
    ${final}
  </body>
</html>
  `

  fs.writeFile(path.join(__dirname, 'out.html'), html, (err: any) => {
    if (err) {
      return console.log(err)
    }

    console.log('The file was saved!')
  })
}

/**
 * Pretty print the schedule to console.
 * @param {TimeTableElement[][][]} state Schedule.
 */
export function prettyPrint(state: TimeTableElement[][][]): void {
  console.log('---------')

  state.forEach((day, i) => {
  console.log(`Day ${i}`)
  day.forEach((term, j) => {
      console.log(`  Term ${j}`)
      term.forEach((room, k) => {
        if (room != undefined) {
          console.log(`   * ${room.professor} @ room #${k} - class ${room.subject}`)
        }
      })
    })
  })
}
