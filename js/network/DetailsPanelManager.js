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
        return `
            <div class="history-section">
                <h4>Metric History</h4>
                <div class="history-entries">
                    ${history.map(entry => `
                        <div class="history-entry">
                            <span class="timestamp">${new Date(entry.timestamp).toLocaleTimeString()}</span>
                            ${this.renderMetrics(entry.metrics)}
                        </div>
                    `).join("")}
                </div>
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
