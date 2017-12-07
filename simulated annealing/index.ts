import {simulatedAnnealing, initializeUniversity} from './simulated-annealing'

const totalRooms = 5
const totalProfessors = 10
const maxPotentialClasses = 4
const alpha = 0.999

const uni = initializeUniversity({noRooms: 5, noProfessors: 10, noMaxClassess: 4})
const finalState = simulatedAnnealing(uni, {noRooms: 5, noProfessors: 10, noMaxClassess: 4}, alpha)
