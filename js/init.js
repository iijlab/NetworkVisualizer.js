import { NetworkVisualizer } from "./NetworkVisualizer.js";
import { MockNetworkDataGenerator } from "./network/MockDataGenerator.js";

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

async function loadMockData() {
    try {
        // Load root network data first
        const rootNetworkResponse = await fetch("data/networks/root.json");
        if (!rootNetworkResponse.ok) {
            throw new Error(`Failed to load root network data: ${rootNetworkResponse.statusText}`);
        }
        const rootNetwork = await rootNetworkResponse.json();

        // Initialize mock data generators with root network
        const mockGenerators = {
            allocation: new MockNetworkDataGenerator(rootNetwork, {
                updateInterval: 2000,
                metricName: "allocation",
                historyLength: 50,
                historyInterval: 60000 // 1 minute intervals for demo
            }),
            load: new MockNetworkDataGenerator(rootNetwork, {
                updateInterval: 2000,
                metricName: "load",
                historyLength: 50,
                historyInterval: 60000
            })
        };

        return mockGenerators;
    } catch (error) {
        console.error("Error loading mock data:", error);
        throw error;
    }
}

async function initializeVisualizer() {
    try {
        // Determine if we should use mock data
        const useMockData = shouldUseMockData();
        console.log(`Initializing with ${useMockData ? "mock" : "real"} data`);

        // Load configuration
        const configResponse = await fetch("data/config.json");
        if (!configResponse.ok) {
            throw new Error(`Failed to load config: ${configResponse.statusText}`);
        }
        const config = await configResponse.json();

        // Create visualizer instance with mock data if needed
        const visualizer = new NetworkVisualizer("#network", config);

        if (useMockData) {
            try {
                // Initialize mock data generators
                const mockGenerators = await loadMockData();

                // Set initial mock data generator
                visualizer.setMockDataGenerator(mockGenerators.allocation);

                // Add method to switch metrics
                visualizer.switchMetric = (metricName) => {
                    if (mockGenerators[metricName]) {
                        config.visualization.metric = metricName;
                        visualizer.setMockDataGenerator(mockGenerators[metricName]);

                        // Reload current network to apply new metric
                        const currentNetwork = visualizer.getCurrentNetwork();
                        if (currentNetwork) {
                            visualizer.loadNetwork(currentNetwork.metadata.id);
                        }
                    }
                };

                console.log("Mock data generators initialized successfully");
            } catch (error) {
                console.error("Error initializing mock data:", error);
                alert("Error initializing mock data. Check the console for details.");
                return;
            }
        }

        // Initialize with root network
        await visualizer.loadNetwork("root");

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
