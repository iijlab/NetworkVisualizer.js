// init.js

// Cache for loaded network data
const networkCache = new Map();

// Function to detect if we should use mock data
function shouldUseMockData() {
    // First check for window level configuration
    if (typeof window.USE_MOCK_DATA !== 'undefined') {
        return window.USE_MOCK_DATA;
    }

    // Then check for data-mock-data attribute on script tag
    const scriptTag = document.querySelector('script[data-mock-data]');
    if (scriptTag) {
        return scriptTag.getAttribute('data-mock-data') === 'true';
    }

    return false;
}

async function initializeVisualizer() {
    try {
        // Determine if we should use mock data
        const useMockData = shouldUseMockData();
        console.log(`Initializing with ${useMockData ? 'mock' : 'real'} data`);

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
                    metric: "allocation",
                    ranges: [
                        { max: 0, color: "#006994" },
                        { max: 45, color: "#4CAF50" },
                        { max: 55, color: "#FFC107" },
                        { max: 75, color: "#FF9800" },
                        { max: 100, color: "#f44336" }
                    ]
                }
            };
        } else {
            const configResponse = await fetch('data/config.json');
            if (!configResponse.ok) {
                throw new Error(`Failed to load config: ${configResponse.statusText}`);
            }
            config = await configResponse.json();
        }

        // Create visualizer instance
        const visualizer = new NetworkVisualizer("#network", config);
        let updateInterval = null;

        if (useMockData) {
            // Load root network data
            const rootNetworkResponse = await fetch('data/networks/root.json');
            const rootNetwork = await rootNetworkResponse.json();

            // Ensure metadata has update interval
            if (!rootNetwork.metadata) {
                rootNetwork.metadata = {};
            }
            rootNetwork.metadata.updateInterval = 2000; // 2 seconds

            // Create mock data generator
            const mockGenerator = new MockNetworkDataGenerator(rootNetwork, {
                updateInterval: rootNetwork.metadata.updateInterval,
                metricName: config.visualization.metric
            });

            visualizer.mockDataGenerator = mockGenerator;

            // Override fetch methods for mock data
            visualizer.fetchNetworkData = async (networkId) => {
                try {
                    const response = await fetch(`data/networks/${networkId}.json`);
                    if (!response.ok) {
                        throw new Error(`Failed to load network data: ${response.statusText}`);
                    }
                    let networkData = await response.json();

                    // Ensure metadata has update interval for all networks
                    if (!networkData.metadata) {
                        networkData.metadata = {};
                    }
                    networkData.metadata.updateInterval = 2000; // 2 seconds

                    return networkData;
                } catch (error) {
                    console.error(`Error loading network ${networkId}:`, error);
                    throw error;
                }
            };

            visualizer.startDynamicUpdates = (networkId) => {
                if (updateInterval) {
                    clearInterval(updateInterval);
                }

                console.log('Starting dynamic updates...');

                updateInterval = setInterval(() => {
                    const updates = mockGenerator.generateUpdate();
                    console.log('Generated update for links:', updates.changes.links);

                    // Log a sample of current link data
                    const sampleLinkId = Object.keys(updates.changes.links)[0];
                    if (sampleLinkId) {
                        console.log('Sample link update:', {
                            id: sampleLinkId,
                            oldValue: visualizer.currentNetwork.links.find(
                                l => `${l.source}->${l.target}` === sampleLinkId
                            )?.metrics?.current?.allocation,
                            newValue: updates.changes.links[sampleLinkId].metrics.current.allocation
                        });
                    }

                    visualizer.applyNetworkUpdates(updates);
                }, 2000);  // Update every 2 seconds
            };

            visualizer.stopDynamicUpdates = () => {
                if (updateInterval) {
                    clearInterval(updateInterval);
                    updateInterval = null;
                }
            };
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

        // Initialize with root network
        await visualizer.loadNetwork('root');

        // Handle browser back/forward
        window.addEventListener('popstate', async () => {
            const params = new URLSearchParams(window.location.search);
            const networkId = params.get('network') || 'root';
            await visualizer.loadNetwork(networkId);
        });

    } catch (error) {
        console.error('Error initializing visualizer:', error);
        alert(`Error initializing visualization: ${error.message}`);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeVisualizer);