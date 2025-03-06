import { NetworkVisualizer } from "./NetworkVisualizer.js";
import { MockNetworkDataGenerator } from "./network/MockDataGenerator.js";
import { MetricLegendManager } from "./network/MetricLegendManager.js";

// Cache for loaded network data (preserved from old version)
const networkCache = new Map();
// Track update intervals
const updateIntervals = new Map();

// Function to detect if we should use mock data
function shouldUseMockData() {
    // First check for window level configuration
    if (typeof window.USE_MOCK_DATA !== "undefined") {
        return window.USE_MOCK_DATA;
    }

    // Then check for data-mock-data attribute on script tag
    const scriptTag = document.querySelector("script[data-mock-data]");
    if (scriptTag) {
        return scriptTag.getAttribute("data-mock-data") === "true";
    }

    return false;
}

async function loadNetworkData(networkId) {
    try {
        const response = await fetch(`data/networks/${networkId}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load network data: ${response.statusText}`);
        }
        const networkData = await response.json();

        // Find all child networks
        const childNetworks = networkData.nodes
            .filter(node => node.type === "cluster" && node.childNetwork)
            .map(node => node.childNetwork);

        // Recursively load child networks
        const childData = await Promise.all(
            childNetworks.map(childId => loadNetworkData(childId))
        );

        return [networkData, ...childData.flat()];
    } catch (error) {
        console.error(`Error loading network ${networkId}:`, error);
        return [];
    }
}

async function loadMockData() {
    try {
        // Load root network data first
        const rootNetworkResponse = await fetch('data/networks/root.json');
        if (!rootNetworkResponse.ok) {
            throw new Error(`Failed to load root network data: ${rootNetworkResponse.statusText}`);
        }
        const rootNetwork = await rootNetworkResponse.json();

        // Initialize mock data generator for allocation metric
        const allocationGenerator = new MockNetworkDataGenerator(rootNetwork, {
            updateInterval: 5000,
            metricName: 'allocation',
            historyLength: 50,
            historyInterval: 60000 // 1 minute intervals for demo
        });

        // Create a deep copy of the root network for the load metric
        const rootNetworkCopy = JSON.parse(JSON.stringify(rootNetwork));

        // Initialize mock data generator for load metric
        const loadGenerator = new MockNetworkDataGenerator(rootNetworkCopy, {
            updateInterval: 5000,
            metricName: 'load',
            historyLength: 50,
            historyInterval: 60000
        });

        return {
            allocation: allocationGenerator,
            load: loadGenerator
        };
    } catch (error) {
        console.error('Error loading mock data:', error);
        throw error;
    }
}

async function initializeVisualizer() {
    try {
        // Determine if we should use mock data
        const useMockData = shouldUseMockData();
        console.log(`Initializing with ${useMockData ? "mock" : "real"} data`);

        // Load configuration
        let config;
        if (useMockData) {
            config = {
                nodes: {
                    leaf: { radius: 8, strokeWidth: 2 },
                    cluster: { radius: 12, strokeWidth: 3 }
                },
                links: {
                    width: 5,
                    arrowSize: 5
                },
                visualization: {
                    metric: "allocation", // Keep allocation as default
                    availableMetrics: ["allocation", "load"],
                    ranges: [
                        { max: 0, color: "#006994" },
                        { max: 45, color: "#4CAF50" },
                        { max: 55, color: "#FFC107" },
                        { max: 75, color: "#FF9800" },
                        { max: 100, color: "#f44336" }
                    ],
                    // Added metric-specific configurations
                    metrics: {
                        allocation: {
                            type: "range",
                            ranges: [
                                { max: 0, color: "#006994" },
                                { max: 45, color: "#4CAF50" },
                                { max: 55, color: "#FFC107" },
                                { max: 75, color: "#FF9800" },
                                { max: 100, color: "#f44336" }
                            ]
                        },
                        load: {
                            type: "continuous",
                            colorScale: {
                                min: "#00ff00",
                                max: "#ff0000"
                            }
                        }
                    }
                }
            };
        } else {
            const configResponse = await fetch("data/config.json");
            if (!configResponse.ok) {
                throw new Error(`Failed to load config: ${configResponse.statusText}`);
            }
            config = await configResponse.json();
        }

        // Create visualizer instance
        const visualizer = new NetworkVisualizer("#network", config);

        // Initialize metric legend
        const metricLegend = new MetricLegendManager(config);

        if (useMockData) {
            try {
                // Initialize mock data generators
                const mockGenerators = await loadMockData();
                const allocationGenerator = mockGenerators.allocation;
                const loadGenerator = mockGenerators.load;

                // Make mock generators available globally for metric switching
                window.mockGenerators = mockGenerators;

                // Set mock data generator based on current metric
                const currentMetric = config.visualization.metric;
                const mockGenerator = currentMetric === 'load' ? loadGenerator : allocationGenerator;

                visualizer.setMockDataGenerator(mockGenerator);
                console.debug(`Initial mock data generator set to ${currentMetric}`);

                // Override fetch methods for mock data
                visualizer.fetchNetworkData = async (networkId) => {
                    try {
                        console.log(`Fetching network data for ${networkId}`);
                        const response = await fetch(`data/networks/${networkId}.json`);
                        if (!response.ok) {
                            throw new Error(`Failed to load network data: ${response.statusText}`);
                        }
                        let networkData = await response.json();

                        // CRITICAL: Make sure the network has a metadata.id field
                        if (!networkData.metadata) {
                            networkData.metadata = { id: networkId };
                        } else if (!networkData.metadata.id) {
                            networkData.metadata.id = networkId;
                        }

                        console.log(`Successfully loaded network ${networkId}`);

                        // Add network to ALL mock generators
                        Object.entries(mockGenerators).forEach(([metricName, generator]) => {
                            if (!generator.hasNetwork(networkId)) {
                                console.log(`Adding network ${networkId} to ${metricName} generator`);
                                // Create a deep copy for each generator to avoid cross-contamination
                                const networkDataCopy = JSON.parse(JSON.stringify(networkData));
                                generator.addNetwork(networkDataCopy);
                            }
                        });

                        return networkData;
                    } catch (error) {
                        console.error(`Error loading network ${networkId}:`, error);
                        throw error;
                    }
                };

                // Add dynamic update methods
                visualizer.startDynamicUpdates = (networkId) => {
                    // Clear existing interval for this network if it exists
                    if (updateIntervals.has(networkId)) {
                        clearInterval(updateIntervals.get(networkId));
                    }

                    console.log(`Starting dynamic updates for network ${networkId}...`);

                    const interval = setInterval(() => {
                        // Get the current metric from the config
                        const currentMetric = visualizer.config.visualization.metric;
                        // Use the appropriate generator based on the current metric
                        const generator = currentMetric === 'load' ? loadGenerator : allocationGenerator;

                        const updates = generator.generateUpdate(networkId);
                        if (updates) {
                            console.log(`Generated update for network ${networkId} with metric ${currentMetric}:`, updates);
                            visualizer.applyNetworkUpdates(updates);
                        }
                    }, 5000);  // Update every 5 seconds

                    updateIntervals.set(networkId, interval);
                };

                visualizer.stopDynamicUpdates = () => {
                    updateIntervals.forEach((interval) => {
                        clearInterval(interval);
                    });
                    updateIntervals.clear();
                };

                console.log("Mock data generator initialized successfully");
            } catch (error) {
                console.error("Error initializing mock data:", error);
                alert("Error initializing mock data. Check the console for details.");
                return;
            }
        } else {
            // Real backend implementation
            visualizer.fetchNetworkData = async (networkId) => {
                const response = await fetch(`/api/networks/${networkId}`);
                if (!response.ok) throw new Error('Network fetch failed');
                return response.json();
            };

            visualizer.fetchNetworkUpdates = async (networkId) => {
                const response = await fetch(`/api/networks/${networkId}/updates`);
                if (!response.ok) throw new Error('Updates fetch failed');
                return response.json();
            };
        }

        // Initialize with root network and ensure it's loaded
        try {
            await visualizer.loadNetwork("root");
            console.log("Root network loaded successfully");
        } catch (error) {
            console.error("Failed to load root network:", error);
            throw error;
        }

        // Handle browser back/forward
        window.addEventListener("popstate", async () => {
            const params = new URLSearchParams(window.location.search);
            const networkId = params.get("network") || "root";
            await visualizer.loadNetwork(networkId);
        });


    } catch (error) {
        console.error("Error initializing visualizer:", error);
        alert(`Error initializing visualization: ${error.message}`);
    }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initializeVisualizer);
