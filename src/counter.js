// @flow
import { floor, forIn, get, isNumber, reduce, unset } from 'lodash';

function Bucket(operations: Array<string>) {
  this.operations = reduce(operations, (memo: Object, operation: string): Object => {
    return {
      ...memo,
      [operation]: {
        count: 0,
        count_2xx: 0,
        count_3xx: 0,
        count_4xx: 0,
        count_5xx: 0,
        total_response_time: 0,
      },
    };
  }, {});
}

Bucket.prototype.logOperationMetrics = function logOperationMetrics({operation, responseTimeMs, httpStatus}) {
  if (!get(this.operations, operation)) {
    return;
  }
  
  this.operations[operation].count += 1;

  if (isNumber(responseTimeMs)) {
    this.operations[operation].total_response_time += responseTimeMs;
  }

  if (isNumber(httpStatus)) {
    const statusXX = floor(httpStatus / 100);
    this.operations[operation][`count_${statusXX}xx`] += 1;
  }
};

Bucket.prototype.summarize = function summarize(): Object {
  return reduce(this.operations, (memo, value, key) => {
    const count = get(value, 'count', 0);
    const totalResponseTime = get(value, 'total_response_time', 0);
    const aveResponseTime = count > 0 ? Math.round(totalResponseTime / count) : 0;

    const dataWithAveResponseTime = {
      ...value,
      ave_response_time: aveResponseTime,
    };

    return {
      ...memo,
      [key]: dataWithAveResponseTime,
    };
  }, {});
};

function MetricCounter({intervalMs, flushFunc}: {intervalMs: number, flushFunc: Function}) {
  this.intervalMs = intervalMs;
  this.operations = [];
  this.buckets = {};
  this.flushFunc = flushFunc || console.log; // eslint-disable-line no-console
}

MetricCounter.prototype.getCurrentBucketId = function getCurrentBucketId(): string {
  return `${Math.floor(Date.now() / this.intervalMs)}`;
};

MetricCounter.prototype.getCurrentBucket = function getCurrentBucket(): Object {
  const bucketId = this.getCurrentBucketId();
  const existingBucket = this.buckets[bucketId];
  if (existingBucket) {
    return existingBucket;
  }

  const createdBucket = new Bucket(this.operations);
  this.buckets[bucketId] = createdBucket;
  return createdBucket;
};

MetricCounter.prototype.addOperation = function addOperation(operation: string) {
  this.operations.push(operation);
};

MetricCounter.prototype.logOperationMetrics = function logOperationMetrics({
  operation,
  responseTimeMs,
  httpStatus,
}) {
  this.getCurrentBucket().logOperationMetrics({operation, responseTimeMs, httpStatus});
};

MetricCounter.prototype.flush = function flush() {
  const currentBucketId = this.getCurrentBucketId();
  forIn(this.buckets, (value, key) => {
    const nKey = parseInt(key, 10);
    const timestamp = nKey * this.intervalMs;
    if (key < currentBucketId) {
      this.flushFunc({
        metrics: value.summarize(),
        timestamp,
      });
      unset(this.buckets, key);
    }
  });

  // make sure we have a current bucket
  this.getCurrentBucket();
};

export default MetricCounter;
