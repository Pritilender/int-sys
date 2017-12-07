import uniqBy = require('lodash.uniqby')

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
 * @param  {number} noProfessors Total amount of proffesors working at the uni.
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
 * @return {TimeTableElement[]} 3D matrix repsreneting a schedule.
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

  const day1 = Math.floor(Math.random() * 10) % noDays
  const day2 = Math.floor(Math.random() * 10) % noDays

  const term1 = Math.floor(Math.random() * 10) % noTerms
  const term2 = Math.floor(Math.random() * 10) % noTerms

  const room1 = Math.floor(Math.random() * 10) % noRooms
  const room2 = Math.floor(Math.random() * 10) % noRooms

  console.log('days', day1, day2)
  console.log('terms', term1, term2)
  console.log('rooms', room1, room2)
  console.log('to', state[day1][term1][room1])
  console.log('to', state[day2][term2][room2])

  const newTimeTable: TimeTableElement[][][] = []

  for (let i = 0; i < noDays; i++) {
    newTimeTable.push([])
    for (let j = 0; j < noTerms; j++) {
      newTimeTable[i].push(new Array(noRooms))
      for (let k = 0; k < noRooms; k++) {
        if (state[i][j][k] != undefined) { // copy if element is not undefined
          newTimeTable[i][j][k] = state[i][j][k]
        }
      }
    }
  }

  if (state[day1][term1][room1] != undefined) {
    newTimeTable[day2][term2][room2] = state[day1][term1][room1]
  }
  if (state[day2][term2][room2] != undefined) {
    newTimeTable[day1][term1][room1] = state[day2][term2][room2]
  }

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

const uni = initializeUniversity(totalProfessors, totalRooms, maxPotentialClasses)
uni.forEach(element => console.log(`${element.professor} is teaching ${element.subject}`))

const initState = initializeState(uni, { noRooms: totalRooms, noTerms: 6 })
console.log('---')
initState.forEach((day, i) => {
  console.log(`Day ${i}`)
  day.forEach((term, j) => {
    console.log(`  Term ${j}`)
    term.forEach((room, k) => {
      console.log(`   * ${room.professor} @ room #${k} - class ${room.subject}`)
    })
  })
})

console.log('The cost of whole state is:', stateCost(initState))

const nextState = neighbor(initState, { noRooms: totalRooms, noTerms: 6 })

console.log('---')
nextState.forEach((day, i) => {
  console.log(`Day ${i}`)
  day.forEach((term, j) => {
    console.log(`  Term ${j}`)
    term.forEach((room, k) => {
      console.log(`   * ${room.professor} @ room #${k} - class ${room.subject}`)
    })
  })
})

console.log('The cost of whole state is:', stateCost(nextState))
