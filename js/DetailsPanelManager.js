class DetailsPanelManager {
    constructor(panelElement, config) {
        this.panel = panelElement;
        this.config = config;
        this.contentElement = this.panel.querySelector('.details-content');
        this.setupLegend();
        this.setupResizeHandle();
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

    setupResizeHandle() {
        // Create resize handle
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        this.panel.appendChild(handle);

        let startX, startWidth;
        let isResizing = false;
        let resizeTimeout;

        const startResize = (e) => {
            startX = e.clientX;
            startWidth = parseInt(document.defaultView.getComputedStyle(this.panel).width, 10);
            isResizing = true;
            this.panel.classList.add('dragging');
            document.addEventListener('mousemove', doResize);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault(); // Prevent text selection
        };

        const doResize = (e) => {
            if (!isResizing) return;

            const newWidth = startWidth - (e.clientX - startX);
            // Clamp width between min and max values
            const clampedWidth = Math.min(Math.max(newWidth, 250), 800);
            this.panel.style.width = `${clampedWidth}px`;

            // Throttle plot updates during resize
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.updateActivePlot();
            }, 50);
        };

        const stopResize = () => {
            isResizing = false;
            this.panel.classList.remove('dragging');
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
            this.updateActivePlot(); // Final update of plots
        };

        handle.addEventListener('mousedown', startResize);
    }

    updateActivePlot() {
        // Find all plot containers
        const plotContainers = this.panel.querySelectorAll('.history-plot');
        plotContainers.forEach(container => {
            if (container.firstChild) {
                // Get the current data and recreate the plot
                const existingPlot = container.querySelector('figure');
                if (existingPlot) {
                    const width = container.clientWidth - 30; // Account for padding
                    const metricName = container.dataset.metricName;
                    const history = JSON.parse(container.dataset.history);
                    const plot = this.createHistoryPlotElement(history, metricName, width);
                    if (plot) {
                        container.replaceChild(plot, existingPlot);
                    }
                }
            }
        });
    }

    createHistoryPlot(history, metricName) {
        if (!history || history.length === 0) {
            return '<div class="empty-plot">No historical data available</div>';
        }

        const plotDiv = document.createElement('div');
        plotDiv.className = 'history-plot';
        // Store data for resize updates
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

        // Use provided width or calculate from container
        const plotWidth = width || (this.panel.clientWidth - 60); // Account for padding

        return Plot.plot({
            style: {
                background: "transparent",
                color: "currentColor",
                fontSize: "12px",
                fontFamily: "Arial, sans-serif"
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
                    strokeWidth: 2
                }),
                Plot.dot(data, {
                    x: "timestamp",
                    y: "value",
                    fill: "#2196f3",
                    r: 3
                })
            ]
        });
    }

    updateNetworkOverview(network) {
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
        `;
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