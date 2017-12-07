export interface ProblemDefinition {
  noProfessors: number,
  noRooms: number
  noMaxClassess: number,
}

export interface TimeTableElement {
  professor: string,
  subject: string,
}

export interface ScheduleOptions {
  noRooms: number,
  noTerms: number,
}
