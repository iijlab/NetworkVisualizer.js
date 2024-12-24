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
                colors: {
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

        if (useMockData) {
            // Setup mock data generator and override fetchNetworkData
            visualizer.mockDataGenerator = new MockNetworkDataGenerator(
                await fetch('data/networks/root.json').then(r => r.json()),
                { updateInterval: 5000 }
            );

            visualizer.fetchNetworkData = async (networkId) => {
                // Check cache first
                if (networkCache.has(networkId)) {
                    return networkCache.get(networkId);
                }

                try {
                    // Load initial data from static JSON
                    const response = await fetch(`data/networks/${networkId}.json`);
                    if (!response.ok) {
                        throw new Error(`Failed to load network data: ${response.statusText}`);
                    }

                    let networkData = await response.json();

                    // Convert to new format with metrics if needed
                    if (!networkData.metadata) {
                        networkData = convertToNewFormat(networkData);
                    }

                    // Cache the data
                    networkCache.set(networkId, networkData);
                    return networkData;
                } catch (error) {
                    console.error(`Error loading network ${networkId}:`, error);
                    throw error;
                }
            };

            // Override fetchNetworkUpdates to use mock generator
            visualizer.fetchNetworkUpdates = async (networkId) => {
                return visualizer.mockDataGenerator.generateUpdate();
            };
        } else {
            // Real backend implementation
            visualizer.fetchNetworkData = async (networkId) => {
                // Your real backend fetch implementation
                const response = await fetch(`/api/networks/${networkId}`);
                if (!response.ok) throw new Error('Network fetch failed');
                return response.json();
            };

            visualizer.fetchNetworkUpdates = async (networkId) => {
                // Your real backend updates implementation
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

// Helper function to convert old format to new format with metrics
function convertToNewFormat(oldData) {
    const timestamp = new Date().toISOString();

    return {
        metadata: {
            id: oldData.networkId || oldData.id,
            parentNetwork: oldData.parentNetwork,
            lastUpdated: timestamp,
            updateInterval: 5000,
            retentionPeriod: 3600
        },
        nodes: oldData.nodes.map(node => ({
            ...node,
            metrics: {
                current: {
                    allocation: node.allocation,
                    timestamp: timestamp
                },
                history: [],
                alerts: []
            }
        })),
        links: oldData.links.map(link => ({
            ...link,
            metrics: {
                current: {
                    allocation: link.allocation,
                    capacity: link.capacity,
                    timestamp: timestamp
                },
                history: [],
                alerts: []
            }
        }))
    };
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeVisualizer);