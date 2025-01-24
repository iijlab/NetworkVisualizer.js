class MockNetworkDataGenerator {
    constructor(baseNetwork, options = {}) {
        this.networkGenerators = new Map();
        this.options = {
            updateInterval: 5000,
            maxVariation: 10,
            metricName: 'allocation',
            historyLength: 50,
            historyInterval: 300000, // 5 minutes in milliseconds
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

            // Initialize evolution patterns and history for nodes
            networkData.nodes.forEach(node => {
                const baseValue = node.metrics?.current?.[this.options.metricName] ?? 50;
                const pattern = this.createEvolutionPattern(baseValue);
                generator.evolutionPatterns.nodes.set(node.id, pattern);

                // Initialize metrics history if it doesn't exist
                if (!node.metrics) node.metrics = {};
                if (!node.metrics.history) node.metrics.history = [];

                // Generate initial history
                node.metrics.history = this.generateHistory(pattern, baseValue);
            });

            // Initialize evolution patterns and history for links
            networkData.links.forEach(link => {
                const linkId = `${link.source}->${link.target}`;
                const baseValue = link.metrics?.current?.[this.options.metricName] ?? 50;
                const pattern = this.createEvolutionPattern(baseValue);
                generator.evolutionPatterns.links.set(linkId, pattern);

                // Initialize metrics history if it doesn't exist
                if (!link.metrics) link.metrics = {};
                if (!link.metrics.history) link.metrics.history = [];

                // Generate initial history
                link.metrics.history = this.generateHistory(pattern, baseValue);
            });

            this.networkGenerators.set(networkId, generator);
        }

        return this.networkGenerators.get(networkId);
    }

    generateHistory(pattern, baseValue) {
        const now = Date.now();
        const history = [];

        for (let i = this.options.historyLength - 1; i >= 0; i--) {
            const timestamp = new Date(now - (i * this.options.historyInterval));
            const timeInSeconds = (timestamp.getTime() - (now - (this.options.historyLength * this.options.historyInterval))) / 1000;

            const value = this.calculateHistoricalValue(pattern, timeInSeconds, baseValue);

            history.push({
                timestamp: timestamp.toISOString(),
                [this.options.metricName]: value
            });
        }

        return history;
    }

    calculateHistoricalValue(pattern, timeInSeconds, baseValue) {
        const mainWave = pattern.amplitude *
            Math.sin(2 * Math.PI * pattern.frequency * timeInSeconds + pattern.phase);
        const noise = pattern.noise.amplitude *
            Math.sin(2 * Math.PI * pattern.noise.frequency * timeInSeconds);
        const trendComponent = (Math.sin(2 * Math.PI * 0.00001 * timeInSeconds) + 1) * 10;

        const value = baseValue + mainWave + noise + trendComponent;
        return Math.max(0, Math.min(100, value));
    }

    createEvolutionPattern(initialValue = 50) {
        return {
            frequency: 0.1 + Math.random() * 0.2,
            phase: Math.random() * 2 * Math.PI,
            baseValue: initialValue,
            amplitude: 5 + Math.random() * 15,
            noise: {
                amplitude: Math.random() * 5,
                frequency: 0.5 + Math.random()
            },
            trend: {
                direction: Math.random() > 0.5 ? 1 : -1,
                strength: Math.random() * 0.1
            }
        };
    }

    calculateValue(pattern, timestamp, startTime) {
        const timeInSeconds = (timestamp - startTime) / 1000;
        const mainWave = pattern.amplitude *
            Math.sin(2 * Math.PI * pattern.frequency * timeInSeconds + pattern.phase);
        const noise = pattern.noise.amplitude *
            Math.sin(2 * Math.PI * pattern.noise.frequency * timeInSeconds);
        const trendEffect = pattern.trend.direction * pattern.trend.strength * timeInSeconds;

        const value = pattern.baseValue + mainWave + noise + trendEffect;
        return Math.max(0, Math.min(100, value));
    }

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
            const node = generator.networkData.nodes.find(n => n.id === nodeId);

            // Update history by removing oldest entry and adding new one
            if (node.metrics.history.length >= this.options.historyLength) {
                node.metrics.history.shift();
            }

            node.metrics.history.push({
                timestamp: currentTime,
                [this.options.metricName]: newValue
            });

            changes.nodes[nodeId] = {
                metrics: {
                    current: {
                        [this.options.metricName]: newValue,
                        timestamp: currentTime
                    },
                    history: node.metrics.history,
                    alerts: this.generateAlerts(newValue)
                }
            };
        });

        // Update links
        generator.evolutionPatterns.links.forEach((pattern, linkId) => {
            const newValue = this.calculateValue(pattern, timestamp, generator.startTime);
            const [source, target] = linkId.split('->');
            const link = generator.networkData.links.find(
                l => l.source === source && l.target === target
            );

            // Update history
            if (link.metrics.history.length >= this.options.historyLength) {
                link.metrics.history.shift();
            }

            link.metrics.history.push({
                timestamp: currentTime,
                [this.options.metricName]: newValue
            });

            const capacity = link?.metrics?.current?.capacity ?? 100;

            changes.links[linkId] = {
                metrics: {
                    current: {
                        [this.options.metricName]: newValue,
                        capacity: capacity,
                        timestamp: currentTime
                    },
                    history: link.metrics.history,
                    alerts: this.generateAlerts(newValue)
                }
            };
        });

        return {
            timestamp: currentTime,
            changes
        };
    }

    addNetwork(networkData) {
        this.initializeNetworkGenerator(networkData);
    }

    hasNetwork(networkId) {
        return this.networkGenerators.has(networkId);
    }

    resetNetwork(networkId, newNetworkData) {
        this.networkGenerators.delete(networkId);
        this.initializeNetworkGenerator(newNetworkData);
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockNetworkDataGenerator;
} else if (typeof window !== 'undefined') {
    window.MockNetworkDataGenerator = MockNetworkDataGenerator;
}