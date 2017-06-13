// @flow
import { get, mapKeys, reduce } from 'lodash';

export default function formatMetricsForInfluxDBPoint(data: Object, measurement: string, tags: Object): Object {
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

  return {
    timestamp: new Date(timestamp),
    fields: flattenedMetrics,
    tags,
    measurement,
  };
}
