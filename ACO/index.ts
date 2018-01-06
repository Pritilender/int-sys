interface City {
  x: number,
  y: number,
}

interface ConnectionInfo {
  pheromone: number,
  distance: number,
}

function shuffledArray(length: number): number[] {
  return _.shuffle(Array.apply(null, {length}).map(Function.call, Number))
}

class Painter {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private world: World

  constructor(world: World, width: number = window.innerWidth, height: number = window.innerHeight) {
    this.canvas = document.getElementById('myCanvas') as HTMLCanvasElement
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')
    this.world = world
  }

  public drawCities() {
    if (this.ctx != null) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.font = '18px Lucida Console'
      this.world.cities.forEach((city, i) => {
        if (this.ctx != null) {
          this.ctx.fillRect(city.x, city.y, 5, 5)
          this.ctx.fillText(i.toString(), city.x + 5, city.y)
        }
      })
    }
  }
}

class Solution {
  public readonly order: number[]
  public readonly distance: number
  private connectionMatrix: ConnectionInfo[][]

  constructor(connectionMatrix: ConnectionInfo[][], order?: number[]) {
    this.connectionMatrix = connectionMatrix
    this.order = order || this.newSolution(3)
    this.distance = this.totalDistance()
    console.log('order here', this.order, order, this.distance)
  }

  public newSolution(beta: number): number[] {
    const cities = this.connectionMatrix.length
    const alpha: number = 1
    const solution: number[] = []
    let current = Math.floor((Math.random() * 1000) % this.connectionMatrix.length)
    solution.push(current)

    for (let i = 1; i < cities; i++) {
      const notVisited: number[] = this.possibleCandidates(solution)
      const probabilityMul = (node: ConnectionInfo) => Math.pow(node.pheromone, alpha) * Math.pow(1 / node.distance, beta)
      const totalProbability: number = notVisited.reduce((acc, curr) => acc + probabilityMul(this.connectionMatrix[current][curr]), 0)
      const notVisitedProbability: number[] = notVisited.map(x => probabilityMul(this.connectionMatrix[current][x]) / totalProbability)
      const next = this.rouletteSelect(notVisitedProbability)
      current = notVisited[next]
      solution.push(current)
    }

    return solution
  }

  private totalDistance(): number {
    let distance = 0
    for (let i = 0; i < this.order.length - 1; i++) {
      const current = this.order[i]
      const next = this.order[i + 1]
      distance += this.connectionMatrix[current][next].distance
    }
    return distance
  }

  private possibleCandidates(partialSolution: number[]): number[] {
    let candidates: number[] = []
    for (let k = 0; k < this.connectionMatrix.length; k++) {
      if (partialSolution.indexOf(k) == -1) {
        candidates.push(k)
      }
    }
    return candidates
  }

  private rouletteSelect(probabilities: number[]): number {
    let rand = Math.random()
    let current = 0
    while (rand > 0) {
      rand -= probabilities[current]
      current++
    }
    return current - 1
  }

  public deltaPheromone(i: number, j: number): number {
    let delta = 0
    const iIndex = this.order.indexOf(i)
    const jIndex = this.order.indexOf(j)

    if (iIndex > -1 && jIndex > -1 && iIndex + 1 == jIndex) {
      delta = 1.0 / this.distance
    }

    return delta
  }

  public print(): void {
    console.log(`Order is ${this.order.join(' -> ')} with total distance of ${this.distance}`)
  }
}

class World {
  public readonly cities: City[] = []
  public infoMatrix: ConnectionInfo[][] = []
  private bestSolution: Solution
  private startingPheromone: number
  private painter: Painter

  constructor(noCities: number, noAnts: number, maxX: number, maxY: number) {
    this.painter = new Painter(this)
    this.startingPheromone = Math.random() * 1000
    this.initCities(noCities, maxX, maxY)
    this.initMatrix()
    this.bestSolution = new Solution(this.infoMatrix, shuffledArray(noCities))
    console.log('Best solution')
    this.bestSolution.print()
  }

  private initCities(count: number, xMax: number, yMax: number) {
    for (let i = 0; i < count; i++) {
      const x = (Math.random() * 100000) % xMax
      const y = (Math.random() * 100000) % yMax
      this.cities.push({x, y})
    }
    this.painter.drawCities()
  }

  private initMatrix() {
    for (let i = 0; i < this.cities.length; i++) {
      this.infoMatrix.push([])
      for (let j = 0; j < this.cities.length; j++) {
        const distance: number = Math.sqrt(Math.pow(this.cities[i].x - this.cities[j].x, 2)
          + Math.pow(this.cities[i].y - this.cities[j].y, 2))
        this.infoMatrix[i].push({
          pheromone: this.startingPheromone,
          distance,
        })
      }
    }
    this.printDistanceMatrix()
    this.printPheromoneMatrix()
  }

  public search(beta: number) {
    for (let i = 0; i < 100; i++) {
      const candidates: Solution[] = []
      for (let j = 0; j < this.cities.length; j++) {
        const antSolution = new Solution(this.infoMatrix)
        if (antSolution.distance <= this.bestSolution.distance) {
          this.bestSolution = antSolution
        }
        candidates.push(antSolution)
      }
      this.bestSolution.print()
      this.infoMatrix = this.decayPheromones(0.5)
      this.infoMatrix = this.updatePheromones(candidates)
      // this.printPheromoneMatrix()
    }
  }


  private decayPheromones(factor: number): ConnectionInfo[][] {
    return this.infoMatrix.map(row => row.map(info => ({
      distance: info.distance,
      pheromone: (1 - factor) * info.pheromone,
    })))
  }

  private updatePheromones(solutions: Solution[]): ConnectionInfo[][] {
    return this.infoMatrix.map((row, i) => row.map((info, j) => {

      let newPheromone: number = info.pheromone
      solutions.forEach(solution => newPheromone += solution.deltaPheromone(i, j))
      return {
        distance: info.distance,
        pheromone: newPheromone,
      }
    }))
  }

  public printDistanceMatrix(): void {
    console.log('Inter city distances:')
    this.infoMatrix.forEach(row =>
      console.log(row.map(col =>
        col.distance.toFixed(4)).join(', ')))
  }

  public printPheromoneMatrix(): void {
    console.log('Pheromones:')
    this.infoMatrix.forEach(row =>
      console.log(row.map(col =>
        col.pheromone.toFixed(4)).join(', ')))
  }
}


console.log('World constructing')
const world = new World(10, 10, window.innerWidth - 100, window.innerHeight - 100)
world.search(3)
