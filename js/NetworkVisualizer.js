import { NetworkVisualizerCore } from "./network/NetworkVisualizerCore.js";

export class NetworkVisualizer extends NetworkVisualizerCore {
    constructor(containerId, config = {}) {
        super(containerId, config);
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

    // Public API methods
    getNetworkPath() {
        return this.pathManager.getCurrentPath();
    }

    getCurrentMetric() {
        return this.metricLegendManager.getCurrentMetric();
    }

    getMetricRanges() {
        return this.metricLegendManager.getLegendRanges();
    }

    getCurrentTheme() {
        return this.themeManager.getCurrentTheme();
    }

    getCriticalResources() {
        return this.statsManager.getCriticalResources();
    }

    getAverageAllocations() {
        return this.statsManager.getAverageAllocations();
    }

    getMaxAllocations() {
        return this.statsManager.getMaxAllocations();
    }

    getNodeCount(type) {
        return this.statsManager.getNodeCount(type);
    }

    getLinkCount() {
        return this.statsManager.getLinkCount();
    }

    hasHighUtilization() {
        return this.statsManager.hasHighUtilization();
    }
}
