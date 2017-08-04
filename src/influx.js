// @flow
import { get, mapKeys, reduce } from 'lodash';

export function formatMetricsForInfluxDBPoint(data: Object, measurement: string, tags: Object): Object {
  const timestamp = get(data, 'timestamp');
  const metrics = get(data, 'metrics', {});
  const flattenedMetrics = reduce(metrics, (memo: Object, value: Object, key: string): Object => {
    const prefixedMetrics = mapKeys(value, (v: string, k: string): string => {
      return `${key}_${k}`;
    });

    return {
      ...memo,
      ...prefixedMetrics,
    };
  }, {});

  return Point({
    timestamp: new Date(timestamp),
    fields: flattenedMetrics,
    tags,
    measurement,
  });
}

type InfluxMetricsQueueInputType = {
  tags: Object,
  fields: Object,
  flushFunc: Function,
}

type PointType = {
  timestamp: number,
  tags: Object,
  fields: Object,
  measurement: string,
};

export function InfluxMetricsQueue({tags = {}, fields = {}, flushFunc = console.log}: InfluxMetricsQueueInputType) { // eslint-disable-line no-console
  this.points = [];
  this.tags = tags;
  this.fields = fields;
  this.flushFunc = flushFunc; // eslint-disable-line no-console
}

InfluxMetricsQueue.prototype.createOperation = function (operationName: string, tags: Object, fields: Object): Object {
  return new Operation(this, operationName, {
    ...this.tags,
    ...tags,
  }, {
    ...this.fields,
    ...fields,
  });
};

InfluxMetricsQueue.prototype.getPoints = function (): Array<PointType> {
  return this.points;
};

InfluxMetricsQueue.prototype.clearPoints = function () {
  this.points = [];
};

InfluxMetricsQueue.prototype.addPoint = function (point: PointType) {
  this.points.push(point);
};

InfluxMetricsQueue.prototype.flush = function (): any {
  const points = this.getPoints();
  this.clearPoints();
  return this.flushFunc(points);
};

//InfluxMetricsQueue instantiates instances of Operation for each operation that needs to create influx data
//This instance is responsible for timing different operations and queueing data points into the influx queue
function Operation(queue: Object, operationName: string, tags: Object = {}, fields: Object = {}) {
  this.queue = queue;
  this.operationName = operationName;
  this.tags = tags;
  this.fields = fields;
}

//This returns a new instance of of an operation timer
//It starts timing as soon as this function is called
Operation.prototype.startTimer = function (): Object {
  return new OperationTimer(this);
};

//This creates a new influx data point with the provided tags and fields
//tags should identify and segment this operation
//fields should be values that you want to measure, eg response timestamp
Operation.prototype.queuePoint = function (tags: Object, fields: Object) {
  const point = new Point({
    timestamp: Date.now(),
    tags: {
      ...this.tags,
      ...tags,
    },
    fields: {
      ...this.fields,
      ...fields,
    },
    measurement: this.operationName,
  });
  this.queue.addPoint(point);
};

function OperationTimer(operation: Object) {
  this.operation = operation;
  this.startTime = process.hrtime();
}

OperationTimer.prototype.completed = function (tags: Object = {}, fields: Object = {}) {
  const responseTimeMs = this.elapsedTime();
  this.operation.queuePoint(tags, {
    ...fields,
    responseTimeMs,
  });
};

OperationTimer.prototype.elapsedTime = function (): number {
  const diff = process.hrtime(this.startTime);
  return (diff[0] * 1000) + Math.round(diff[1] / 1000000);
};

function Point({ timestamp, fields, tags, measurement }: { timestamp: number, fields: Object, tags: Object, measurement: string}): Object {
  return {
    timestamp,
    fields,
    tags,
    measurement,
  };
}
