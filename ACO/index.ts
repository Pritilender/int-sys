interface City {
  x: number,
  y: number,
}

interface ConnectionInfo {
  pheromone: number,
  distance: number,
}

function initMatrix(cities: City[], initPheromone: number): ConnectionInfo[][] {
  const matrix: ConnectionInfo[][] = []

  for (let i = 0; i < cities.length; i++) {
    matrix.push([])
    for (let j = 0; j < cities.length; j++) {
      const distance: number = Math.sqrt(Math.pow(cities[i].x - cities[j].x, 2)
        + Math.pow(cities[i].y - cities[j].y, 2))
      matrix[i].push({
        pheromone: initPheromone,
        distance,
      })
    }
  }

  return matrix
}

function randomSolution(length: number): number[] {
  return _.shuffle(Array.apply(null, {length}).map(Function.call, Number))
}

function initCities(count: number, xMax: number, yMax: number): City[] {
  const cities: City[] = []
  for (let i = 0; i < count; i++) {
    const x = (Math.random() * 100000) % xMax
    const y = (Math.random() * 100000) % yMax
    cities.push({x, y})
  }
  return cities
}

function solutionDistance(cityMatrix: ConnectionInfo[][], solution: number[]): number {
  let distance = 0
  for (let i = 0; i < solution.length - 1; i++) {
    const current = solution[i]
    const next = solution[i + 1]
    distance += cityMatrix[current][next].distance
  }
  return distance
}

function possibleCandidates(solution: number[], citySize: number): number[] {
  let candidates: number[] = []
  for (let k = 0; k < citySize; k++) {
    if (solution.indexOf(k) == -1) {
      candidates.push(k)
    }
  }
  return candidates
}

function rouletteSelect(probabilities: number[]): number {
  let rand = Math.random()
  let current = 0
  while (rand > 0) {
    rand -= probabilities[current]
    current++
  }
  return current - 1
}

function newSolution(cityMatrix: ConnectionInfo[][], citySize: number, beta: number): number[] {
  const alpha: number = 1
  const solution: number[] = []
  let current = Math.floor((Math.random() * 1000) % citySize)
  solution.push(current)

  for (let i = 1; i < citySize; i++) {
    const notVisited: number[] = possibleCandidates(solution, citySize)
    const probabilityMul = (node: ConnectionInfo) => Math.pow(node.pheromone, alpha) * Math.pow(1 / node.distance, beta)
    const totalProbability: number = notVisited.reduce((acc, curr) => acc + probabilityMul(cityMatrix[current][curr]), 0)
    const notVisitedProbability: number[] = notVisited.map(x => probabilityMul(cityMatrix[current][x]) / totalProbability)
    const next = rouletteSelect(notVisitedProbability)
    current = notVisited[next]
    solution.push(current)
  }

  return solution
}

function decayPheromones(cityMatrix: ConnectionInfo[][], factor: number): ConnectionInfo[][] {
  return cityMatrix.map(row => row.map(info => ({
    distance: info.distance,
    pheromone: (1 - factor) * info.pheromone,
  })))
}

function singleSolutionDelta(i: number, j: number, solutionInfo: {solution: number[], distance: number}): number {
  let delta = 0
  const iIndex = solutionInfo.solution.indexOf(i)
  const jIndex = solutionInfo.solution.indexOf(j)

  if (iIndex > -1 && jIndex > -1 && iIndex + 1 == jIndex) {
    delta = 1.0 / solutionInfo.distance
  }

  return delta
}

function updatePheromones(cityMatrix: ConnectionInfo[][], solutions: { solution: number[], distance: number}[]): ConnectionInfo[][] {
  return cityMatrix.map((row, i) => row.map((info, j) => {

    let newPheromone: number = info.pheromone
    solutions.forEach(solution => newPheromone += singleSolutionDelta(i, j, solution))
    return {
      distance: info.distance,
      pheromone: newPheromone,
    }
  }))
}

// PRINTERS
function printDistanceMatrix(matrix: ConnectionInfo[][]): void {
  matrix.forEach(row =>
    console.log(row.map(col =>
      col.distance.toFixed(4)).join(', ')))
}

function printPheromoneMatrix(matrix: ConnectionInfo[][]): void {
  matrix.forEach(row =>
    console.log(row.map(col =>
      col.pheromone.toFixed(4)).join(', ')))
}

function printSolution(solution: number[]): void {
  console.log(solution.join(' -> '))
}

const citySize = 100
const colonySize = 10
const cities = initCities(citySize, window.innerWidth - 10, window.innerHeight - 10)
const initPheromone = 1 / citySize
let cityMatrix = initMatrix(cities, initPheromone)
let bestSolution = randomSolution(citySize)
let bestDistance = solutionDistance(cityMatrix, bestSolution)

// DRAW
const canvas = document.getElementById('myCanvas') as HTMLCanvasElement
canvas.width = window.innerWidth
canvas.height = window.innerHeight

const ctx = canvas.getContext('2d')

if (ctx != null) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = '18px Lucida Console'
  cities.forEach((city, i) => {
    ctx.fillRect(city.x, city.y, 5, 5)
    ctx.fillText(i.toString(), city.x + 5, city.y)
  })
}

// print matrix
printDistanceMatrix(cityMatrix)
printPheromoneMatrix(cityMatrix)
printSolution(bestSolution)
console.log('bestSolution bestDistance', bestDistance.toFixed(4))

// ALGO
for (let i = 0; i < 100; i++) {
  const candidates: { solution: number[], distance: number }[] = []
  for (let j = 0; j < citySize; j++) {
    const antSolution = newSolution(cityMatrix, citySize, 2)
    const antDistance = solutionDistance(cityMatrix, antSolution)
    if (antDistance <= bestDistance) {
      bestSolution = antSolution
      bestDistance = antDistance
    }
    candidates.push({
      solution: antSolution,
      distance: antDistance,
    })
  }
  printSolution(bestSolution)
  console.log('Best distance', bestDistance)
  cityMatrix = decayPheromones(cityMatrix, 0.5)
  cityMatrix = updatePheromones(cityMatrix, candidates)
  // printPheromoneMatrix(cityMatrix)
}
