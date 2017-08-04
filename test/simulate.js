import { MetricCounter, formatMetricsForInfluxDBPoint, InfluxMetricsQueue } from '../src/index';

const intervalMs = 30000;
const measurement = 'sample_measurement';
const tags = {
  site: 'localhost',
};

const counter = new MetricCounter({
  intervalMs,
  flushFunc: (data) => {
    console.log('Flushing metrics', data);
    const influxPointData = formatMetricsForInfluxDBPoint(data, measurement, tags);
    console.log('influx point', JSON.stringify(influxPointData, null, '  '));
  },
});

counter.addOperation('op1');
counter.addOperation('op2');

setInterval(() => {
  counter.flush();
}, intervalMs);

setInterval(() => {
  counter.logOperationMetrics({
    operation: 'op1',
    responseTimeMs: Math.floor((Math.random() * 50) + 1),
    httpStatus: 200,
  });

  counter.logOperationMetrics({
    operation: 'op2',
    responseTimeMs: Math.floor((Math.random() * 50) + 1),
    httpStatus: 400,
  });
}, 5000);
