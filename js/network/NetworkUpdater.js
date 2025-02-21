import { ColorUtils } from "./utils/ColorUtils.js";

export class NetworkUpdater {
    constructor(config, visualizerCore) {
        this.config = config;
        this.visualizerCore = visualizerCore;
        this.updateInterval = null;
        this.lastUpdate = null;
        this.dataCache = null;
        this.updateCallbacks = new Set();
        this.transitions = {
            duration: 750,
            ease: d3.easeCubic
        };
    }

    setDataCache(cache) {
        this.dataCache = cache;
    }

    startDynamicUpdates(networkId, mockDataGenerator = null) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Use the update interval from mockDataGenerator or default to 5000ms
        const updateInterval = mockDataGenerator?.options?.updateInterval || 5000;
        console.log(`Starting dynamic updates for network ${networkId} with interval ${updateInterval}ms`);

        this.updateInterval = setInterval(async () => {
            if (mockDataGenerator) {
                const updates = mockDataGenerator.generateUpdate();
                console.log("Applying update:", updates);
                this.applyNetworkUpdates(updates);
            } else {
                try {
                    const updates = await this.fetchNetworkUpdates(networkId);
                    this.applyNetworkUpdates(updates);
                } catch (error) {
                    console.error("Error fetching network updates:", error);
                }
            }
        }, updateInterval);
    }

    stopDynamicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async fetchAndApplyUpdates(networkId) {
        try {
            const updates = await this.fetchNetworkUpdates(networkId);
            if (!updates) return;

            this.applyNetworkUpdates(updates);
            this.lastUpdate = updates.timestamp;
        } catch (error) {
            console.error("Error fetching network updates:", error);
        }
    }

    applyNetworkUpdates(updates) {
        if (!updates || !updates.changes) {
            console.warn("Invalid update data received");
            return;
        }

        if (!updates || !updates.changes) {
            console.warn("Invalid update data received");
            return;
        }

        const svg = d3.select(this.visualizerCore.containerId);
        const currentNetwork = this.visualizerCore.currentNetwork;
        const detailsPanelManager = this.visualizerCore.detailsPanelManager;
        const selectedElement = this.visualizerCore.selectedElement;
        const metricName = this.visualizerCore.config.visualization.metric;

        // Update nodes
        Object.entries(updates.changes.nodes || {}).forEach(([id, change]) => {
            // Find node by matching text content
            const nodeGroups = svg.selectAll("g.node");
            console.debug(`Looking for node ${id} among ${nodeGroups.size()} total nodes`);

            const matchingNodes = nodeGroups.filter(function () {
                const text = d3.select(this).select("text").text();
                console.debug(`Checking node with text: ${text}`);
                return text === id;
            });

            console.debug(`Found ${matchingNodes.size()} matching nodes for id: ${id}`);

            if (!matchingNodes.empty()) {
                const nodeSelection = matchingNodes;
                const circle = nodeSelection.select("circle:not(.selection-highlight)");
                console.debug(`Found circle element: ${!circle.empty()}`);
                if (!circle.empty()) {
                    console.debug(`Processing update for node ${id}`);
                    const newMetric = change.metrics?.current;
                    if (newMetric && newMetric[metricName] !== undefined) {
                        const newValue = newMetric[metricName];
                        // Get node data
                        const nodeData = currentNetwork.nodes.find(n => n.id === id);
                        console.debug(`Updating node ${id} from ${nodeData?.metrics?.current?.[metricName]} to ${newValue}`);
                        if (nodeData) {
                            nodeData.metrics = change.metrics;

                            // Determine if it's a cluster node
                            const isCluster = nodeData.type === "cluster";

                            // Update visual appearance using NetworkRenderer's method
                            console.debug(`Updating node ${id} appearance (isCluster: ${isCluster})`);
                            this.visualizerCore.networkRenderer.updateNodeColor(circle, change.metrics, isCluster);

                            // Update details panel if this is the selected node
                            if (selectedElement) {
                                const selectedNode = d3.select(selectedElement.closest("g"));
                                const selectedNodeId = selectedNode.select("text").text();

                                if (selectedNodeId === id) {
                                    if (nodeData.type === "cluster" && nodeData.childNetwork) {
                                        const clusterNetwork = this.dataCache.get(nodeData.childNetwork);
                                        if (clusterNetwork) {
                                            detailsPanelManager.updateClusterDetails(nodeData, clusterNetwork);
                                        } else {
                                            detailsPanelManager.updateNodeDetails(nodeData);
                                        }
                                    } else {
                                        detailsPanelManager.updateNodeDetails(nodeData);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Update links
        Object.entries(updates.changes.links || {}).forEach(([id, change]) => {
            const [source, target] = id.split("->");

            console.debug(`Looking for link ${source}->${target}`);

            // Find and update the link data
            const linkData = currentNetwork.links.find(
                l => l.source === source && l.target === target
            );

            if (linkData) {
                console.debug(`Found link data, current value: ${linkData.metrics?.current?.[metricName]}`);

                // Update the stored data
                linkData.metrics = change.metrics;
                const newValue = change.metrics?.current?.[metricName];
                console.debug(`Updating link ${source}->${target} to ${newValue}`);

                // Select and update both the line and arrow elements
                const line = d3.select(`line.link-half[source="${source}"][target="${target}"]`);
                const arrow = d3.select(`path.link-half[source="${source}"][target="${target}"]`);
                console.debug(`Found line element: ${!line.empty()}, arrow element: ${!arrow.empty()}`);

                if (!line.empty() && !arrow.empty()) {
                    const linkElements = { line, arrow };
                    // Update visual appearance using NetworkRenderer's method
                    this.visualizerCore.networkRenderer.updateLinkColor(linkElements, change.metrics);
                } else {
                    console.warn(`Could not find link elements for ${source}->${target}`);
                }

                // Update details panel if this is the selected link
                if (selectedElement) {
                    const selectedGroup = d3.select(selectedElement.closest("g"));
                    const selectedLine = selectedGroup.select("line.link-half");

                    if (selectedLine) {
                        const selectedSource = selectedLine.getAttribute("source");
                        const selectedTarget = selectedLine.getAttribute("target");

                        if (selectedSource === source && selectedTarget === target) {
                            detailsPanelManager.updateLinkDetails(linkData);
                        }
                    }
                }
            }
        });

        // Notify callbacks
        this.updateCallbacks.forEach(callback => callback(updates));
    }

    onUpdate(callback) {
        this.updateCallbacks.add(callback);
        return () => this.updateCallbacks.delete(callback);
    }

    async fetchNetworkUpdates(networkId) {
        // This should be implemented based on your backend API
        throw new Error("fetchNetworkUpdates must be implemented");
    }
}
