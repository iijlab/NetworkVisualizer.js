export class ColorUtils {
    static getColorForMetric(metrics, config) {
        const metricName = config.visualization.metric;
        const value = metrics?.current?.[metricName] ?? 0;

        const range = config.visualization.ranges.find(r => value <= r.max);
        return range ? range.color : config.visualization.ranges[config.visualization.ranges.length - 1].color;
    }

    static getColorForAllocation(metrics, config) {
        const allocation = metrics?.current?.allocation ?? 0;
        const range = config.visualization.ranges.find(r => allocation <= r.max);
        return range ? range.color : config.visualization.ranges[config.visualization.ranges.length - 1].color;
    }
}
