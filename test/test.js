import { get } from 'lodash';
import {
  MetricCounter,
  formatMetricsForInfluxDBPoint,
} from '../src';

const expect = require('chai').expect;

describe('Test Counter', function () {
  const counter = new MetricCounter({
    intervalMs: 60000,
    flushFunc: (data) => {
    },
  });

  it('Test create counter', function (done) {
    const opCounter = counter.createOperationCounter('brew');
    const timer = opCounter.startOperationTimer();
    setTimeout(function() {
      const elapsedTime = timer.completed(200);
      expect(elapsedTime).to.be.a('number');
      expect(elapsedTime).to.be.above(500);
      expect(elapsedTime).to.be.below(1500);
      const currentBucket = counter.getCurrentBucket();
      expect(get(currentBucket, 'operations.brew.count')).to.equal(1);
      expect(get(currentBucket, 'operations.brew.count_2xx')).to.equal(1);
      expect(get(currentBucket, 'operations.brew.total_response_time')).to.equal(elapsedTime);
      done();
    }, 1000);
  });
});
