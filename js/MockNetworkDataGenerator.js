class MockNetworkDataGenerator {
    constructor(baseNetwork, options = {}) {
        this.baseNetwork = baseNetwork;
        this.options = {
            updateInterval: 5000,
            maxVariation: 10,
            alertThresholds: {
                highAllocation: 75,
                rapidIncrease: 15,
                degradedPerformance: 80
            },
            ...options
        };
    }

    generateUpdate() {
        const changes = {
            nodes: {},
            links: {}
        };

        // Update random subset of nodes
        this.baseNetwork.nodes.forEach(node => {
            if (Math.random() < 0.3) { // 30% chance of update
                const currentAllocation = node.metrics.current.allocation;
                const variation = (Math.random() * 2 - 1) * this.options.maxVariation;
                const newAllocation = Math.max(0, Math.min(100, currentAllocation + variation));

                changes.nodes[node.id] = {
                    allocation: newAllocation,
                    alerts: this.generateAlerts(currentAllocation, newAllocation)
                };
            }
        });

        // Update random subset of links
        this.baseNetwork.links.forEach(link => {
            if (Math.random() < 0.3) { // 30% chance of update
                const currentAllocation = link.metrics.current.allocation;
                const variation = (Math.random() * 2 - 1) * this.options.maxVariation;
                const newAllocation = Math.max(0, Math.min(100, currentAllocation + variation));

                const linkId = `${link.source}->${link.target}`;
                changes.links[linkId] = {
                    allocation: newAllocation,
                    alerts: this.generateAlerts(currentAllocation, newAllocation)
                };
            }
        });

        return {
            timestamp: new Date().toISOString(),
            changes
        };
    }

    generateAlerts(oldValue, newValue) {
        const alerts = [];
        const { alertThresholds } = this.options;

        // Check for high allocation
        if (newValue > alertThresholds.highAllocation) {
            alerts.push({
                type: 'high_allocation',
                threshold: alertThresholds.highAllocation,
                timestamp: new Date().toISOString()
            });
        }

        // Check for rapid increase
        if (newValue - oldValue > alertThresholds.rapidIncrease) {
            alerts.push({
                type: 'rapid_increase',
                threshold: alertThresholds.rapidIncrease,
                timestamp: new Date().toISOString()
            });
        }

        // Check for degraded performance
        if (newValue > alertThresholds.degradedPerformance) {
            alerts.push({
                type: 'degraded_performance',
                threshold: alertThresholds.degradedPerformance,
                timestamp: new Date().toISOString()
            });
        }

        return alerts;
    }
}

// Mock implementation of NetworkVisualizer's fetchNetworkUpdates
NetworkVisualizer.prototype.fetchNetworkUpdates = function(networkId) {
    const network = this.dataCache.get(networkId);
    if (!network || !this.mockDataGenerator) {
        this.mockDataGenerator = new MockNetworkDataGenerator(network);
    }
    return Promise.resolve(this.mockDataGenerator.generateUpdate());
};
