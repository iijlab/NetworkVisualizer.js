class DetailsPanelManager {
    // Initialization & Setup
    constructor(panelElement, config) {
        this.panel = panelElement;
        this.config = config;
        this.contentElement = this.panel.querySelector('.details-content');
        this.setupLegend();
        this.setupResponsiveUpdates();
    }

    setupLegend() {
        if (this.panel.querySelector('.details-legend')) {
            return;
        }

        const legendDiv = document.createElement('div');
        legendDiv.className = 'details-legend';

        const metricName = this.config.visualization.metric;
        const metricTitle = metricName.charAt(0).toUpperCase() + metricName.slice(1);

        legendDiv.innerHTML = `
            <h3 style="margin-bottom: 10px; font-weight: 600;">${metricTitle}</h3>
            <div class="legend-items">
                <div class="legend-item">
                    <div class="legend-color" style="background: #006994"></div>
                    <span>0%</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #4caf50"></div>
                    <span>0-45%</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #ffc107"></div>
                    <span>45-55%</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #ff9800"></div>
                    <span>55-75%</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #f44336"></div>
                    <span>>75%</span>
                </div>
            </div>
        `;

        this.contentElement.insertAdjacentElement('afterend', legendDiv);
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

    // Plot Management
    createMetricsPlot(network, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Prepare data
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

        const plot = Plot.plot({
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
                Plot.text(data.filter(d => d.timeIndex === data[0].timeIndex), {
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
        });

        container.appendChild(plot);
    }

    updateActivePlot() {
        const plotContainers = this.panel.querySelectorAll('.history-plot');
        plotContainers.forEach(container => {
            if (container.firstChild) {
                const existingPlot = container.querySelector('figure');
                if (existingPlot) {
                    const width = container.clientWidth - 30;
                    const metricName = container.dataset.metricName;
                    const history = JSON.parse(container.dataset.history);
                    const plot = this.createHistoryPlotElement(history, metricName, width);
                    if (plot) {
                        container.replaceChild(plot, existingPlot);
                    }
                }
            }
        });

        // Also update metrics plot if it exists
        const metricsPlot = document.getElementById('metrics-plot');
        if (metricsPlot && this.currentNetwork) {
            metricsPlot.innerHTML = '';
            this.createMetricsPlot(this.currentNetwork, 'metrics-plot');
        }
    }

    createHistoryPlot(history, metricName) {
        if (!history || history.length === 0) {
            return '<div class="empty-plot">No historical data available</div>';
        }

        const plotDiv = document.createElement('div');
        plotDiv.className = 'history-plot';
        plotDiv.dataset.history = JSON.stringify(history);
        plotDiv.dataset.metricName = metricName;

        const plot = this.createHistoryPlotElement(history, metricName);
        if (plot) {
            plotDiv.appendChild(plot);
        }

        return plotDiv.outerHTML;
    }

    createHistoryPlotElement(history, metricName, width) {
        const data = history.map(point => ({
            value: point[metricName],
            timestamp: new Date(point.timestamp)
        }));

        const plotWidth = width || (this.panel.clientWidth - 30);

        return Plot.plot({
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
        });
    }

    // Panel Content Updates
    updateNetworkOverview(network) {
        this.currentNetwork = network;
        const stats = NetworkStats.calculate(network);
        const metricName = this.config.visualization.metric;
        const metricTitle = metricName.charAt(0).toUpperCase() + metricName.slice(1);

        this.contentElement.innerHTML = `
            <div class="detail-section">
                <h3>Network Overview</h3>
                <table>
                    <tr>
                        <td>Network ID:</td>
                        <td>${network.metadata.id}</td>
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
            <div class="detail-section">
                <h3>${metricTitle} Summary</h3>
                <table>
                    <tr>
                        <td>Avg Node ${metricTitle}:</td>
                        <td>${stats.avgMetric.nodes.toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>Max Node ${metricTitle}:</td>
                        <td>${stats.maxMetric.nodes.toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>Avg Link ${metricTitle}:</td>
                        <td>${stats.avgMetric.links.toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>Max Link ${metricTitle}:</td>
                        <td>${stats.maxMetric.links.toFixed(2)}%</td>
                    </tr>
                </table>
            </div>
            ${this.renderCriticalMetrics(stats)}
            <div class="detail-section">
                <h3>${metricTitle} Distribution</h3>
                <div id="metrics-plot" style="width: 100%; margin-top: 20px;"></div>
            </div>
        `;

        this.createMetricsPlot(network, 'metrics-plot');
    }

    updateNodeDetails(node, clusterNetwork = null) {
        if (node.type === 'cluster' && clusterNetwork) {
            this.updateClusterDetails(node, clusterNetwork);
        } else {
            this.updateLeafNodeDetails(node);
        }
    }

    updateClusterDetails(node, clusterNetwork) {
        const stats = NetworkStats.calculate(clusterNetwork);
        const metricName = this.config.visualization.metric;
        const metricTitle = metricName.charAt(0).toUpperCase() + metricName.slice(1);

        this.contentElement.innerHTML = `
            <div class="detail-section">
                <h3>Cluster Information</h3>
                <table>
                    <tr>
                        <td>Cluster ID:</td>
                        <td>${node.id}</td>
                    </tr>
                    <tr>
                        <td>Current ${metricTitle}:</td>
                        <td>${node.metrics.current[metricName].toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>Contained Nodes:</td>
                        <td>${stats.totalNodes} (${stats.clusterNodes} clusters, ${stats.leafNodes} leaves)</td>
                    </tr>
                    <tr>
                        <td>Internal Links:</td>
                        <td>${stats.totalLinks}</td>
                    </tr>
                </table>
            </div>
            <div class="detail-section">
                <h3>${metricTitle} History</h3>
                ${this.createHistoryPlot(node.metrics.history, metricName)}
            </div>
            <div class="detail-section">
                <h3>Cluster ${metricTitle} Summary</h3>
                <table>
                    <tr>
                        <td>Avg Node ${metricTitle}:</td>
                        <td>${stats.avgMetric.nodes.toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>Max Node ${metricTitle}:</td>
                        <td>${stats.maxMetric.nodes.toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>Avg Link ${metricTitle}:</td>
                        <td>${stats.avgMetric.links.toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>Max Link ${metricTitle}:</td>
                        <td>${stats.maxMetric.links.toFixed(2)}%</td>
                    </tr>
                </table>
            </div>
            ${this.renderCriticalMetrics(stats)}
        `;
    }

    updateLeafNodeDetails(node) {
        const metricName = this.config.visualization.metric;
        const metricTitle = metricName.charAt(0).toUpperCase() + metricName.slice(1);

        this.contentElement.innerHTML = `
            <div class="detail-section">
                <h3>Node Information</h3>
                <table>
                    <tr>
                        <td>ID:</td>
                        <td>${node.id}</td>
                    </tr>
                    <tr>
                        <td>Type:</td>
                        <td>${node.type}</td>
                    </tr>
                    <tr>
                        <td>${metricTitle}:</td>
                        <td>${node.metrics.current[metricName].toFixed(2)}%</td>
                    </tr>
                </table>
            </div>
            <div class="detail-section">
                <h3>${metricTitle} History</h3>
                ${this.createHistoryPlot(node.metrics.history, metricName)}
            </div>
        `;
    }

    updateLinkDetails(link) {
        const metricName = this.config.visualization.metric;
        const metricTitle = metricName.charAt(0).toUpperCase() + metricName.slice(1);

        this.contentElement.innerHTML = `
            <div class="detail-section">
                <h3>Link Information</h3>
                <table>
                    <tr>
                        <td>Source:</td>
                        <td>${link.source}</td>
                    </tr>
                    <tr>
                        <td>Target:</td>
                        <td>${link.target}</td>
                    </tr>
                    <tr>
                        <td>${metricTitle}:</td>
                        <td>${link.metrics.current[metricName].toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>Capacity:</td>
                        <td>${link.metrics.current.capacity}</td>
                    </tr>
                </table>
            </div>
            <div class="detail-section">
                <h3>${metricTitle} History</h3>
                ${this.createHistoryPlot(link.metrics.history, metricName)}
            </div>
        `;
    }

    // Helper Methods
    renderCriticalMetrics(stats) {
        if (!stats.criticalMetrics.nodes.length && !stats.criticalMetrics.links.length) {
            return '';
        }

        const metricTitle = this.config.visualization.metric.charAt(0).toUpperCase() +
            this.config.visualization.metric.slice(1);

        return `
            <div class="detail-section">
                <h3>Critical ${metricTitle} Elements (>75%)</h3>
                ${stats.criticalMetrics.nodes.length ? `
                    <p><strong>Nodes:</strong> ${stats.criticalMetrics.nodes.join(', ')}</p>
                ` : ''}
                ${stats.criticalMetrics.links.length ? `
                    <p><strong>Links:</strong> ${stats.criticalMetrics.links.join(', ')}</p>
                ` : ''}
            </div>
        `;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DetailsPanelManager;
} else {
    window.DetailsPanelManager = DetailsPanelManager;
}
