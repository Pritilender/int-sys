interface City {
  x: number,
  y: number,
}

function initSequence(length: number): number[] {
  return Array.apply(null, {length}).map(Function.call, Number)
}

class CityMap {
  public cities: City[]
  private ctx: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D, xMax: number, yMax: number, count: number = 20) {
    this.ctx = ctx

    this.cities = []
    for (let i = 0; i < count; i++) {
      const x = (Math.random() * 100000) % xMax
      const y = (Math.random() * 100000) % yMax
      this.cities.push({x, y})
    }
  }

  public connectCities(sequence: number[], color: string): void {
    this.ctx.strokeStyle = color
    this.ctx.beginPath()
    this.ctx.moveTo(this.cities[sequence[0]].x + 2.5, this.cities[sequence[0]].y + 2.5)
    for (let i = 1; i < this.cities.length; i++) {
      this.ctx.lineTo(this.cities[sequence[i]].x + 2.5, this.cities[sequence[i]].y + 2.5)
    }
    this.ctx.stroke()
    this.ctx.closePath()
  }

  public drawCities(w: number, h: number): void {
    this.ctx.clearRect(0, 0, w, h)
    this.ctx.font = '18px Lucida Console'
    this.cities.forEach((city, i) => {
      this.ctx.fillRect(city.x, city.y, 5, 5)
      this.ctx.fillText(i.toString(), city.x + 5, city.y)
    })
  }
}

class Chromosome {
  public sequence: number[]
  public fitness: number
  private cities: City[]

  constructor(cities: City[], sequence?: number[]) {
    this.cities = cities
    this.sequence = sequence || _.shuffle(initSequence(this.cities.length))
    this.fitness = this.calculateFitness()
  }

  public calculateFitness(): number {
    return 1 / this.totalDistance()
  }

  public totalDistance(): number {
    let total: number = 0

    for (let i = 0; i < this.sequence.length - 1; i++) {
      const first = this.cities[this.sequence[i]]
      const second = this.cities[this.sequence[i + 1]]
      const dist = Math.sqrt(Math.pow(second.x - first.x, 2) + Math.pow(second.y - first.y, 2))
      total += dist
    }

    return total
  }

  public crossover(partner: Chromosome): Chromosome {
    // single point
    let ind = Math.floor(Math.random() * 1000) % this.sequence.length
    if (ind == 0) {
      ind = 1
    }

    const firstParent = this.sequence.slice(0, ind)
    const secondParent: number[] = partner.sequence.filter(x => firstParent.indexOf(x) == -1)

    const childSequence = [...firstParent, ...secondParent]
    // console.log('first', firstParent)
    // console.log('second', secondParent)
    // console.log('child', childSequence)
    return new Chromosome(this.cities, childSequence)
  }

  public mate(partner: Chromosome): [Chromosome, Chromosome] {
    return [this.crossover(partner), this.crossover(partner)]
  }

  public mutate(): this {
    const ind1 = Math.floor(Math.random() * 1000) % this.sequence.length
    let ind2 = Math.floor(Math.random() * 1000) % this.sequence.length
    if (ind2 == ind1) {
      if (ind2 == (this.sequence.length - 1)) {
        ind2--
      } else {
        ind2++
      }
    }

    const tmp = this.sequence[ind1]
    this.sequence[ind1] = this.sequence[ind2]
    this.sequence[ind2] = tmp

    this.fitness = this.calculateFitness()

    return this
  }

  public toString(): string {
    return `Chromosome info:
  * sequence: ${this.sequence.join(' -> ')}
  * distance: ${this.totalDistance()}
  * fitness: ${this.fitness}`
  }
}

class Population {
  public population: Chromosome[]
  private cities: City[]
  private oldPercent: number
  private mutationPercent: number

  constructor(size: number, cities: City[], oldPercent: number, mutationPercent: number, population?: Chromosome[]) {
    this.cities = cities
    this.oldPercent = oldPercent
    this.mutationPercent = mutationPercent

    if (population != null) {
      this.population = population
    } else {
      this.generatePopulation(size)
    }
  }

  private generatePopulation(size: number): void {
    this.population = []
    for (let i = 0; i < size; i++) {
      this.population.push(new Chromosome(this.cities))
    }
  }

  public topNFittest(n: number): Chromosome[] {
    return _.sortBy(this.population, (c: Chromosome) => c.fitness)
      .reverse()
      .slice(0, n)
  }

  public maxFit(): Chromosome {
    return this.topNFittest(1)[0]
  }

  private roulette(probabilities: number[]): Chromosome {
    const rand = Math.random()
    let ind = probabilities.length - 1
    let sum = 0
    for (let i = 0; i < probabilities.length; i++) {
      sum += probabilities[i]
      if (sum > rand) {
        ind = i
        break
      }
    }

    return this.population[ind]
  }

  private chooseParents(n: number): Chromosome[] {
    const parents: Chromosome[] = this.topNFittest(2)

    const totalFitness = this.population.map(c => c.fitness).reduce((a, c) => a + c)
    const probabilities = this.population.map(c => c.fitness / totalFitness)

    for (let i = 0; i < n - 2; i++) {
      parents.push(this.roulette(probabilities))
    }

    return parents
  }

  private chooseMatingPairs(parents: Chromosome[]) {
    const pairs = []
    for (let i = 0; i < this.population.length / 2; i++) {
      let a = Math.floor(Math.random() * 1000) % parents.length
      let b = Math.floor(Math.random() * 1000) % parents.length
      pairs.push([parents[a], parents[b]])
    }
    return pairs
  }

  public reproduce(): Population {
    const numberOfParents = Math.floor(this.oldPercent * this.population.length + 0.5)
    const parents = this.chooseParents(numberOfParents)
    const pairs = this.chooseMatingPairs(parents)

    const children = _.flatten(pairs.map(pair => pair[0].mate(pair[1])))
      .map(c => Math.random() < this.mutationPercent ? c.mutate() : c)

    const next = new Population(this.population.length, this.cities, this.oldPercent, this.mutationPercent, children)
    return next
  }
}

function main() {
  const canvas = document.getElementById('myCanvas') as HTMLCanvasElement
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const ctx = canvas.getContext('2d')

  if (ctx != null) {
    const cityMap = new CityMap(ctx, canvas.width, canvas.height, 20)
    cityMap.drawCities(canvas.width, canvas.height)

    const totalPopulation = 32
    const parentPercent = 0.8
    const percentMutating = 0.4
    let population = new Population(totalPopulation, cityMap.cities, parentPercent, percentMutating)

    let minFit = population.maxFit()
    console.log(minFit.toString())
    cityMap.connectCities(minFit.sequence, 'red')

    // control params
    let fitnessThreshold = 20
    let totalIterations = 5000
    let e = 0.000005

    let i = 0
    let samePopulations = 0
    const singleIteration = () => {
      i++
      const prevFit = population.maxFit()
      population = population.reproduce()
      const newFit = population.maxFit()

      if (Math.abs(newFit.fitness - prevFit.fitness) <= e) {
        samePopulations++
      } else {
        samePopulations = 0
      }

      cityMap.drawCities(canvas.width, canvas.height)
      cityMap.connectCities(newFit.sequence, 'blue')

      ctx.font = '12px Lucida Console'
      ctx.fillText(`Fitness: ${newFit.fitness} | Generation: ${i}`, 30, 20)

      if (i == totalIterations || samePopulations > fitnessThreshold) {
        console.log(i)
        console.log(population.maxFit().toString())
        ctx.fillText(newFit.sequence.join(' -> '), 30, 40)
        ctx.fillText(`Distance: ${newFit.totalDistance()}`, 30, 60)
      } else {
        setTimeout(singleIteration, 10)
      }
    }

    singleIteration()
  }
}

main()
