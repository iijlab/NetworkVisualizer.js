// Cache for loaded network data
const networkCache = new Map();

async function initializeVisualizer() {
    try {
        // Load configuration
        const configResponse = await fetch('data/config.json');
        if (!configResponse.ok) {
            throw new Error(`Failed to load config: ${configResponse.statusText}`);
        }
        const config = await configResponse.json();

        // Create visualizer instance
        const visualizer = new NetworkVisualizer("#network", config);

        // Override the fetchNetworkData method to load from JSON files
        visualizer.fetchNetworkData = async (networkId) => {
            // Check cache first
            if (networkCache.has(networkId)) {
                return networkCache.get(networkId);
            }

            try {
                console.log(`Loading network data for: ${networkId}`); // Debug log
                const response = await fetch(`data/networks/${networkId}.json`);

                if (!response.ok) {
                    throw new Error(`Failed to load network data: ${response.statusText}`);
                }

                let networkData = await response.json();

                // Convert old format to new format if necessary
                if (!networkData.metadata) {
                    console.log('Converting old format to new format'); // Debug log
                    networkData = {
                        metadata: {
                            id: networkData.networkId,
                            parentNetwork: networkData.parentNetwork
                        },
                        nodes: networkData.nodes,
                        links: networkData.links
                    };
                }

                // Cache the data
                networkCache.set(networkId, networkData);
                console.log(`Successfully loaded network: ${networkId}`); // Debug log

                return networkData;
            } catch (error) {
                console.error(`Error loading network ${networkId}:`, error);
                throw error;
            }
        };

        // Add debug logging to loadNetwork
        const originalLoadNetwork = visualizer.loadNetwork;
        visualizer.loadNetwork = async function(networkId) {
            console.log(`Attempting to load network: ${networkId}`); // Debug log
            try {
                await originalLoadNetwork.call(this, networkId);
                console.log(`Successfully switched to network: ${networkId}`); // Debug log
            } catch (error) {
                console.error(`Failed to load network ${networkId}:`, error);
                throw error;
            }
        };

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