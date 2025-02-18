import { NetworkVisualizerCore } from "./network/NetworkVisualizerCore.js";

export class NetworkVisualizer extends NetworkVisualizerCore {
    constructor(containerId, config = {}) {
        super(containerId, config);

        // Initialize MetricLegendManager
        const legendContent = document.querySelector(".metric-legend .legend-content");
        if (legendContent) {
            this.setupMetricLegend(legendContent);
        }
    }

    setupMetricLegend(legendContent) {
        const metricName = this.config.visualization.metric;
        const metricTitle = metricName.charAt(0).toUpperCase() + metricName.slice(1);
        const ranges = this.config.visualization.ranges;

        // Update the legend title
        const legendTitle = document.querySelector(".metric-legend h4");
        if (legendTitle) {
            legendTitle.textContent = `${metricTitle} Legend`;
        }

        // Clear existing content
        legendContent.innerHTML = "";

        // Create legend items
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
            legendContent.appendChild(legendItem);
        });
    }

    getCurrentNetwork() {
        return this.currentNetwork;
    }

    async fetchNetworkData(networkId) {
        // Check cache first
        if (this.dataCache.has(networkId)) {
            return this.dataCache.get(networkId);
        }

        try {
            const response = await fetch(`data/networks/${networkId}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Cache the data
            this.dataCache.set(networkId, data);

            return data;
        } catch (error) {
            console.error(`Error fetching network data for ${networkId}:`, error);
            throw error;
        }
    }

    async fetchNetworkUpdates(networkId) {
        // In a real implementation, this would fetch updates from a server
        // For now, we'll rely on the mock data generator if provided
        if (this.mockDataGenerator) {
            return this.mockDataGenerator.generateUpdate();
        }
        return null;
    }

    calculateNetworkStats(network) {
        const stats = {
            totalNodes: network.nodes.length,
            clusterNodes: network.nodes.filter(n => n.type === "cluster").length,
            leafNodes: network.nodes.filter(n => n.type === "leaf").length,
            totalLinks: network.links.length,
            avgAllocation: {
                nodes: 0,
                links: 0
            },
            maxAllocation: {
                nodes: 0,
                links: 0
            },
            criticalResources: {
                nodes: [],
                links: []
            }
        };

        // Calculate node statistics
        const nodeAllocations = network.nodes.map(node => node.metrics?.current?.allocation ?? 0);
        stats.avgAllocation.nodes = nodeAllocations.reduce((sum, val) => sum + val, 0) / stats.totalNodes;
        stats.maxAllocation.nodes = Math.max(...nodeAllocations);
        stats.criticalResources.nodes = network.nodes
            .filter(node => (node.metrics?.current?.allocation ?? 0) > 75)
            .map(node => node.id);

        // Calculate link statistics
        const linkAllocations = network.links.map(link => link.metrics?.current?.allocation ?? 0);
        stats.avgAllocation.links = linkAllocations.reduce((sum, val) => sum + val, 0) / stats.totalLinks;
        stats.maxAllocation.links = Math.max(...linkAllocations);
        stats.criticalResources.links = network.links
            .filter(link => (link.metrics?.current?.allocation ?? 0) > 75)
            .map(link => `${link.source}->${link.target}`);

        return stats;
    }
}
