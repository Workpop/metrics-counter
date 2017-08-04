import { get, forEach } from 'lodash';
import {
  MetricCounter,
  InfluxMetricsQueue,
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


describe('InfluxMetricsQueue', function () {
  function flushFunc(data) {
    return data;
  }
  it('should time operations with dynamic fields/tags from the queue input paramters', function () {
    const testQueue = new InfluxMetricsQueue({
      fields: {
        thisissparta: 300,
      },
      tags: {
        pizza: 'taco',
      },
      flushFunc,
    });

    const operation = testQueue.createOperation('test');
    const opTimer = operation.startTimer();
    opTimer.completed();

    const results = testQueue.flush();
    expect(results).to.be.a('array');

    results.forEach((point) => {
      expect(point.fields).to.deep.include.keys('thisissparta');
      expect(point.tags).to.deep.include.keys('pizza');
      expect(point.fields.thisissparta).to.equal(300);
      expect(point.tags.pizza).to.equal('taco');
    });
  });
  it('should time operations with dynamic fields/tags from the operation input paramters', function () {
    const testQueue = new InfluxMetricsQueue({
      flushFunc,
    });

    const operation = testQueue.createOperation('test', {
      pizza: 'taco',
    }, {
      thisissparta: 300,
    });
    const opTimer = operation.startTimer();
    opTimer.completed();

    const results = testQueue.flush();
    expect(results).to.be.a('array');

    results.forEach((point) => {
      expect(point.fields).to.deep.include.keys('thisissparta');
      expect(point.tags).to.deep.include.keys('pizza');
      expect(point.fields.thisissparta).to.equal(300);
      expect(point.tags.pizza).to.equal('taco');
    });
  });
  it('should time operations with dynamic fields/tags from the timer input paramters', function () {
    const testQueue = new InfluxMetricsQueue({
      flushFunc,
    });

    const operation = testQueue.createOperation('test');
    const opTimer = operation.startTimer();
    opTimer.completed({
      pizza: 'taco',
    }, {
      thisissparta: 300,
    });

    const results = testQueue.flush();
    expect(results).to.be.a('array');

    results.forEach((point) => {
      expect(point.fields).to.deep.include.keys('thisissparta');
      expect(point.tags).to.deep.include.keys('pizza');
      expect(point.fields.thisissparta).to.equal(300);
      expect(point.tags.pizza).to.equal('taco');
    });
  });
  it('should return one unique point for each timed operation', function () {
    const testQueue = new InfluxMetricsQueue({
      flushFunc,
    });

    const operation = testQueue.createOperation('test');
    const opTimer = operation.startTimer();
    opTimer.completed({
      pizza: 'taco',
    }, {
      thisissparta: 300,
    });

    const opTimer2 = operation.startTimer();
    opTimer2.completed({
      taco: 'pizza',
    }, {
      batman: 'robin',
    });

    const results = testQueue.flush();
    expect(results).to.be.a('array');
    expect(results.length).to.equal(2);
    const point1 = results[0];
    expect(point1.fields).to.deep.include.keys('thisissparta');
    expect(point1.tags).to.deep.include.keys('pizza');
    expect(point1.fields.thisissparta).to.equal(300);
    expect(point1.tags.pizza).to.equal('taco');
    const point2 = results[1];
    expect(point2.fields).to.deep.include.keys('batman');
    expect(point2.tags).to.deep.include.keys('taco');
    expect(point2.fields.batman).to.equal('robin');
    expect(point2.tags.taco).to.equal('pizza');
  });
});
