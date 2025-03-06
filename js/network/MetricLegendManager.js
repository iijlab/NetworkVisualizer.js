import { ColorScaleEditor } from "./ColorScaleEditor.js";

export class MetricLegendManager {
    constructor(config) {
        this.config = config;
        this.legendContent = document.querySelector(".metric-legend .legend-content");
        this.legendTitle = document.querySelector(".metric-legend h4");
        this.colorScaleEditor = new ColorScaleEditor();

        if (!this.legendContent) {
            console.warn("Metric legend content element not found");
            return;
        }

        this.setupLegend();
    }

    setupLegend() {
        const currentMetric = this.config.visualization.metric;
        const currentMetricTitle = currentMetric.charAt(0).toUpperCase() + currentMetric.slice(1);

        // Get metric configuration
        const metricConfig = this.config.visualization.metrics?.[currentMetric];
        const metricType = metricConfig?.type || "range";

        // Clear existing content in title (we'll keep it empty)
        if (this.legendTitle) {
            this.legendTitle.innerHTML = '';
        }

        // Clear existing content in legend
        this.legendContent.innerHTML = "";

        // Create dropdown button and add it to legend content (if available)
        if (this.config.visualization.availableMetrics) {
            // Create container for controls
            const controlsContainer = document.createElement("div");
            controlsContainer.className = "legend-controls";
            controlsContainer.style.display = "flex";
            controlsContainer.style.alignItems = "center";
            controlsContainer.style.marginRight = "1rem";

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

                    // Trigger update event with more details
                    const event = new CustomEvent('metricChanged', {
                        detail: {
                            metric: metricName,
                            previousMetric: currentMetric,
                            config: this.config
                        }
                    });
                    document.dispatchEvent(event);

                    console.debug(`Metric changed from ${currentMetric} to ${metricName}`);
                };
                li.appendChild(a);
                menu.appendChild(li);
            });

            dropdown.appendChild(menu);
            controlsContainer.appendChild(button);
            controlsContainer.appendChild(dropdown);

            // Add data-toggle attribute to button
            button.setAttribute('data-toggle', dropdown.id);

            // Create configure button
            const configureButton = document.createElement('button');
            configureButton.className = 'button small';
            configureButton.textContent = 'Configure';
            configureButton.style.marginLeft = '0.5rem';
            configureButton.onclick = () => {
                this.openColorScaleEditor();
            };
            controlsContainer.appendChild(configureButton);

            // Add controls container to legend content
            this.legendContent.appendChild(controlsContainer);

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

        // Create legend items based on metric type
        if (metricType === "continuous" && metricConfig?.colorScale) {
            // Create continuous gradient legend
            const colorScale = metricConfig.colorScale;

            // SIMPLIFIED APPROACH: Create a simple gradient bar with labels
            const gradientContainer = document.createElement("div");
            gradientContainer.style.marginTop = "10px";
            gradientContainer.style.width = "100%";

            // Create gradient bar directly with inline styles
            const gradientBar = document.createElement("div");
            gradientBar.style.height = "20px";
            gradientBar.style.width = "100%";
            gradientBar.style.borderRadius = "3px";
            gradientBar.style.marginBottom = "5px";
            gradientBar.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.2)";

            // Set gradient background directly
            if (colorScale.min && colorScale.max) {
                gradientBar.style.background = `linear-gradient(to right, ${colorScale.min}, ${colorScale.max})`;
                console.log(`Setting gradient background: linear-gradient(to right, ${colorScale.min}, ${colorScale.max})`);
            } else if (colorScale.stops && colorScale.stops.length >= 2) {
                const sortedStops = [...colorScale.stops].sort((a, b) => a.position - b.position);
                const gradientStops = sortedStops.map(stop => {
                    return `${stop.color} ${stop.position * 100}%`;
                }).join(', ');
                gradientBar.style.background = `linear-gradient(to right, ${gradientStops})`;
                console.log(`Setting gradient background with stops: ${gradientStops}`);
            }

            // Create labels container
            const labelsContainer = document.createElement("div");
            labelsContainer.style.display = "flex";
            labelsContainer.style.justifyContent = "space-between";

            // Create min and max labels
            const minLabel = document.createElement("div");
            minLabel.textContent = "0%";
            minLabel.style.fontSize = "12px";

            const maxLabel = document.createElement("div");
            maxLabel.textContent = "100%";
            maxLabel.style.fontSize = "12px";

            // Assemble the legend
            labelsContainer.appendChild(minLabel);
            labelsContainer.appendChild(maxLabel);
            gradientContainer.appendChild(gradientBar);
            gradientContainer.appendChild(labelsContainer);

            // Add to legend content
            this.legendContent.appendChild(gradientContainer);

            console.log("Added continuous gradient legend to DOM");
        } else {
            // Use range-based legend
            const ranges = metricConfig?.ranges || this.config.visualization.ranges;

            if (!ranges || ranges.length === 0) {
                console.warn("No ranges found for metric legend");
                return;
            }

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
    }

    openColorScaleEditor() {
        const currentMetric = this.config.visualization.metric;
        this.colorScaleEditor.open(this.config, currentMetric, (updatedConfig) => {
            this.config = updatedConfig;
            this.setupLegend();

            // Trigger update event to refresh visualization
            const event = new CustomEvent('metricChanged', { detail: { metric: currentMetric } });
            document.dispatchEvent(event);
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
