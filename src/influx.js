import { get, mapKeys, reduce } from 'lodash';

export default function formatMetricsForInfluxDBPoint(data, measurement, tags) {
  const timestamp = get(data, 'timestamp');
  const metrics = get(data, 'metrics', {});
  const flattenedMetrics = reduce(metrics, (memo, value, key) => {
    const prefixedMetrics = mapKeys(value, (v, k) => {
      return `${key}_${k}`;
    });

    return {
      ...memo,
      ...prefixedMetrics,
    };
  }, {});

  return {
    timestamp: new Date(timestamp),
    fields: flattenedMetrics,
    tags,
    measurement,
  };
}
