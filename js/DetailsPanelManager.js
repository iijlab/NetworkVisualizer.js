class DetailsPanelManager {
    constructor(panelElement) {
        this.panel = panelElement;
        this.contentElement = this.panel.querySelector('.details-content');
        this.setupLegend();
    }

    setupLegend() {
        // First check if legend already exists to avoid duplicates
        if (this.panel.querySelector('.details-legend')) {
            return;
        }

        // Create the legend element
        const legendDiv = document.createElement('div');
        legendDiv.className = 'details-legend';
        legendDiv.innerHTML = `
            <h3 style="margin-bottom: 10px; font-weight: 600;">Resource Allocation</h3>
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

        // Make sure we append after the content element
        this.contentElement.insertAdjacentElement('afterend', legendDiv);

        // Debug log
        console.log('Legend added to panel:', this.panel.contains(legendDiv));
    }

    clearSelection() {
        if (this.onSelectionCleared) {
            this.onSelectionCleared();
        }
    }

    updateNetworkOverview(network) {
        const stats = NetworkStats.calculate(network);

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
                <h3>Resource Allocation Summary</h3>
                <table>
                    <tr>
                        <td>Avg Node Allocation:</td>
                        <td>${stats.avgAllocation.nodes.toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Max Node Allocation:</td>
                        <td>${stats.maxAllocation.nodes.toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Avg Link Allocation:</td>
                        <td>${stats.avgAllocation.links.toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Max Link Allocation:</td>
                        <td>${stats.maxAllocation.links.toFixed(1)}%</td>
                    </tr>
                </table>
            </div>
            ${this.renderCriticalResources(stats)}
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

        this.contentElement.innerHTML = `
            <div class="detail-section">
                <h3>Cluster Information</h3>
                <table>
                    <tr>
                        <td>Cluster ID:</td>
                        <td>${node.id}</td>
                    </tr>
                    <tr>
                        <td>Current Allocation:</td>
                        <td>${node.allocation}%</td>
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
                <h3>Cluster Resource Summary</h3>
                <table>
                    <tr>
                        <td>Avg Node Allocation:</td>
                        <td>${stats.avgAllocation.nodes.toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Max Node Allocation:</td>
                        <td>${stats.maxAllocation.nodes.toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Avg Link Allocation:</td>
                        <td>${stats.avgAllocation.links.toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>Max Link Allocation:</td>
                        <td>${stats.maxAllocation.links.toFixed(1)}%</td>
                    </tr>
                </table>
            </div>
            ${this.renderCriticalResources(stats)}
        `;
    }

    updateLeafNodeDetails(node) {
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
                        <td>Allocation:</td>
                        <td>${node.allocation}%</td>
                    </tr>
                </table>
            </div>
            <div class="detail-section">
                <h3>Historical Allocation</h3>
                <div class="chart-container">
                    [Historical allocation chart placeholder]
                </div>
            </div>
        `;
    }

    updateLinkDetails(link) {
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
                        <td>Allocation:</td>
                        <td>${link.allocation}%</td>
                    </tr>
                    <tr>
                        <td>Capacity:</td>
                        <td>${link.capacity}</td>
                    </tr>
                </table>
            </div>
            <div class="detail-section">
                <h3>Bandwidth Usage</h3>
                <div class="chart-container">
                    [Bandwidth usage chart placeholder]
                </div>
            </div>
            <div class="detail-section">
                <h3>Link Quality</h3>
                <div class="chart-container">
                    [Link quality metrics placeholder]
                </div>
            </div>
        `;
    }

    renderCriticalResources(stats) {
        if (!stats.criticalResources.nodes.length && !stats.criticalResources.links.length) {
            return '';
        }

        return `
            <div class="detail-section">
                <h3>Critical Resources (>75% allocated)</h3>
                ${stats.criticalResources.nodes.length ? `
                    <p><strong>Nodes:</strong> ${stats.criticalResources.nodes.join(', ')}</p>
                ` : ''}
                ${stats.criticalResources.links.length ? `
                    <p><strong>Links:</strong> ${stats.criticalResources.links.join(', ')}</p>
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