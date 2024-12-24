/**
 * MockNetworkDataGenerator
 * Generates mock network metric updates following wave-like patterns for visualization testing.
 */
class MockNetworkDataGenerator {
    /**
     * Create a new mock data generator
     * @param {Object} baseNetwork - Initial network configuration
     * @param {Object} options - Generator options
     * @param {number} [options.updateInterval=5000] - Update interval in milliseconds
     * @param {number} [options.maxVariation=10] - Maximum value variation percentage
     * @param {string} [options.metricName='allocation'] - Name of the metric to simulate
     * @param {Object} [options.ranges] - Value ranges for alerts
     */
    constructor(baseNetwork, options = {}) {
        this.baseNetwork = baseNetwork;
        this.startTime = Date.now();
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

        // Initialize evolution patterns
        this.evolutionPatterns = {
            nodes: new Map(),
            links: new Map()
        };

        this.initializeEvolutionPatterns();
        console.log('MockNetworkDataGenerator initialized with metric:', this.options.metricName);
    }

    /**
     * Initialize evolution patterns for nodes and links
     * @private
     */
    initializeEvolutionPatterns() {
        // Generate patterns for nodes
        this.baseNetwork.nodes.forEach(node => {
            this.evolutionPatterns.nodes.set(node.id, this.createEvolutionPattern(
                node.metrics?.current?.[this.options.metricName]
            ));
        });

        // Generate patterns for links
        this.baseNetwork.links.forEach(link => {
            const linkId = `${link.source}->${link.target}`;
            this.evolutionPatterns.links.set(linkId, this.createEvolutionPattern(
                link.metrics?.current?.[this.options.metricName]
            ));
        });
    }

    /**
     * Create an evolution pattern for a metric
     * @private
     * @param {number} initialValue - Initial value of the metric
     * @returns {Object} Evolution pattern parameters
     */
    createEvolutionPattern(initialValue = 50) {
        return {
            frequency: 0.1 + Math.random() * 0.2,  // Random frequency between 0.1 and 0.3 Hz
            phase: Math.random() * 2 * Math.PI,    // Random phase shift
            baseValue: initialValue,               // Starting point
            amplitude: 5 + Math.random() * 15,     // Random amplitude between 5 and 20
            // Add some randomness to make patterns more interesting
            noise: {
                amplitude: Math.random() * 5,      // Small random variations
                frequency: 0.5 + Math.random()     // Faster than main wave
            }
        };
    }

    /**
     * Calculate metric value based on time and pattern
     * @private
     * @param {Object} pattern - Evolution pattern
     * @param {number} timestamp - Current timestamp
     * @returns {number} Calculated metric value
     */
    calculateValue(pattern, timestamp) {
        const timeInSeconds = (timestamp - this.startTime) / 1000;

        // Main wave
        const mainWave = pattern.amplitude *
            Math.sin(2 * Math.PI * pattern.frequency * timeInSeconds + pattern.phase);

        // Add noise for more realistic variation
        const noise = pattern.noise.amplitude *
            Math.sin(2 * Math.PI * pattern.noise.frequency * timeInSeconds);

        // Combine base value, main wave, and noise
        const value = pattern.baseValue + mainWave + noise;

        // Ensure value stays within 0-100 range
        return Math.max(0, Math.min(100, value));
    }

    /**
     * Generate alerts based on metric value
     * @private
     * @param {number} value - Current metric value
     * @returns {Array} List of alerts
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
     * Generate network updates
     * @returns {Object} Network updates
     */
    generateUpdate() {
        const changes = {
            nodes: {},
            links: {}
        };

        const timestamp = Date.now();
        const currentTime = new Date().toISOString();

        // Update nodes
        this.evolutionPatterns.nodes.forEach((pattern, nodeId) => {
            const newValue = this.calculateValue(pattern, timestamp);
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
        this.evolutionPatterns.links.forEach((pattern, linkId) => {
            const newValue = this.calculateValue(pattern, timestamp);
            changes.links[linkId] = {
                metrics: {
                    current: {
                        [this.options.metricName]: newValue,
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
     * Reset the generator with new base network data
     * @param {Object} newBaseNetwork - New network configuration
     */
    reset(newBaseNetwork) {
        this.baseNetwork = newBaseNetwork;
        this.startTime = Date.now();
        this.initializeEvolutionPatterns();
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockNetworkDataGenerator;
} else if (typeof window !== 'undefined') {
    window.MockNetworkDataGenerator = MockNetworkDataGenerator;
}