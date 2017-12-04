interface TimeTableElement {
  professor: string,
  subject: string,
  // room: string,
}

const totalRooms = 4
const totalProfessors = 10
const maxPotentialClasses = 6

/*
 * Initialize all elements for a university.
 * An element consists of professor, the subject his teaching and the room where the subject is thought.
 * Each element will afterwards be inserted into randomly selected term of the timetable.
 */
function initializeUniversity(noProfessors: number, noRooms: number, maxClass: number): TimeTableElement[] {
  const result: TimeTableElement[] = []

  const rooms: string[] = []
  for (let i = 0; i < noRooms; i++) {
    rooms.push(`Room ${i}`)
  }

  for (let i = 0; i < noProfessors; i++) {
    const professor = `Dr. prof. ${i}`
    const noClasses = (Math.floor(Math.random() * 10) % maxClass) + 1 // no more than 5 classes

    for (let j = 0; j < noClasses; j++) {
      result.push({
        professor,
        subject: `${j}0${i}`,
        // room: rooms[j % noRooms],
      })
    }
  }

  return result
}

/*
 * For a univeristy, return 3D matrix of time table elements.
 * First dimension is day-indexed.
 * Second dimension is term-indexed.
 * Third dimension is room-indexed.
 */
function initializeState(university: TimeTableElement[], noRooms: number): TimeTableElement[][][] {
  const timeTable: TimeTableElement[][][] = []

  for (let i = 0; i < 5; i++) {
    timeTable.push([])
    for (let j = 0; j < 3; j++) {
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
      day = Math.floor(Math.random() * 10) % 5
      term = Math.floor(Math.random() * 10) % 3
      roomNumber = Math.floor(Math.random() * 10) % noRooms
    } while (timeTable[day][term][roomNumber] != null)

    timeTable[day][term][roomNumber] = newEntry
  }

  return timeTable
}

const uni = initializeUniversity(totalProfessors, totalRooms, maxPotentialClasses)
console.log(uni.length)
uni.forEach(element => console.log(`${element.professor} is teaching ${element.subject}`))

const initState = initializeState(uni, totalRooms)
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
