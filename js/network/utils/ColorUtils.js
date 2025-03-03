export class ColorUtils {
    static getColorForMetric(metrics, config) {
        const metricName = config.visualization.metric;
        const value = metrics?.current?.[metricName] ?? 0;

        // Debug log for troubleshooting
        console.debug(`Getting color for metric ${metricName}, value: ${value}`);

        // Get metric configuration
        const metricConfig = config.visualization.metrics?.[metricName];

        if (!metricConfig) {
            console.warn(`No configuration found for metric: ${metricName}`);
            // Fall back to legacy ranges
            const range = config.visualization.ranges.find(r => value <= r.max);
            return range ? range.color : config.visualization.ranges[config.visualization.ranges.length - 1].color;
        }

        // Handle different metric types
        if (metricConfig.type === "continuous") {
            // For continuous metrics, interpolate between min and max colors
            const colorScale = metricConfig.colorScale;
            if (!colorScale || !colorScale.min || !colorScale.max) {
                console.warn(`Invalid color scale for continuous metric: ${metricName}`);
                return "#006994"; // Default blue color
            }

            // Normalize value between 0 and 1
            const factor = Math.max(0, Math.min(1, value / 100));
            const color = this.interpolateColors(colorScale.min, colorScale.max, factor);

            // Debug log for selected color
            console.debug(`Selected continuous color: ${color} (factor: ${factor})`);

            return color;
        } else {
            // For range-based metrics
            const ranges = metricConfig.ranges || config.visualization.ranges;
            if (!ranges || !ranges.length) {
                console.warn(`No ranges found for metric: ${metricName}`);
                return "#006994"; // Default blue color
            }

            const range = ranges.find(r => value <= r.max);
            const color = range ? range.color : ranges[ranges.length - 1].color;

            // Debug log for selected color
            console.debug(`Selected range color: ${color}`);

            return color;
        }
    }

    static interpolateColors(color1, color2, factor) {
        // Convert hex to RGB
        const hex2rgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };

        // Convert RGB to hex
        const rgb2hex = (r, g, b) => '#' + [r, g, b]
            .map(x => Math.round(x).toString(16).padStart(2, '0'))
            .join('');

        const c1 = hex2rgb(color1);
        const c2 = hex2rgb(color2);

        if (!c1 || !c2) return color1;

        const r = c1.r + factor * (c2.r - c1.r);
        const g = c1.g + factor * (c2.g - c1.g);
        const b = c1.b + factor * (c2.b - c1.b);

        return rgb2hex(r, g, b);
    }
}
