export class DetailsPanelManager {
    constructor(detailsPanel, statsManager) {
        this.detailsPanel = detailsPanel;
        this.statsManager = statsManager;
        this.contentElement = this.detailsPanel.querySelector('.details-container');
        if (!this.contentElement) {
            this.contentElement = document.createElement('div');
            this.contentElement.className = 'details-container';
            this.detailsPanel.appendChild(this.contentElement);
        }
        this.plots = new Map(); // Store plot objects
        this.setupResponsiveUpdates();
        this.setupMutationObserver();
    }

    setupMutationObserver() {
        // Create a MutationObserver to watch for DOM changes
        this.observer = new MutationObserver((mutations) => {
            let shouldTriggerResize = false;

            // Check if any plot containers were added
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            if (node.id === 'metrics-plot' ||
                                node.classList?.contains('history-plot') ||
                                node.querySelector?.('#metrics-plot') ||
                                node.querySelector?.('.history-plot')) {
                                shouldTriggerResize = true;
                            }
                        }
                    });
                }
            });

            // If plot containers were added, trigger a resize after a short delay
            if (shouldTriggerResize) {
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 100);
            }
        });

        // Start observing the details panel for changes
        this.observer.observe(this.detailsPanel, {
            childList: true,
            subtree: true
        });
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
        const metricName = 'allocation'; // Default to allocation

        // Add node metrics history
        network.nodes.forEach(node => {
            node.metrics.history.forEach((point, index) => {
                data.push({
                    timestamp: new Date(point.timestamp),
                    id: node.id,
                    type: `${node.type} node`,
                    allocation: point[metricName] || 0,
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
                    allocation: point[metricName] || 0,
                    timeIndex: index
                });
            });
        });

        return data;
    }

    createOrUpdateMetricsPlot(network, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Force container to have a width if it doesn't already
        if (container.clientWidth <= 0) {
            container.style.width = '100%';
        }

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

        // Ensure we have a valid width
        let plotWidth = width;
        if (!plotWidth || plotWidth <= 0) {
            plotWidth = this.detailsPanel.clientWidth - 30;
            if (plotWidth <= 0) {
                plotWidth = 500; // Fallback width if all else fails
            }
        }

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
        const stats = this.statsManager.calculateNetworkStats(network);
        const metricName = 'allocation'; // Default to allocation
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
        `;

        const summarySection = document.getElementById('metric-summary');
        summarySection.innerHTML = `
            <h3>${metricTitle} Summary</h3>
            <table>
                <tr>
                    <td>Avg Node ${metricTitle}:</td>
                    <td>${stats.avgAllocation.nodes.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Max Node ${metricTitle}:</td>
                    <td>${stats.maxAllocation.nodes.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Avg Link ${metricTitle}:</td>
                    <td>${stats.avgAllocation.links.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Max Link ${metricTitle}:</td>
                    <td>${stats.maxAllocation.links.toFixed(2)}%</td>
                </tr>
            </table>
        `;

        const criticalSection = document.getElementById('critical-metrics');
        criticalSection.innerHTML = this.renderCriticalMetrics(stats);

        // Update the plot
        const plotContainer = document.getElementById('metrics-plot');
        this.createOrUpdateMetricsPlot(network, 'metrics-plot');

        // Force a resize event to ensure plots render correctly
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
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
        const stats = this.statsManager.calculateNetworkStats(clusterNetwork);
        const metricName = 'allocation'; // Default to allocation
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
                    <td>${stats.avgAllocation.nodes.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Max Node ${metricTitle}:</td>
                    <td>${stats.maxAllocation.nodes.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Avg Link ${metricTitle}:</td>
                    <td>${stats.avgAllocation.links.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Max Link ${metricTitle}:</td>
                    <td>${stats.maxAllocation.links.toFixed(2)}%</td>
                </tr>
            </table>
        `;

        const criticalSection = document.getElementById('cluster-critical-metrics');
        criticalSection.innerHTML = this.renderCriticalMetrics(stats.criticalResources);

        // Force a resize event to ensure plots render correctly
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }

    updateLeafNodeDetails(node) {
        const metricName = 'allocation'; // Default to allocation
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

        // Force a resize event to ensure plots render correctly
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
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

        const metricName = 'allocation'; // Default to allocation
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

        // Force a resize event to ensure plots render correctly
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }

    // Helper Methods
    renderCriticalMetrics(stats) {
        if (!stats.criticalResources) {
            stats = { criticalResources: { nodes: [], links: [] } };
        } else if (!stats.nodes && !stats.links) {
            stats = { nodes: stats.nodes || [], links: stats.links || [] };
        }

        const criticalResources = stats.criticalResources || stats;

        if (criticalResources.nodes.length === 0 && criticalResources.links.length === 0) {
            return '';
        }

        const metricTitle = 'Allocation';

        return `
            <div class="detail-section">
                <h3>Critical ${metricTitle} Elements (>75%)</h3>
                ${criticalResources.nodes.length ? `
                    <p><strong>Nodes:</strong> ${criticalResources.nodes.join(', ')}</p>
                ` : ''}
                ${criticalResources.links.length ? `
                    <p><strong>Links:</strong> ${criticalResources.links.join(', ')}</p>
                ` : ''}
            </div>
        `;
    }
}
