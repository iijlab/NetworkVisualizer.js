export class MetricLegendManager {
    constructor(config) {
        this.config = config;
        this.legendContent = document.querySelector(".metric-legend .legend-content");
        this.legendTitle = document.querySelector(".metric-legend h4");

        if (!this.legendContent) {
            console.warn("Metric legend content element not found");
            return;
        }

        this.setupLegend();
    }

    setupLegend() {
        const metricName = this.config.visualization.metric;
        const metricTitle = metricName.charAt(0).toUpperCase() + metricName.slice(1);
        const ranges = this.config.visualization.ranges;

        // Update the legend title
        if (this.legendTitle) {
            this.legendTitle.textContent = `${metricTitle} Legend`;
        }

        // Clear existing content
        this.legendContent.innerHTML = "";

        // Create legend items
        ranges.forEach((range, index) => {
            const label = index === 0 ? "0%" :
                index === ranges.length - 1 ? `>${ranges[index - 1].max}%` :
                    `${ranges[index - 1].max}-${range.max}%`;

            const legendItem = document.createElement("div");
            legendItem.className = "legend-item";
            legendItem.innerHTML = `
                <span class="legend-color" style="background: ${range.color}"></span>
                <span class="legend-label">${label}</span>
            `;
            this.legendContent.appendChild(legendItem);
        });
    }

    updateLegend(newConfig) {
        this.config = newConfig;
        this.setupLegend();
    }

    getLegendRanges() {
        return [...this.config.visualization.ranges];
    }

    getCurrentMetric() {
        return this.config.visualization.metric;
    }
}
