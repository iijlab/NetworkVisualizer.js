import { ColorUtils } from "./utils/ColorUtils.js";

export class NetworkUpdater {
    constructor(config) {
        this.config = config;
        this.updateInterval = null;
        this.lastUpdate = null;
        this.dataCache = new Map();
        this.updateCallbacks = new Set();
        this.transitions = {
            duration: 750,
            ease: d3.easeCubic
        };
    }

    startDynamicUpdates(networkId, mockDataGenerator = null) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        const updateInterval = 2000; // Default to 2 seconds
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

    applyNetworkUpdates(updates, svg, currentNetwork, detailsPanelManager, selectedElement) {
        if (!updates || !updates.changes) {
            console.warn("Invalid update data received");
            return;
        }

        const metricName = this.config.visualization.metric;

        // Update nodes
        Object.entries(updates.changes.nodes || {}).forEach(([id, change]) => {
            // Find node with matching text content
            const nodeGroups = svg.selectAll("g.node").filter(function () {
                return d3.select(this).select("text").text() === id;
            });

            nodeGroups.each(function () {
                const nodeGroup = d3.select(this);
                // Get the main circle (second circle, index 1)
                const circle = nodeGroup.select("circle:nth-child(2)");

                if (!circle.empty()) {
                    const newMetric = change.metrics?.current;
                    if (newMetric && newMetric[metricName] !== undefined) {
                        const newValue = newMetric[metricName];
                        console.log(`Updating node ${id} to ${newValue}`);

                        // Update stored data
                        const nodeData = currentNetwork.nodes.find(n => n.id === id);
                        if (nodeData) {
                            nodeData.metrics = change.metrics;

                            // Determine if it's a cluster node (has white fill)
                            const isCluster = circle.attr("fill") === "white";
                            const newColor = ColorUtils.getColorForMetric(change.metrics, this.config);

                            // Update visual appearance
                            circle.transition()
                                .duration(750)
                                .style("fill", isCluster ? "white" : newColor)
                                .style("stroke", newColor);

                            // Update details panel if this is the selected node
                            if (selectedElement) {
                                const selectedNode = selectedElement.closest("g");
                                const selectedNodeId = selectedNode.querySelector("text").textContent;

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
            });
        });

        // Update links
        Object.entries(updates.changes.links || {}).forEach(([id, change]) => {
            const [source, target] = id.split("->");

            // Find and update the link data
            const linkData = currentNetwork.links.find(
                l => l.source === source && l.target === target
            );

            if (linkData) {
                // Update the stored data and get new color
                linkData.metrics = change.metrics;
                const newColor = ColorUtils.getColorForMetric(change.metrics, this.config);

                // Select and update both the line and arrow elements
                const line = d3.select(`line.link-half[source="${source}"][target="${target}"]`);
                const arrow = d3.select(`path.link-half[source="${source}"][target="${target}"]`);

                line.attr("stroke", newColor);
                arrow.attr("fill", newColor);

                // Update details panel if this is the selected link
                if (selectedElement) {
                    const selectedGroup = selectedElement.closest("g");
                    const selectedLine = selectedGroup.querySelector("line.link-half");

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
