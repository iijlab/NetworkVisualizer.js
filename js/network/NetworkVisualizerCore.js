import { NetworkRenderer } from "./NetworkRenderer.js";
import { NetworkUpdater } from "./NetworkUpdater.js";
import { NetworkInteraction } from "./NetworkInteraction.js";
import { NetworkContextMenu } from "./NetworkContextMenu.js";
import { NetworkPathManager } from "./NetworkPathManager.js";
import { NetworkThemeManager } from "./NetworkThemeManager.js";
import { DetailsPanelManager } from "./DetailsPanelManager.js";
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
        ranges: [
            { max: 0, color: "#006994" },
            { max: 45, color: "#4CAF50" },
            { max: 55, color: "#FFC107" },
            { max: 75, color: "#FF9800" },
            { max: 100, color: "#f44336" }
        ]
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

        this.contextMenu = new NetworkContextMenu();
        this.pathManager = new NetworkPathManager(".network-path");
        this.themeManager = new NetworkThemeManager();
        this.networkRenderer = new NetworkRenderer(this.containerId, this.config);
        this.networkUpdater = new NetworkUpdater(this.config);
        this.detailsPanelManager = new DetailsPanelManager(detailsPanel);
        this.networkInteraction = new NetworkInteraction(this.detailsPanelManager, this.contextMenu);

        // Setup handlers
        this.setupResizeHandling();
        this.setupContainerClickHandler();
        this.setupNetworkInteractionHandlers();
    }

    mergeConfig(defaultConfig, userConfig) {
        return {
            ...defaultConfig,
            ...userConfig,
            nodes: {
                ...defaultConfig.nodes,
                ...userConfig.nodes,
                leaf: { ...defaultConfig.nodes.leaf, ...userConfig.nodes?.leaf },
                cluster: { ...defaultConfig.nodes.cluster, ...userConfig.nodes?.cluster }
            },
            links: { ...defaultConfig.links, ...userConfig.links },
            visualization: { ...defaultConfig.visualization, ...userConfig.visualization }
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

    async loadNetwork(networkId) {
        try {
            this.cleanup();
            const networkData = await this.fetchNetworkData(networkId);
            if (!networkData) {
                throw new Error(`No data found for network: ${networkId}`);
            }

            // Store current network data
            this.currentNetwork = networkData;
            this.networkInteraction.setCurrentNetwork(networkData);

            // Update network path
            this.pathManager.updatePath(networkId, (pathNetworkId) => this.loadNetwork(pathNetworkId));

            // Create visualization
            await this.createVisualization(networkData);

            // Update URL
            const url = new URL(window.location);
            url.searchParams.set("network", networkId);
            window.history.pushState({}, "", url);

            // Start dynamic updates
            this.networkUpdater.startDynamicUpdates(networkId, this.mockDataGenerator);

            console.log(`Network ${networkId} loaded and updates started`);
        } catch (error) {
            console.error("Error loading network data:", error);
            throw error;
        }
    }

    createVisualization(data) {
        const onNodeClick = (event, nodeElement, selectionHighlight) => {
            const nodeData = this.networkInteraction.handleNodeClick(event, nodeElement, selectionHighlight);
            if (nodeData.type === "cluster" && nodeData.childNetwork) {
                this.loadNetwork(nodeData.childNetwork);
            }
        };

        const onLinkClick = (event, linkElement, selectionHighlight) => {
            this.networkInteraction.handleLinkClick(event, linkElement, selectionHighlight);
        };

        this.networkRenderer.createVisualization(data, onNodeClick, onLinkClick);
    }

    cleanup() {
        this.networkInteraction.clearSelection();
        this.networkUpdater.stopDynamicUpdates();
        const svg = document.querySelector(this.containerId);
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
    }

    setMockDataGenerator(generator) {
        this.mockDataGenerator = generator;
    }

    async fetchNetworkData(networkId) {
        throw new Error("fetchNetworkData must be implemented");
    }
}
