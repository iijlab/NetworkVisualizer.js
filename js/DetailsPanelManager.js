class DetailsPanelManager {
    constructor(panelElement, config) {
        this.panel = panelElement;
        this.config = config;
        this.contentElement = this.panel.querySelector('.details-content');
        this.setupLegend();
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
                        <td>${stats.avgMetric.nodes.toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Max Node ${metricTitle}:</td>
                        <td>${stats.maxMetric.nodes.toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Avg Link ${metricTitle}:</td>
                        <td>${stats.avgMetric.links.toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Max Link ${metricTitle}:</td>
                        <td>${stats.maxMetric.links.toFixed(1)}%</td>
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
                        <td>${node.metrics.current[metricName]}%</td>
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
                <h3>Cluster ${metricTitle} Summary</h3>
                <table>
                    <tr>
                        <td>Avg Node ${metricTitle}:</td>
                        <td>${stats.avgMetric.nodes.toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Max Node ${metricTitle}:</td>
                        <td>${stats.maxMetric.nodes.toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Avg Link ${metricTitle}:</td>
                        <td>${stats.avgMetric.links.toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Max Link ${metricTitle}:</td>
                        <td>${stats.maxMetric.links.toFixed(1)}%</td>
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
                        <td>${node.metrics.current[metricName]}%</td>
                    </tr>
                </table>
            </div>
            <div class="detail-section">
                <h3>Historical ${metricTitle}</h3>
                <div class="chart-container">
                    [Historical ${metricTitle.toLowerCase()} chart placeholder]
                </div>
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
                        <td>${link.metrics.current[metricName]}%</td>
                    </tr>
                    <tr>
                        <td>Capacity:</td>
                        <td>${link.metrics.current.capacity}</td>
                    </tr>
                </table>
            </div>
            <div class="detail-section">
                <h3>${metricTitle} History</h3>
                <div class="chart-container">
                    [${metricTitle} history chart placeholder]
                </div>
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