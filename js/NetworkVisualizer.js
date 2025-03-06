import { NetworkVisualizerCore } from "./network/NetworkVisualizerCore.js";

export class NetworkVisualizer extends NetworkVisualizerCore {
    constructor(containerId, config = {}) {
        super(containerId, config);

        // Listen for color scale changes
        document.addEventListener('colorScaleChanged', (event) => {
            console.log('Color scale changed event received:', event.detail);
            this.handleColorScaleChange(event.detail);
        });
    }

    handleColorScaleChange(detail) {
        // Update the config
        if (detail.config && detail.metric) {
            this.config = detail.config;

            // Update the color scale mapping
            this.updateColorScaleMapping();

            // Re-render the visualization with the new colors
            this.updateVisualization();
        }
    }

    updateColorScaleMapping() {
        const metric = this.config.visualization.metric;
        const metricConfig = this.config.visualization.metrics?.[metric] || {};
        const metricType = metricConfig.type || 'range';

        console.log(`Updating color scale mapping for metric ${metric} with type ${metricType}`);
    }

    updateVisualization() {
        // Re-render all nodes and links with the updated color scale
        if (!this.currentNetwork) {
            console.warn('No current network to update visualization');
            return;
        }

        console.log('Updating visualization with new color scale');
        this.createVisualization(this.currentNetwork);
    }

    refreshCurrentView() {
        // Get the current network ID
        const currentNetworkId = this.currentNetwork?.metadata?.id || "root";

        // Apply the current color scale without reloading the network data
        this.updateColorScaleMapping();
        this.updateVisualization();

        console.log(`Refreshed view for network ${currentNetworkId} with updated color scales`);
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
