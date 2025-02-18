class DetailsPanelManager {
    // Initialization & Setup
    constructor(panelElement, config) {
        this.panel = panelElement;
        this.config = config;
        this.contentElement = this.panel.querySelector('.details-container');
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

    // Plot Management
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
        };

        if (this.plots.has(containerId)) {
            // Update existing plot
            const existingPlot = this.plots.get(containerId);
            container.replaceChild(Plot.plot({ ...plotConfig }), existingPlot);
            this.plots.set(containerId, container.lastChild);
        } else {
            // Create new plot
            const plot = Plot.plot(plotConfig);
            container.appendChild(plot);
            this.plots.set(containerId, plot);
        }
    }

    updateActivePlot() {
        // Update history plots
        const plotContainers = this.panel.querySelectorAll('.history-plot');
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

        const plotWidth = width || (this.panel.clientWidth - 30);

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

        if (this.plots.has(plotId)) {
            // Update existing plot
            const container = document.getElementById(plotId);
            const existingPlot = this.plots.get(plotId);
            container.replaceChild(Plot.plot({ ...plotConfig }), existingPlot);
            this.plots.set(plotId, container.lastChild);
            return container.lastChild;
        } else {
            // Create new plot
            const plot = Plot.plot(plotConfig);
            this.plots.set(plotId, plot);
            return plot;
        }
    }

    // Panel Content Updates
    initializeDetailSections() {
        // Create all sections with unique IDs
        this.contentElement.innerHTML = `
            <div id="network-overview" class="detail-section"></div>
            <div id="metric-summary" class="detail-section"></div>
            <div id="critical-metrics" class="detail-section"></div>
            <div id="metric-distribution" class="detail-section">
                <div id="metrics-plot" style="width: 100%; margin-top: 20px;"></div>
            </div>
        `;
    }

    updateNetworkOverview(network) {
        this.currentNetwork = network;
        const stats = NetworkStats.calculate(network);
        const metricName = this.config.visualization.metric;
        const metricTitle = metricName.charAt(0).toUpperCase() + metricName.slice(1);

        // Initialize sections if they don't exist
        if (!document.getElementById('network-overview')) {
            this.initializeDetailSections();
        }

        // Update each section individually
        const overviewSection = document.getElementById('network-overview');
        overviewSection.innerHTML = `
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
        `;

        const summarySection = document.getElementById('metric-summary');
        summarySection.innerHTML = `
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
        `;

        const criticalSection = document.getElementById('critical-metrics');
        criticalSection.innerHTML = this.renderCriticalMetrics(stats);

        // Update the plot
        const plotContainer = document.getElementById('metrics-plot');
        this.createOrUpdateMetricsPlot(network, 'metrics-plot');
    }

    initializeNodeDetailSections() {
        this.contentElement.innerHTML = `
            <div id="node-info" class="detail-section"></div>
            <div id="metric-history" class="detail-section"></div>
            <div id="cluster-summary" class="detail-section"></div>
            <div id="cluster-critical-metrics" class="detail-section"></div>
        `;
    }

    updateNodeDetails(node, clusterNetwork = null) {
        // Initialize sections if they don't exist
        if (!document.getElementById('node-info')) {
            this.initializeNodeDetailSections();
        }

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

        const nodeInfo = document.getElementById('node-info');
        nodeInfo.innerHTML = `
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
        `;

        const historySection = document.getElementById('metric-history');
        if (!historySection.querySelector('.history-plot')) {
            historySection.innerHTML = `
                <h3>${metricTitle} History</h3>
                ${this.createHistoryPlot(node.metrics.history, metricName)}
            `;
        } else {
            const plotContainer = historySection.querySelector('.history-plot');
            this.createOrUpdateHistoryPlot(node.metrics.history, metricName, null, plotContainer.id);
        }

        const summarySection = document.getElementById('cluster-summary');
        summarySection.innerHTML = `
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
        `;

        const criticalSection = document.getElementById('cluster-critical-metrics');
        criticalSection.innerHTML = this.renderCriticalMetrics(stats);
    }

    updateLeafNodeDetails(node) {
        const metricName = this.config.visualization.metric;
        const metricTitle = metricName.charAt(0).toUpperCase() + metricName.slice(1);

        const nodeInfo = document.getElementById('node-info');
        nodeInfo.innerHTML = `
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
        `;

        const historySection = document.getElementById('metric-history');
        historySection.innerHTML = `
            <h3>${metricTitle} History</h3>
            ${this.createHistoryPlot(node.metrics.history, metricName)}
        `;

        // Clear unused sections
        document.getElementById('cluster-summary').innerHTML = '';
        document.getElementById('cluster-critical-metrics').innerHTML = '';
    }

    initializeLinkDetailSections() {
        this.contentElement.innerHTML = `
            <div id="link-info" class="detail-section"></div>
            <div id="link-history" class="detail-section"></div>
        `;
    }

    updateLinkDetails(link) {
        // Initialize sections if they don't exist
        if (!document.getElementById('link-info')) {
            this.initializeLinkDetailSections();
        }

        const metricName = this.config.visualization.metric;
        const metricTitle = metricName.charAt(0).toUpperCase() + metricName.slice(1);

        const linkInfo = document.getElementById('link-info');
        linkInfo.innerHTML = `
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
        `;

        const historySection = document.getElementById('link-history');
        if (!historySection.querySelector('.history-plot')) {
            historySection.innerHTML = `
                <h3>${metricTitle} History</h3>
                ${this.createHistoryPlot(link.metrics.history, metricName)}
            `;
        } else {
            const plotContainer = historySection.querySelector('.history-plot');
            this.createOrUpdateHistoryPlot(link.metrics.history, metricName, null, plotContainer.id);
        }
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
