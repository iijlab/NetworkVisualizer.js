class MetricLegendManager {
    constructor() {
        this.container = document.querySelector('.metric-legend .legend-content');
        this.loadConfig();
    }

    async loadConfig() {
        try {
            const response = await fetch('data/config.json');
            const config = await response.json();
            this.updateLegend(config.visualization.metrics.allocation);
        } catch (error) {
            console.error('Error loading metric configuration:', error);
        }
    }

    updateLegend(metricConfig) {
        if (!this.container) return;

        this.container.innerHTML = ''; // Clear existing content

        if (metricConfig.type === 'range') {
            // Create discrete legend items for range-based metric
            let prevMax = 0;
            metricConfig.ranges.forEach((range, index) => {
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';

                const colorSpan = document.createElement('span');
                colorSpan.className = 'legend-color';
                colorSpan.style.backgroundColor = range.color;

                const labelSpan = document.createElement('span');
                labelSpan.className = 'legend-label';

                // Format the label based on range position
                if (index === 0) {
                    labelSpan.textContent = `${range.max}%`;
                } else if (index === metricConfig.ranges.length - 1) {
                    labelSpan.textContent = `>${prevMax}%`;
                } else {
                    labelSpan.textContent = `${prevMax}-${range.max}%`;
                }

                legendItem.appendChild(colorSpan);
                legendItem.appendChild(labelSpan);
                this.container.appendChild(legendItem);

                prevMax = range.max;
            });
        } else {
            // Create continuous gradient legend
            const gradient = document.createElement('div');
            gradient.className = 'legend-gradient';
            gradient.style.background = `linear-gradient(to right, ${metricConfig.colorScale.min}, ${metricConfig.colorScale.max})`;

            const labels = document.createElement('div');
            labels.className = 'gradient-labels';
            labels.innerHTML = `
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
            `;

            this.container.appendChild(gradient);
            this.container.appendChild(labels);
        }
    }
}

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetricLegendManager;
}
