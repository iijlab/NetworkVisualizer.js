/**
 * MockNetworkDataGenerator
 * Generates mock network metric updates following wave-like patterns for visualization testing.
 */
class MockNetworkDataGenerator {
    constructor(baseNetwork, options = {}) {
        this.networkGenerators = new Map();
        this.options = {
            updateInterval: 5000,
            maxVariation: 10,
            metricName: 'allocation',
            ranges: {
                warning: 75,
                critical: 90
            },
            ...options
        };

        // Initialize generator for root network
        this.initializeNetworkGenerator(baseNetwork);
        console.log('MockNetworkDataGenerator initialized with metric:', this.options.metricName);
    }

    /**
     * Initialize or get a network generator for a specific network
     * @param {Object} networkData - Network configuration
     * @returns {Object} Network generator instance
     */
    initializeNetworkGenerator(networkData) {
        const networkId = networkData.metadata.id;

        if (!this.networkGenerators.has(networkId)) {
            const generator = {
                networkData: networkData,
                startTime: Date.now(),
                evolutionPatterns: {
                    nodes: new Map(),
                    links: new Map()
                }
            };

            // Initialize evolution patterns for nodes
            networkData.nodes.forEach(node => {
                generator.evolutionPatterns.nodes.set(node.id, this.createEvolutionPattern(
                    node.metrics?.current?.[this.options.metricName]
                ));
            });

            // Initialize evolution patterns for links
            networkData.links.forEach(link => {
                const linkId = `${link.source}->${link.target}`;
                generator.evolutionPatterns.links.set(linkId, this.createEvolutionPattern(
                    link.metrics?.current?.[this.options.metricName]
                ));
            });

            this.networkGenerators.set(networkId, generator);
        }

        return this.networkGenerators.get(networkId);
    }

    /**
     * Create an evolution pattern for a metric
     */
    createEvolutionPattern(initialValue = 50) {
        return {
            frequency: 0.1 + Math.random() * 0.2,
            phase: Math.random() * 2 * Math.PI,
            baseValue: initialValue,
            amplitude: 5 + Math.random() * 15,
            noise: {
                amplitude: Math.random() * 5,
                frequency: 0.5 + Math.random()
            }
        };
    }

    /**
     * Calculate metric value based on time and pattern
     */
    calculateValue(pattern, timestamp, startTime) {
        const timeInSeconds = (timestamp - startTime) / 1000;
        const mainWave = pattern.amplitude *
            Math.sin(2 * Math.PI * pattern.frequency * timeInSeconds + pattern.phase);
        const noise = pattern.noise.amplitude *
            Math.sin(2 * Math.PI * pattern.noise.frequency * timeInSeconds);
        const value = pattern.baseValue + mainWave + noise;
        return Math.max(0, Math.min(100, value));
    }

    /**
     * Generate alerts based on metric value
     */
    generateAlerts(value) {
        const alerts = [];
        const timestamp = new Date().toISOString();

        if (value >= this.options.ranges.critical) {
            alerts.push({
                type: 'critical',
                message: `${this.options.metricName} critically high: ${value.toFixed(1)}%`,
                timestamp
            });
        } else if (value >= this.options.ranges.warning) {
            alerts.push({
                type: 'warning',
                message: `${this.options.metricName} warning: ${value.toFixed(1)}%`,
                timestamp
            });
        }

        return alerts;
    }

    /**
     * Generate network updates for a specific network
     * @param {string} networkId - ID of the network to update
     */
    generateUpdate(networkId = 'root') {
        const generator = this.networkGenerators.get(networkId);
        if (!generator) {
            console.warn(`No generator found for network ${networkId}`);
            return null;
        }

        const changes = {
            nodes: {},
            links: {}
        };

        const timestamp = Date.now();
        const currentTime = new Date().toISOString();

        // Update nodes
        generator.evolutionPatterns.nodes.forEach((pattern, nodeId) => {
            const newValue = this.calculateValue(pattern, timestamp, generator.startTime);
            changes.nodes[nodeId] = {
                metrics: {
                    current: {
                        [this.options.metricName]: newValue,
                        timestamp: currentTime
                    },
                    alerts: this.generateAlerts(newValue)
                }
            };
        });

        // Update links
        generator.evolutionPatterns.links.forEach((pattern, linkId) => {
            const newValue = this.calculateValue(pattern, timestamp, generator.startTime);
            // Get the original link data to preserve capacity
            const [source, target] = linkId.split('->');
            const originalLink = generator.networkData.links.find(
                l => l.source === source && l.target === target
            );
            const capacity = originalLink?.metrics?.current?.capacity ?? 100; // Default to 100 if not specified

            changes.links[linkId] = {
                metrics: {
                    current: {
                        [this.options.metricName]: newValue,
                        capacity: capacity,
                        timestamp: currentTime
                    },
                    alerts: this.generateAlerts(newValue)
                }
            };
        });

        return {
            timestamp: currentTime,
            changes
        };
    }

    /**
     * Add a new network to the generator
     * @param {Object} networkData - Network data to add
     */
    addNetwork(networkData) {
        this.initializeNetworkGenerator(networkData);
    }

    /**
     * Reset the generator for a specific network
     * @param {string} networkId - ID of the network to reset
     * @param {Object} newNetworkData - New network configuration
     */
    resetNetwork(networkId, newNetworkData) {
        this.networkGenerators.delete(networkId);
        this.initializeNetworkGenerator(newNetworkData);
    }

    /**
     * Check if a network exists in the generator
     * @param {string} networkId - Network ID to check
     * @returns {boolean} Whether the network exists
     */
    hasNetwork(networkId) {
        return this.networkGenerators.has(networkId);
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockNetworkDataGenerator;
} else if (typeof window !== 'undefined') {
    window.MockNetworkDataGenerator = MockNetworkDataGenerator;
}