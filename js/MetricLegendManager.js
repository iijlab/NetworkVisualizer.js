class MetricLegendManager {
    constructor() {
        this.container = document.querySelector('.metric-legend .legend-content');
        this.loadConfig();
    }

    async loadConfig() {
        try {
            const response = await fetch('data/config.json');
            const config = await response.json();
            this.updateLegend(config.visualization);
        } catch (error) {
            console.error('Error loading metric configuration:', error);
        }
    }

    updateLegend(visualization) {
        if (!this.container) return;

        this.container.innerHTML = ''; // Clear existing content

        // Create legend items based on ranges
        let prevMax = 0;
        visualization.ranges.forEach((range, index) => {
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
            } else if (index === visualization.ranges.length - 1) {
                labelSpan.textContent = `>${prevMax}%`;
            } else {
                labelSpan.textContent = `${prevMax}-${range.max}%`;
            }

            legendItem.appendChild(colorSpan);
            legendItem.appendChild(labelSpan);
            this.container.appendChild(legendItem);

            prevMax = range.max;
        });
    }
}

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetricLegendManager;
}
