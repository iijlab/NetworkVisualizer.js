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
        const metrics = Object.keys(this.config.visualization.metrics);
        const currentMetric = this.config.visualization.metric;
        const currentMetricTitle = currentMetric.charAt(0).toUpperCase() + currentMetric.slice(1);
        const ranges = this.config.visualization.metrics[currentMetric].ranges;

        // Update the legend title and add dropdown if needed
        if (this.legendTitle) {
            // Clear existing content
            this.legendTitle.innerHTML = '';

            // Create title text
            const titleText = document.createElement('span');
            titleText.textContent = 'Legend';
            this.legendTitle.appendChild(titleText);

            // Add dropdown if there's more than one metric
            if (metrics.length > 1) {
                const dropdownContainer = document.createElement('span');
                dropdownContainer.style.marginLeft = '10px';

                // Create dropdown button
                const button = document.createElement('button');
                button.className = 'button small dropdown';
                button.setAttribute('type', 'button');
                button.setAttribute('data-toggle', 'metric-dropdown');
                button.textContent = currentMetricTitle;

                // Create dropdown pane
                const dropdown = document.createElement('div');
                dropdown.className = 'dropdown-pane';
                dropdown.id = 'metric-dropdown';
                dropdown.setAttribute('data-dropdown', '');
                dropdown.setAttribute('data-auto-focus', 'true');

                // Create menu
                const menu = document.createElement('ul');
                menu.className = 'vertical menu';

                metrics.forEach(metricName => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = '#';
                    a.textContent = metricName.charAt(0).toUpperCase() + metricName.slice(1);
                    a.onclick = (e) => {
                        e.preventDefault();
                        this.config.visualization.metric = metricName;
                        this.setupLegend();
                        // Trigger update event
                        const event = new CustomEvent('metricChanged', { detail: { metric: metricName } });
                        document.dispatchEvent(event);
                    };
                    li.appendChild(a);
                    menu.appendChild(li);
                });

                dropdown.appendChild(menu);
                dropdownContainer.appendChild(button);
                dropdownContainer.appendChild(dropdown);
                this.legendTitle.appendChild(dropdownContainer);

                // Initialize Foundation dropdown
                $(document).ready(() => {
                    new Foundation.Dropdown(dropdown);
                });
            }
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
