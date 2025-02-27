export class DetailsPanelManager {
    constructor(detailsPanel, statsManager) {
        this.detailsPanel = detailsPanel;
        this.statsManager = statsManager;
        this.plots = new Map(); // Store plot objects
        this.setupResponsiveUpdates();
    }

    setupResponsiveUpdates() {
        // Update plots when window is resized
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.updateActivePlot();
            }, 250);
        });
    }

    updateActivePlot() {
        // Update history plots
        const plotContainers = this.detailsPanel.querySelectorAll('.history-plot');
        plotContainers.forEach(container => {
            if (container.firstChild) {
                const plotId = container.id;
                const width = container.clientWidth - 30;
                const metricName = container.dataset.metricName;
                const history = JSON.parse(container.dataset.history);
                this.createOrUpdateHistoryPlot(history, metricName, width, plotId);
            }
        });

        // Update metrics plot if it exists
        const metricsPlot = document.getElementById('metrics-plot');
        if (metricsPlot && this.currentNetwork) {
            this.createOrUpdateMetricsPlot(this.currentNetwork, 'metrics-plot');
        }
    }

    prepareMetricsData(network) {
        const timePoints = network.nodes[0]?.metrics?.history?.map(h => new Date(h.timestamp)) || [];
        const data = [];

        // Add node metrics history
        network.nodes.forEach(node => {
            node.metrics.history.forEach((point, index) => {
                data.push({
                    timestamp: new Date(point.timestamp),
                    id: node.id,
                    type: `${node.type} node`,
                    allocation: point.allocation,
                    timeIndex: index
                });
            });
        });

        // Add link metrics history
        network.links.forEach(link => {
            link.metrics.history.forEach((point, index) => {
                data.push({
                    timestamp: new Date(point.timestamp),
                    id: `${link.source}->${link.target}`,
                    type: 'link',
                    allocation: point.allocation,
                    timeIndex: index
                });
            });
        });

        return data;
    }

    createOrUpdateMetricsPlot(network, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const data = this.prepareMetricsData(network);
        const plotConfig = {
            style: {
                background: "transparent",
                color: "currentColor",
                fontSize: "12px",
                fontFamily: "Arial, sans-serif",
                ".plot-tooltip": {
                    background: "#333",
                    color: "white",
                    border: "1px solid #555"
                }
            },
            width: container.clientWidth - 40,
            height: 400,
            marginLeft: 60,
            marginRight: 100, // Increased margin for legend
            marginTop: 20,
            marginBottom: 40,
            y: {
                label: "Allocation (%)",
                domain: [0, 100],
                grid: true
            },
            x: {
                label: "Time",
                type: "time",
                tickFormat: "%H:%M"
            },
            color: {
                domain: ["cluster node", "leaf node", "link"],
                range: ["#2196f3", "#4caf50", "#ff9800"]
            },
            marks: [
                Plot.ruleY([0, 25, 50, 75, 100], {
                    stroke: "#ddd",
                    strokeDasharray: "4,4"
                }),
                Plot.line(data, {
                    x: "timestamp",
                    y: "allocation",
                    stroke: "type",
                    strokeWidth: 2,
                    z: "id", // Group by id to create separate lines
                    tip: true,
                    title: d => `${d.id}\nType: ${d.type}\nAllocation: ${d.allocation.toFixed(2)}%`
                }),
                Plot.text(data.filter(d => d.timeIndex === data[0]?.timeIndex || 0), {
                    x: "timestamp",
                    y: "allocation",
                    z: "id",
                    text: "id",
                    dx: 5,
                    dy: 0,
                    fontSize: 10,
                    textAnchor: "start"
                })
            ],
            // Add a legend
            caption: Plot.legend({
                color: {
                    domain: ["cluster node", "leaf node", "link"],
                    range: ["#2196f3", "#4caf50", "#ff9800"]
                }
            })
        };

        try {
            // Create new plot
            const plot = Plot.plot(plotConfig);

            if (this.plots.has(containerId)) {
                // Update existing plot
                const existingPlot = this.plots.get(containerId);
                // Check if the existing plot is still in the DOM
                if (existingPlot.parentNode === container) {
                    container.replaceChild(plot, existingPlot);
                } else {
                    // If not, just append the new plot
                    container.innerHTML = ''; // Clear container first
                    container.appendChild(plot);
                }
            } else {
                // Create new plot
                container.innerHTML = ''; // Clear container first
                container.appendChild(plot);
            }

            this.plots.set(containerId, plot);
        } catch (error) {
            console.error("Error creating/updating metrics plot:", error);
            // Fallback to a simple display if plot creation fails
            container.innerHTML = `<div class="plot-error">Error creating plot: ${error.message}</div>`;
        }
    }

    createHistoryPlot(history, metricName) {
        if (!history || history.length === 0) {
            return '<div class="empty-plot">No historical data available</div>';
        }

        const plotId = `history-plot-${Math.random().toString(36).substr(2, 9)}`;
        const plotDiv = document.createElement('div');
        plotDiv.className = 'history-plot';
        plotDiv.id = plotId;
        plotDiv.dataset.history = JSON.stringify(history);
        plotDiv.dataset.metricName = metricName;

        const plot = this.createOrUpdateHistoryPlot(history, metricName, null, plotId);
        if (plot) {
            plotDiv.appendChild(plot);
        }

        return plotDiv.outerHTML;
    }

    createOrUpdateHistoryPlot(history, metricName, width, plotId) {
        const data = history.map(point => ({
            value: point[metricName],
            timestamp: new Date(point.timestamp)
        }));

        const plotWidth = width || (this.detailsPanel.clientWidth - 30);

        const plotConfig = {
            style: {
                background: "transparent",
                color: "currentColor",
                fontSize: "12px",
                fontFamily: "Arial, sans-serif",
                ".plot-tooltip": {
                    background: "#333",
                    color: "white",
                    border: "1px solid #555"
                }
            },
            width: plotWidth,
            height: 200,
            marginLeft: 40,
            marginRight: 20,
            marginTop: 20,
            marginBottom: 30,
            y: {
                label: metricName.charAt(0).toUpperCase() + metricName.slice(1) + " (%)",
                domain: [0, 100],
                grid: true
            },
            x: {
                label: "Time",
                type: "time",
                tickFormat: "%H:%M"
            },
            marks: [
                Plot.ruleY([0, 25, 50, 75, 100], {
                    stroke: "#ddd",
                    strokeDasharray: "4,4"
                }),
                Plot.line(data, {
                    x: "timestamp",
                    y: "value",
                    stroke: "#2196f3",
                    strokeWidth: 2,
                    tip: true,
                    title: d => `Value: ${d.value.toFixed(2)}%\nTime: ${d.timestamp.toLocaleTimeString()}`
                }),
                Plot.dot(data, {
                    x: "timestamp",
                    y: "value",
                    fill: "#2196f3",
                    r: 3,
                    tip: true,
                    title: d => `Value: ${d.value.toFixed(2)}%\nTime: ${d.timestamp.toLocaleTimeString()}`
                })
            ]
        };

        try {
            // Create the new plot
            const plot = Plot.plot(plotConfig);

            if (this.plots.has(plotId)) {
                // Update existing plot
                const container = document.getElementById(plotId);
                if (!container) {
                    console.warn(`Container with ID ${plotId} not found`);
                    return plot;
                }

                const existingPlot = this.plots.get(plotId);
                // Check if the existing plot is still in the DOM
                if (existingPlot.parentNode === container) {
                    container.replaceChild(plot, existingPlot);
                } else {
                    // If not, just append the new plot
                    container.innerHTML = ''; // Clear container first
                    container.appendChild(plot);
                }
                this.plots.set(plotId, plot);
                return plot;
            } else {
                // Create new plot
                this.plots.set(plotId, plot);
                return plot;
            }
        } catch (error) {
            console.error("Error creating/updating history plot:", error);
            // Return a fallback element if plot creation fails
            const errorDiv = document.createElement('div');
            errorDiv.className = 'plot-error';
            errorDiv.textContent = `Error creating plot: ${error.message}`;
            return errorDiv;
        }
    }

    updateNetworkOverview(network) {
        this.currentNetwork = network;
        const stats = this.statsManager.calculateNetworkStats(network);

        this.detailsPanel.innerHTML = `
            <div class="detail-card">
                <h3>Network Overview</h3>
                <div class="card-content">
                    <table>
                        <tr>
                            <td>Network ID:</td>
                            <td>${network.metadata?.id || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td>Total Nodes:</td>
                            <td>${stats.totalNodes} (${stats.clusterNodes} clusters, ${stats.leafNodes} leaves)</td>
                        </tr>
                        <tr>
                            <td>Total Links:</td>
                            <td>${stats.totalLinks}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="detail-card">
                <h3>Allocation Summary</h3>
                <div class="card-content">
                    <table>
                        <tr>
                            <td>Avg Node Allocation:</td>
                            <td>${stats.avgAllocation.nodes.toFixed(2)}%</td>
                        </tr>
                        <tr>
                            <td>Max Node Allocation:</td>
                            <td>${stats.maxAllocation.nodes.toFixed(2)}%</td>
                        </tr>
                        <tr>
                            <td>Avg Link Allocation:</td>
                            <td>${stats.avgAllocation.links.toFixed(2)}%</td>
                        </tr>
                        <tr>
                            <td>Max Link Allocation:</td>
                            <td>${stats.maxAllocation.links.toFixed(2)}%</td>
                        </tr>
                    </table>
                </div>
            </div>

            ${this.renderCriticalResources(stats.criticalResources)}

            <div class="detail-card">
                <h3>Metric Distribution</h3>
                <div class="card-content">
                    <div id="metrics-plot" class="history-plot"></div>
                </div>
            </div>
        `;

        // Create the metrics plot
        setTimeout(() => {
            this.createOrUpdateMetricsPlot(network, 'metrics-plot');
        }, 0);
    }

    updateNodeDetails(node) {
        const metrics = node.metrics?.current || {};
        const history = node.metrics?.history || [];
        const metricName = Object.keys(metrics).find(key => key !== 'capacity') || 'allocation';
        const metricTitle = metricName.charAt(0).toUpperCase() + metricName.slice(1);

        this.detailsPanel.innerHTML = `
            <div class="detail-card">
                <h3>Node Information</h3>
                <div class="card-content">
                    <table>
                        <tr>
                            <td>ID:</td>
                            <td>${node.id}</td>
                        </tr>
                        <tr>
                            <td>Type:</td>
                            <td>${node.type}</td>
                        </tr>
                        ${Object.entries(metrics).map(([key, value]) => `
                            <tr>
                                <td>${key.charAt(0).toUpperCase() + key.slice(1)}:</td>
                                <td>${typeof value === "number" ? value.toFixed(2) + "%" : value}</td>
                            </tr>
                        `).join('')}
                        ${node.type === "cluster" ? `
                            <tr>
                                <td>Child Network:</td>
                                <td>${node.childNetwork || "N/A"}</td>
                            </tr>
                        ` : ""}
                    </table>
                </div>
            </div>

            ${history.length > 0 ? `
                <div class="detail-card">
                    <h3>${metricTitle} History</h3>
                    <div class="card-content">
                        ${this.createHistoryPlot(history, metricName)}
                    </div>
                </div>
            ` : ""}
        `;
    }

    updateLinkDetails(link) {
        const metrics = link.metrics?.current || {};
        const history = link.metrics?.history || [];
        const metricName = Object.keys(metrics).find(key => key !== 'capacity') || 'allocation';
        const metricTitle = metricName.charAt(0).toUpperCase() + metricName.slice(1);

        this.detailsPanel.innerHTML = `
            <div class="detail-card">
                <h3>Link Information</h3>
                <div class="card-content">
                    <table>
                        <tr>
                            <td>Source:</td>
                            <td>${link.source}</td>
                        </tr>
                        <tr>
                            <td>Target:</td>
                            <td>${link.target}</td>
                        </tr>
                        ${Object.entries(metrics).map(([key, value]) => `
                            <tr>
                                <td>${key.charAt(0).toUpperCase() + key.slice(1)}:</td>
                                <td>${typeof value === "number" ? value.toFixed(2) + "%" : value}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            </div>

            ${history.length > 0 ? `
                <div class="detail-card">
                    <h3>${metricTitle} History</h3>
                    <div class="card-content">
                        ${this.createHistoryPlot(history, metricName)}
                    </div>
                </div>
            ` : ""}
        `;
    }

    renderCriticalResources(criticalResources) {
        if (criticalResources.nodes.length === 0 && criticalResources.links.length === 0) {
            return "";
        }

        return `
            <div class="detail-card">
                <h3>Critical Resources (>75% allocation)</h3>
                <div class="card-content">
                    ${criticalResources.nodes.length > 0 ? `
                        <div class="critical-elements">
                            <strong>Nodes:</strong>
                            <ul>
                                ${criticalResources.nodes.map(node => `<li>${node}</li>`).join("")}
                            </ul>
                        </div>
                    ` : ""}
                    ${criticalResources.links.length > 0 ? `
                        <div class="critical-elements">
                            <strong>Links:</strong>
                            <ul>
                                ${criticalResources.links.map(link => `<li>${link}</li>`).join("")}
                            </ul>
                        </div>
                    ` : ""}
                </div>
            </div>
        `;
    }

}
