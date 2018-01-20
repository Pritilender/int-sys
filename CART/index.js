
const {DecisionTreeClassifier} = require('ml-cart');
const carData = require('./car-data.json');
const carTest = require('./car-test.json');

const trainingSet = carData.map(x => x.slice(0, 6));
const distinctClasses = ['unacc', 'acc', 'good', 'vgood'];
const classess = carData.map(x => x[6]);
const predictions = classess.map(x => distinctClasses.indexOf(x));

const testArr = carTest.map(x => x.slice(0, 6));
const testClassess = carTest.map(x => x[6]);

const classifier = new DecisionTreeClassifier();
classifier.train(trainingSet, predictions);
const result = classifier.predict(testArr)

let count = 0;
result.forEach((x, i) => {
  if (x == distinctClasses.indexOf(testClassess[i])) {
    count++;
  }
})

console.log('Count', count);
console.log('Total', testArr.length);
console.log('Percent', count / testArr.length * 100);
