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
        const currentMetric = this.config.visualization.metric;
        const currentMetricTitle = currentMetric.charAt(0).toUpperCase() + currentMetric.slice(1);
        const ranges = this.config.visualization.ranges;

        // Clear existing content in title (we'll keep it empty)
        if (this.legendTitle) {
            this.legendTitle.innerHTML = '';
        }

        // Clear existing content in legend
        this.legendContent.innerHTML = "";

        // Create dropdown button and add it to legend content (if available)
        if (this.config.visualization.availableMetrics) {
            // Create dropdown container
            const dropdownContainer = document.createElement("div");
            dropdownContainer.className = "legend-dropdown";
            dropdownContainer.style.marginRight = "1rem";

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
            dropdown.setAttribute('data-position', 'top');
            dropdown.setAttribute('data-alignment', 'left');
            dropdown.style.minWidth = '120px';

            // Create menu
            const menu = document.createElement('ul');
            menu.className = 'vertical menu';

            this.config.visualization.availableMetrics.forEach(metricName => {
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

            // Add data-toggle attribute to button
            button.setAttribute('data-toggle', dropdown.id);

            // Add dropdown container to legend content
            this.legendContent.appendChild(dropdownContainer);

            // Initialize Foundation dropdown
            $(document).ready(() => {
                try {
                    // Re-initialize Foundation on the document
                    $(document).foundation();
                } catch (error) {
                    console.warn("Error initializing dropdown:", error);
                }
            });
        }

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
