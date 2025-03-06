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
                    // Trigger update event
                    const event = new CustomEvent('metricChanged', { detail: { metric: metricName } });
                    document.dispatchEvent(event);
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

            // Create a container for the legend that will be on the same line as the dropdown
            const legendContainer = document.createElement("div");
            legendContainer.style.display = "flex";
            legendContainer.style.alignItems = "center";
            legendContainer.style.width = "100%";

            // Add the dropdown container to the legend container
            if (this.legendContent.querySelector(".legend-dropdown")) {
                const dropdownContainer = this.legendContent.querySelector(".legend-dropdown");
                this.legendContent.removeChild(dropdownContainer);
                legendContainer.appendChild(dropdownContainer);
            }

            // Create the gradient legend
            const gradientLegend = document.createElement("div");
            gradientLegend.className = "legend-gradient";
            gradientLegend.style.display = "flex";
            gradientLegend.style.flexDirection = "column";
            gradientLegend.style.flex = "1";
            gradientLegend.style.marginLeft = "15px";

            // Create gradient bar
            const gradientBar = document.createElement("div");
            gradientBar.className = "gradient-bar";
            gradientBar.style.height = "20px";
            gradientBar.style.width = "100%";

            // Check if we have color stops
            if (colorScale.stops && colorScale.stops.length >= 2) {
                // Create gradient from stops
                const sortedStops = [...colorScale.stops].sort((a, b) => a.position - b.position);
                const gradientStops = sortedStops.map(stop => {
                    return `${stop.color} ${stop.position * 100}%`;
                }).join(', ');

                gradientBar.style.background = `linear-gradient(to right, ${gradientStops})`;
            } else {
                // Fall back to min/max gradient
                gradientBar.style.background = `linear-gradient(to right, ${colorScale.min}, ${colorScale.max})`;
            }

            gradientBar.style.borderRadius = "3px";
            gradientBar.style.marginBottom = "2px";

            // Create labels container
            const labelsContainer = document.createElement("div");
            labelsContainer.className = "gradient-labels";
            labelsContainer.style.display = "flex";
            labelsContainer.style.justifyContent = "space-between";

            // Create min label
            const minLabel = document.createElement("div");
            minLabel.className = "gradient-label";
            minLabel.textContent = "0%";

            // Create max label
            const maxLabel = document.createElement("div");
            maxLabel.className = "gradient-label";
            maxLabel.textContent = "100%";

            // Assemble the gradient legend
            labelsContainer.appendChild(minLabel);
            labelsContainer.appendChild(maxLabel);
            gradientLegend.appendChild(gradientBar);
            gradientLegend.appendChild(labelsContainer);

            // Add the gradient legend to the container
            legendContainer.appendChild(gradientLegend);

            // Add the container to the legend content
            this.legendContent.appendChild(legendContainer);
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
