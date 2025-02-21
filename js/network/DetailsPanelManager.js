export class DetailsPanelManager {
    constructor(detailsPanel, statsManager) {
        this.detailsPanel = detailsPanel;
        this.statsManager = statsManager;
    }

    updateNetworkOverview(network) {
        const stats = this.statsManager.calculateNetworkStats(network);

        this.detailsPanel.innerHTML = `
            <h3>Network Overview</h3>
            <div class="details-content">
                <div class="stats-section">
                    <h4>Network Statistics</h4>
                    <p>Total Nodes: ${stats.totalNodes}</p>
                    <p>Cluster Nodes: ${stats.clusterNodes}</p>
                    <p>Leaf Nodes: ${stats.leafNodes}</p>
                    <p>Total Links: ${stats.totalLinks}</p>
                </div>

                <div class="allocation-section">
                    <h4>Allocation Statistics</h4>
                    <div class="allocation-stats">
                        <div class="stat-group">
                            <h5>Nodes</h5>
                            <p>Average: ${stats.avgAllocation.nodes.toFixed(1)}%</p>
                            <p>Maximum: ${stats.maxAllocation.nodes.toFixed(1)}%</p>
                        </div>
                        <div class="stat-group">
                            <h5>Links</h5>
                            <p>Average: ${stats.avgAllocation.links.toFixed(1)}%</p>
                            <p>Maximum: ${stats.maxAllocation.links.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>

                ${this.renderCriticalResources(stats.criticalResources)}
            </div>
        `;
    }

    updateNodeDetails(node) {
        const metrics = node.metrics?.current || {};
        const history = node.metrics?.history || [];

        this.detailsPanel.innerHTML = `
            <h3>Node Details</h3>
            <div class="details-content">
                <div class="basic-info">
                    <p><strong>ID:</strong> ${node.id}</p>
                    <p><strong>Type:</strong> ${node.type}</p>
                </div>

                <div class="metrics-section">
                    <h4>Current Metrics</h4>
                    ${this.renderMetrics(metrics)}
                </div>

                ${history.length > 0 ? this.renderHistory(history) : ""}

                ${node.type === "cluster" ? `
                    <div class="cluster-info">
                        <p><strong>Child Network:</strong> ${node.childNetwork || "N/A"}</p>
                    </div>
                ` : ""}
            </div>
        `;
    }

    updateLinkDetails(link) {
        const metrics = link.metrics?.current || {};
        const history = link.metrics?.history || [];

        this.detailsPanel.innerHTML = `
            <h3>Link Details</h3>
            <div class="details-content">
                <div class="basic-info">
                    <p><strong>Source:</strong> ${link.source}</p>
                    <p><strong>Target:</strong> ${link.target}</p>
                </div>

                <div class="metrics-section">
                    <h4>Current Metrics</h4>
                    ${this.renderMetrics(metrics)}
                </div>

                ${history.length > 0 ? this.renderHistory(history) : ""}
            </div>
        `;
    }

    renderMetrics(metrics) {
        return Object.entries(metrics)
            .map(([key, value]) => `
                <p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
                   ${typeof value === "number" ? value.toFixed(1) + "%" : value}
                </p>
            `)
            .join("");
    }

    renderHistory(history) {
        // Create plot data
        const plotData = history.map(entry => ({
            timestamp: new Date(entry.timestamp),
            ...entry.metrics
        }));

        // Get metric names from the first entry
        const metricNames = Object.keys(history[0].metrics);

        // Create line plot for each metric
        const plots = metricNames.map(metric => {
            const plotContainer = document.createElement('div');
            plotContainer.className = 'history-plot';

            // Create a wrapper for the plot
            const plotWrapper = document.createElement('div');
            plotWrapper.style.width = '100%';
            plotWrapper.style.height = '200px';
            plotContainer.appendChild(plotWrapper);

            const plot = Plot.plot({
                width: 800, // Will be resized by CSS
                height: 200,
                marginLeft: 60,
                marginRight: 30,
                marginTop: 20,
                marginBottom: 40,
                style: {
                    background: "transparent",
                    overflow: "visible"
                },
                x: {
                    type: "time",
                    label: "Time",
                    labelOffset: 30,
                    tickRotate: -20
                },
                y: {
                    label: `${metric} (%)`,
                    domain: [0, 100],
                    grid: true
                },
                marks: [
                    Plot.ruleY([0, 25, 50, 75, 100]),
                    Plot.line(plotData, {
                        x: "timestamp",
                        y: d => d[metric],
                        stroke: "#2196F3",
                        strokeWidth: 2,
                        curve: "monotone"
                    }),
                    Plot.dot(plotData, {
                        x: "timestamp",
                        y: d => d[metric],
                        fill: "#2196F3",
                        r: 3
                    })
                ]
            });

            plotWrapper.appendChild(plot);
            return plotContainer.outerHTML;
        });

        return `
            <div class="history-section">
                <h4>Metric History</h4>
                ${plots.join('')}
            </div>
        `;
    }

    renderCriticalResources(criticalResources) {
        if (criticalResources.nodes.length === 0 && criticalResources.links.length === 0) {
            return "";
        }

        return `
            <div class="critical-resources">
                <h4>Critical Resources (>75% allocation)</h4>
                ${criticalResources.nodes.length > 0 ? `
                    <div class="critical-nodes">
                        <h5>Nodes</h5>
                        <ul>
                            ${criticalResources.nodes.map(node => `<li>${node}</li>`).join("")}
                        </ul>
                    </div>
                ` : ""}
                ${criticalResources.links.length > 0 ? `
                    <div class="critical-links">
                        <h5>Links</h5>
                        <ul>
                            ${criticalResources.links.map(link => `<li>${link}</li>`).join("")}
                        </ul>
                    </div>
                ` : ""}
            </div>
        `;
    }

}
