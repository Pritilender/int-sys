import uniqBy = require('lodash.uniqby')
import fs = require('fs')
import path = require('path')

interface ProblemDefinition {
  noProfessors: number,
  noRooms: number
}

interface TimeTableElement {
  professor: string,
  subject: string,
}

interface ScheduleOptions {
  noRooms: number,
  noTerms: number,
}

const totalRooms = 5
const totalProfessors = 10
const maxPotentialClasses = 4

/**
 * Initialize all elements for a university.
 * @param  {number} noProfessors Total amount of professors working at the uni.
 * @param  {number} noRooms Number of available rooms.
 * @param  {number} maxClass Maximum number of classes a professor can teach.
 * @return {TimeTableElement[]}              Professor-Subject mapping. Multiple same elements can occur.
 */
function initializeUniversity(noProfessors: number, noRooms: number, maxClass: number): TimeTableElement[] {
  const result: TimeTableElement[] = []

  const rooms: string[] = []
  for (let i = 0; i < noRooms; i++) {
    rooms.push(`Room ${i}`)
  }

  for (let i = 0; i < noProfessors; i++) {
    const professor = `Dr. prof. ${i}`
    const noClasses = (Math.floor(Math.random() * 10) % maxClass) + 1 // no more than `maxClass` unique classes

    for (let j = 0; j < noClasses; j++) {
      // every class can occure twice
      result.push({
        professor,
        subject: `${j}0${i}`,
      })
      result.push({
        professor,
        subject: `${j}0${i}`,
      })
      if (Math.random() >= 0.5) {
        // some can occure even trice
        result.push({
          professor,
          subject: `${j}0${i}`,
        })
      }
    }
  }

  return result
}

/**
 * Return a 3D matrix of time table elements representing an initial state schedule.
 *
 * First dimension is day-indexed.
 * Second dimension is term-indexed.
 * Third dimension is room-indexed.
 * @param  {TimeTableElement[]} university Professor-Subject mapping.
 * @param  {ScheduleOptions} opts Parameters of a problem.
 * @return {TimeTableElement[]} 3D matrix representing a schedule.
 */
function initializeState(university: TimeTableElement[], opts: ScheduleOptions): TimeTableElement[][][] {
  const noDays = 5
  const timeTable: TimeTableElement[][][] = []

  for (let i = 0; i < noDays; i++) {
    timeTable.push([])
    for (let j = 0; j < opts.noTerms; j++) {
      timeTable[i].push([])
    }
  }

  while (university.length > 0) {
    const ind = Math.floor(Math.random() * 10) % university.length
    const newEntry = university[ind]
    university.splice(ind, 1)

    let day: number
    let term: number
    let roomNumber: number
    do {
      day = Math.floor(Math.random() * 10) % noDays
      term = Math.floor(Math.random() * 10) % opts.noTerms
      roomNumber = Math.floor(Math.random() * 10) % opts.noRooms
    } while (timeTable[day][term][roomNumber] != null)

    timeTable[day][term][roomNumber] = newEntry
  }

  return timeTable
}

/**
 * Generate neighboring state.
 * @param  {TimeTableElement[][][]} state State for which random neighbor is generated.
 * @param  {ScheduleOptions} opts Problem's options.
 * @return {TimeTableElement[][][]} Random neighboring state.
 */
function neighbor(state: TimeTableElement[][][], opts: ScheduleOptions): TimeTableElement[][][] {
  const noDays = 5
  const noTerms = opts.noTerms
  const noRooms = opts.noRooms

  let day1
  let day2
  let term1
  let term2
  let room1
  let room2

  do {
    day1 = Math.floor(Math.random() * 10) % noDays
    day2 = Math.floor(Math.random() * 10) % noDays

    term1 = Math.floor(Math.random() * 10) % noTerms
    term2 = Math.floor(Math.random() * 10) % noTerms

    room1 = Math.floor(Math.random() * 10) % noRooms
    room2 = Math.floor(Math.random() * 10) % noRooms
  } while (state[day1][term1][room1] == undefined && state[day2][term2][room2] == undefined)

  const newTimeTable: TimeTableElement[][][] = []
  for (let i = 0; i < noDays; i++) {
    newTimeTable.push([])
    for (let j = 0; j < noTerms; j++) {
      newTimeTable[i].push(new Array(noRooms))
      for (let k = 0; k < noRooms; k++) {
        newTimeTable[i][j][k] = state[i][j][k]
      }
    }
  }
  newTimeTable[day2][term2][room2] = state[day1][term1][room1]
  newTimeTable[day1][term1][room1] = state[day2][term2][room2]

  return newTimeTable
}

/**
 * Calculate total cost of a given state.
 * @param {TimeTableElement[][][]} state State representing a schedule.
 * @returns {number} Total cost of a state.
 */
function stateCost(state: TimeTableElement[][][]): number {
  const professorCost = perTermConflict(state, 'professor')
  const subjectCost = perTermConflict(state, 'subject')
  const maxSubjectsCost = professorFrequencyCost(state)
  const subjectAtOnceCost = sameDaySubjectCost(state)

  return professorCost + subjectCost + maxSubjectsCost + subjectAtOnceCost
}

/**
 * Calculate the cost of conflicts on a specific item.
 * This is usually done on a hard constraint, so the initial weight is pretty big.
 * @param  {TimeTableElement[][][]} state Current schedule state for which the cost is being calculated.
 * @param  {number = 10} weight Multiplier for the calculated cost.
 * @return {number} The cost of this state.
 */
function perTermConflict(state: TimeTableElement[][][],
                         conflictingItem: keyof TimeTableElement,
                         weight: number = 10): number {
  let cost = 0

  state.forEach(day => {
    day.forEach(term => {
      const filtered = term.filter(t => t != undefined)
      const uniqArr = uniqBy(filtered, conflictingItem)
      cost += filtered.length - uniqArr.length
    })
  })

  return weight * cost
}

/**
 * For each professor, find total number of his occurance per day and return the cost based on that.
 * @param  {TimeTableElement[][][]} state Current schedule state.
 * @param  {number = 1} weight Multiplier for the calculated cost.
 * @return {number} The cost of this state.
 */
function professorFrequencyCost(state: TimeTableElement[][][], weight: number = 1): number {
  let cost = 0
  state.forEach(day => {
    const perProfessorCost: any = {}

    day.forEach(term => {
      term.forEach(t => {
        if (t != undefined) {
          if (perProfessorCost[t.professor] == undefined) {
            perProfessorCost[t.professor] = 1
          } else {
            perProfessorCost[t.professor]++
          }
        }
      })
    })

    for (const professorCost in perProfessorCost) {
      if (perProfessorCost[professorCost] > 4) {
        cost++
      }
    }
  })
  return weight * cost
}

/**
 * Find the days when the subject is thought and caluclate the cost based on that info.
 * @param  {TimeTableElement[][][]} state Current schedule state.
 * @param  {number = 1} weight Multiplier for the calculated cost.
 * @return {number} The cost of this state.
 */
function sameDaySubjectCost(state: TimeTableElement[][][], weight: number = 1): number {
  let cost = 0
  const perDayCost: any = {}

  state.forEach((day, i) => {
    day.forEach(term => {
      term.forEach(t => {
        if (t != undefined) {
          if (perDayCost[t.subject] == undefined) {
            perDayCost[t.subject] = [i]
          } else if (perDayCost[t.subject].indexOf(i) == -1) {
            perDayCost[t.subject].push(i)
          }
        }
      })
    })
  })

  for (const c in perDayCost) {
    if (perDayCost[c].length > 1) {
      cost++
    }
  }

  return cost
}

function printCell(cell: TimeTableElement[]): string {
  return '<td><pre>' + cell.map((item, indexItem) => item && `${item.subject} (${item.professor} @${indexItem + 1})`).filter(x => !!x).join('\n') + '</pre></td>'
}

function printRow(termDayState: TimeTableElement[][]): string {
  return '<tr>' + termDayState.map(printCell).join('\n') + '</tr>'
}

/**
 * Pretty print the given state.
 * @param {TimeTableElement[][][]} state State to pretty print.
 */
function printState(state: TimeTableElement[][][]): void {
  const transpose = (m: any[][]) => m[0].map((x, i) => m.map(x => x[i]))


  let html = `
  <!DOCTYPE html>
  <html>
  <head>
  <style>
  td { border: 1px solid black; vertical-align: top; padding: 1em; }
</style>
</head>
<body>
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
</body>  
  </html>
  `


  fs.writeFile(path.join(__dirname, 'out.html'), html, function(err) {
    if(err) {
      return console.log(err);
    }

    console.log("The file was saved!");
  });

  // console.log('---')
  //
  // let mat: any[][] = []
  // let maxHeight = 0
  // let maxWidth = 0
  //
  // for (let i = 0; i < 5; i++) {
  //   mat.push([])
  //   for (let j = 0; j < 6; j++) {
  //     mat.push(state[i][j])
  //   }
  // }
  //
  // for (let i = 0; i < 6; i++) {
  //   for (let j = 0; j < 5; j++) {
  //   }
  // }
  //
  // state.forEach((day, i) => {
  // console.log(`Day ${i}`)
  // day.forEach((term, j) => {
  //     console.log(`  Term ${j}`)
  //     term.forEach((room, k) => {
  //       if (room != undefined) {
  //         console.log(`   * ${room.professor} @ room #${k} - class ${room.subject}`)
  //       }
  //     })
  //   })
  // })

  console.log(html)

  console.log('The cost of whole state is:', stateCost(state))
}


function simulatedAnnealing(initialState: TimeTableElement[][][]) {
  const alpha = 0.9
  const tMin = 1e-3
  let oldCost = stateCost(initialState)
  let t = 1.0
  while (t > tMin) {
    let i = 1
    while (i <= 500) {
      const newSolution = neighbor(initialState, {noRooms: totalRooms, noTerms: 6})
      const newCost = stateCost(newSolution)
      const delta = newCost - oldCost

      if (delta < 0 || Math.exp(-delta / t) > Math.random()) {
        initialState = newSolution
        oldCost = newCost
      }
      i++
    }
    t *= alpha
  }
  return initialState
}

const uni = initializeUniversity(totalProfessors, totalRooms, maxPotentialClasses)
uni.forEach(element => console.log(`${element.professor} is teaching ${element.subject}`))

const initState = initializeState(uni, {noRooms: totalRooms, noTerms: 6})
console.log('init')
// printState(initState)
const finalState = simulatedAnnealing(initState)
printState(finalState)


