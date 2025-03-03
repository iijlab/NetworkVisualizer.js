import { NetworkRenderer } from "./NetworkRenderer.js";
import { NetworkUpdater } from "./NetworkUpdater.js";
import { NetworkInteraction } from "./NetworkInteraction.js";
import { NetworkContextMenu } from "./NetworkContextMenu.js";
import { NetworkPathManager } from "./NetworkPathManager.js";
import { NetworkThemeManager } from "./NetworkThemeManager.js";
import { DetailsPanelManager } from "./DetailsPanelManager.js";
import { MetricLegendManager } from "./MetricLegendManager.js";
import { NetworkStatsManager } from "./NetworkStatsManager.js";
import { GeometryUtils } from "./utils/GeometryUtils.js";

const DEFAULT_CONFIG = {
    nodes: {
        leaf: {
            radius: 8,
            strokeWidth: 2
        },
        cluster: {
            radius: 12,
            strokeWidth: 3
        }
    },
    links: {
        width: 5,
        arrowSize: 5
    },
    visualization: {
        metric: "allocation",
        availableMetrics: ["allocation", "load"],
        // Legacy ranges for backward compatibility
        ranges: [
            { max: 0, color: "#006994" },
            { max: 45, color: "#4CAF50" },
            { max: 55, color: "#FFC107" },
            { max: 75, color: "#FF9800" },
            { max: 100, color: "#f44336" }
        ],
        // Metric-specific configurations
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

export class NetworkVisualizerCore {
    constructor(containerId, config = {}) {
        this.config = this.mergeConfig(DEFAULT_CONFIG, config);
        this.containerId = containerId;
        this.currentNetwork = null;
        this.dataCache = new Map();
        this.mockDataGenerator = null;

        // Initialize SVG container
        const container = document.querySelector(containerId);
        if (!container) {
            throw new Error(`No element found with selector: ${containerId}`);
        }
        if (container.tagName.toLowerCase() !== "svg") {
            throw new Error(`Element with selector ${containerId} is not an SVG element`);
        }

        // Initialize details panel
        const detailsPanel = document.getElementById("details-panel");
        if (!detailsPanel) {
            throw new Error("No element found with id: details-panel");
        }
        detailsPanel.classList.remove("hide");
        detailsPanel.classList.add("show");

        // Initialize all managers
        this.contextMenu = new NetworkContextMenu();
        this.pathManager = new NetworkPathManager(".network-path");
        this.themeManager = new NetworkThemeManager();
        console.debug("Initializing NetworkRenderer with containerId:", this.containerId);
        this.networkRenderer = new NetworkRenderer(this.containerId, this.config);
        if (!this.networkRenderer) {
            console.error("Failed to initialize NetworkRenderer");
        }
        console.debug("Initializing NetworkUpdater");
        this.networkUpdater = new NetworkUpdater(this.config, this);
        if (!this.networkUpdater) {
            console.error("Failed to initialize NetworkUpdater");
        }
        this.statsManager = new NetworkStatsManager();
        this.detailsPanelManager = new DetailsPanelManager(detailsPanel, this.statsManager);
        this.networkInteraction = new NetworkInteraction(this.detailsPanelManager, this.contextMenu);
        this.metricLegendManager = new MetricLegendManager(this.config);

        // Make the selected element accessible to the updater
        Object.defineProperty(this, 'selectedElement', {
            get: () => this.networkInteraction.getSelectedElement()
        });

        // Listen for metric changes
        document.addEventListener('metricChanged', (event) => {
            const metricName = event.detail.metric;
            this.config.visualization.metric = metricName;
            if (this.currentNetwork) {
                this.createVisualization(this.currentNetwork);
            }
        });

        // Share data cache with NetworkUpdater
        this.networkUpdater.setDataCache(this.dataCache);

        // Setup handlers
        this.setupResizeHandling();
        this.setupContainerClickHandler();
        this.setupNetworkInteractionHandlers();
        this.setupUpdateCallbacks();
    }

    mergeConfig(defaultConfig, userConfig = {}) {
        return {
            ...defaultConfig,
            ...userConfig,
            nodes: {
                ...defaultConfig.nodes,
                ...(userConfig.nodes || {}),
                leaf: { ...defaultConfig.nodes.leaf, ...(userConfig.nodes?.leaf || {}) },
                cluster: { ...defaultConfig.nodes.cluster, ...(userConfig.nodes?.cluster || {}) }
            },
            links: { ...defaultConfig.links, ...(userConfig.links || {}) },
            visualization: { ...defaultConfig.visualization, ...(userConfig.visualization || {}) }
        };
    }

    setupResizeHandling() {
        const container = document.querySelector(this.containerId);
        if (!container) return;

        // Debounce the resize handler
        let resizeTimeout;
        const handleResize = () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            resizeTimeout = setTimeout(() => {
                if (this.currentNetwork) {
                    this.createVisualization(this.currentNetwork);
                }
            }, 250); // Debounce for 250ms
        };

        // Create and attach ResizeObserver
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        // Also handle window resize events
        window.addEventListener("resize", handleResize);

        // Store for cleanup
        this.resizeObserver = resizeObserver;
    }

    setupContainerClickHandler() {
        const container = document.querySelector(this.containerId);
        container.addEventListener("click", (event) => {
            // Only handle clicks directly on the SVG, not on nodes or links
            if (event.target === container) {
                this.networkInteraction.clearSelection();
                this.contextMenu.hide();
            }
        });
    }

    setupNetworkInteractionHandlers() {
        this.networkInteraction.setClusterExploreHandler(async (networkId) => {
            await this.loadNetwork(networkId);
        });
    }

    setupUpdateCallbacks() {
        this.networkUpdater.onUpdate((updates) => {
            // Update network stats when changes occur
            if (this.currentNetwork) {
                this.statsManager.calculateNetworkStats(this.currentNetwork);
            }
        });
    }

    async loadNetwork(networkId) {
        try {
            // Stop any existing updates
            this.networkUpdater.stopDynamicUpdates();

            // Clean up existing visualization
            this.cleanup();

            // Fetch and validate network data
            const networkData = await this.fetchNetworkData(networkId);
            if (!networkData) {
                throw new Error(`No data found for network: ${networkId}`);
            }

            // Ensure the network data has the required structure
            if (!networkData.nodes || !Array.isArray(networkData.nodes)) {
                throw new Error(`Invalid network data structure for network: ${networkId}`);
            }

            // Store current network data and update interaction state
            this.currentNetwork = networkData;
            this.networkInteraction.setCurrentNetwork(networkData);

            // Calculate initial network stats
            this.statsManager.calculateNetworkStats(networkData);

            // Update network path before visualization
            this.pathManager.updatePath(networkId, (pathNetworkId) => this.loadNetwork(pathNetworkId));

            // Create visualization
            await this.createVisualization(networkData);

            // Update URL after successful visualization
            const url = new URL(window.location);
            url.searchParams.set("network", networkId);
            window.history.pushState({}, "", url);

            // Update details panel with network overview
            this.detailsPanelManager.updateNetworkOverview(networkData);

            // Add to mock data generator if needed
            if (this.mockDataGenerator && !this.mockDataGenerator.hasNetwork(networkId)) {
                this.mockDataGenerator.addNetwork(networkData);
            }

            // Start dynamic updates after everything is set up
            this.networkUpdater.startDynamicUpdates(networkId, this.mockDataGenerator);

            console.log(`Network ${networkId} loaded and activated successfully`);
        } catch (error) {
            console.error("Error loading network data:", error);
            throw error;
        }
    }

    createVisualization(data) {
        const onNodeClick = async (event, nodeElement, selectionHighlight) => {
            try {
                const nodeData = this.networkInteraction.handleNodeClick(event, nodeElement, selectionHighlight);
                if (nodeData && nodeData.type === "cluster" && nodeData.childNetwork) {
                    console.log(`Attempting to load cluster network: ${nodeData.childNetwork}`);

                    // Pre-fetch the network data to verify it exists
                    const networkData = await this.fetchNetworkData(nodeData.childNetwork);
                    if (!networkData) {
                        throw new Error(`No data found for network: ${nodeData.childNetwork}`);
                    }

                    // Load the cluster network
                    await this.loadNetwork(nodeData.childNetwork);
                    console.log(`Successfully loaded cluster network: ${nodeData.childNetwork}`);
                }
            } catch (error) {
                console.error("Error handling node click:", error);
                // Revert selection on error
                this.networkInteraction.clearSelection();
                // Re-throw to allow error handling up the chain
                throw error;
            }
        };

        const onLinkClick = (event, linkElement, selectionHighlight) => {
            this.networkInteraction.handleLinkClick(event, linkElement, selectionHighlight);
        };

        const svg = this.networkRenderer.createVisualization(data, onNodeClick, onLinkClick);

        // Set up context menu handlers for all nodes and links
        d3.select(svg).selectAll("g.node").each((d, i, nodes) => {
            const node = nodes[i];
            const circle = d3.select(node).select("circle:not(.selection-highlight)").node();
            if (circle) {
                this.networkInteraction.setupContextMenuHandlers(circle, "node");
            }
        });

        d3.select(svg).selectAll("g.link").each((d, i, links) => {
            const link = links[i];
            const line = d3.select(link).select("line.link-half").node();
            if (line) {
                this.networkInteraction.setupContextMenuHandlers(line, "link");
            }
        });
    }

    cleanup() {
        this.networkInteraction.clearSelection();
        this.networkUpdater.stopDynamicUpdates();
        const svg = document.querySelector(this.containerId);
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
    }

    destroy() {
        this.cleanup();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        window.removeEventListener("resize", this.handleResize);
    }

    setMockDataGenerator(generator) {
        this.mockDataGenerator = generator;
    }

    getCurrentNetwork() {
        return this.currentNetwork;
    }

    getNetworkStats() {
        return this.statsManager.getCurrentStats();
    }

    async fetchNetworkData(networkId) {
        throw new Error("fetchNetworkData must be implemented");
    }
}
