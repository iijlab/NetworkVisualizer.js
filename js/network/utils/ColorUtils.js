export class ColorUtils {
    static getColorForMetric(metrics, config) {
        const metricName = config.visualization.metric;
        const value = metrics?.current?.[metricName] ?? 0;

        // Debug log for troubleshooting
        console.debug(`Getting color for metric ${metricName}, value: ${value}`);

        const range = config.visualization.ranges.find(r => value <= r.max);
        const color = range ? range.color : config.visualization.ranges[config.visualization.ranges.length - 1].color;

        // Debug log for selected color
        console.debug(`Selected color: ${color}`);

        return color;
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
