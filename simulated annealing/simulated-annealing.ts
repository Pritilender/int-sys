import uniqBy = require('lodash.uniqby')
import {TimeTableElement, ScheduleOptions, ProblemDefinition} from './interfaces'
import {toHtml, getHtmlString} from './printing'

/**
 * Initialize all elements for a university.
 * @param  {ProblemDefinition}  opts Initialization options.
 * @return {TimeTableElement[]} Professor-Subject mapping. Multiple same elements can occur.
 */
export function initializeUniversity(opts: ProblemDefinition): TimeTableElement[] {
  const result: TimeTableElement[] = []

  const rooms: string[] = []
  for (let i = 0; i < opts.noRooms; i++) {
    rooms.push(`Room ${i}`)
  }

  for (let i = 0; i < opts.noProfessors; i++) {
    const professor = `Dr. prof. ${i}`
    // no more than `maxClass` unique classes
    const noClasses = (Math.floor(Math.random() * 10) % opts.noMaxClassess) + 1

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

  // print what Professor-Subject map
  uniqBy(result, (item) => `${item.professor} ${item.subject}`)
  .forEach(element => console.log(`${element.professor} is teaching ${element.subject}`))

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
 * Generate neighboring state by picking two random terms and rooms.
 * One element mustn't be empty, but the other one can.
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

/**
 * Calculate the cost of conflicts on a specific item.
 * This is usually done on a hard constraint, so the initial weight is pretty big.
 * @param  {TimeTableElement[][][]} state Current schedule state for which the cost is being calculated.
 * @param  {keyof TimeTableElement} conflictingItem Field to look-by for conflicts.
 * @param  number = 10} weight Multiplier for the calculated cost.
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

/**
 * Find schedule for a university using simulated annealing algorithm.
 * @param {TimeTableElement[]} university  Professor-Subject map.
 * @param {ProblemDefinition}  problemInfo Describes some of the constraint of the problem.
 * @param {number} alpha Temperature lowering factor. Should be as small as possible for a better solution.
 */
export function simulatedAnnealing(university: TimeTableElement[], problemInfo: ProblemDefinition, alpha: number) {
  const tMin = 1e-3
  let oldState = initializeState(university, {noRooms: problemInfo.noRooms, noTerms: 6})
  const htmlStringInit = getHtmlString(oldState)

  let oldCost = stateCost(oldState)
  console.log('initial cost', oldCost)

  let t = 1.0
  while (t > tMin) {
    const newSolution = neighbor(oldState, {noRooms: 5, noTerms: 6})
    const newCost = stateCost(newSolution)
    const delta = newCost - oldCost

    if (delta < 0 || Math.exp(-delta / t) > Math.random()) {
      oldState = newSolution
      oldCost = newCost
    }
    t *= alpha
  }
  const htmlStringFinal = getHtmlString(oldState)
  toHtml(htmlStringInit, htmlStringFinal)

  console.log('final cost', oldCost)

  return oldState
}
