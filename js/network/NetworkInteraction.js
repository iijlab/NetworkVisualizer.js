export class NetworkInteraction {
    constructor(detailsPanelManager, contextMenu) {
        this.selectedElement = null;
        this.detailsPanelManager = detailsPanelManager;
        this.contextMenu = contextMenu;
        this.currentNetwork = null;
    }

    setCurrentNetwork(network) {
        // Clear any existing selection when setting a new network
        this.clearSelection();

        // Set the new network
        this.currentNetwork = network;

        // Update details panel with network overview
        this.updateDetailsWithNetworkOverview();

        console.log(`Network ${network.metadata.id} set as current network`);
    }

    clearSelection() {
        if (this.selectedElement) {
            try {
                // Hide selection highlight
                if (this.selectedElement.previousSibling) {
                    this.selectedElement.previousSibling.setAttribute("opacity", "0");
                }
                this.selectedElement = null;

                // Update details panel with network overview
                this.updateDetailsWithNetworkOverview();

                console.log("Selection cleared successfully");
            } catch (error) {
                console.error("Error clearing selection:", error);
            }
        }
    }

    updateDetailsWithNetworkOverview() {
        if (!this.currentNetwork) return;
        this.detailsPanelManager.updateNetworkOverview(this.currentNetwork);
    }

    handleNodeClick(event, nodeElement, selectionHighlight) {
        // If clicking the same node, unselect it
        if (this.selectedElement === nodeElement) {
            this.clearSelection();
            return;
        }

        if (this.selectedElement) {
            // Hide previous selection highlight
            if (this.selectedElement.previousSibling) {
                this.selectedElement.previousSibling.setAttribute("opacity", "0");
            }
        }

        this.selectedElement = nodeElement;
        // Show selection highlight
        selectionHighlight.setAttribute("opacity", "0.3");

        const nodeData = nodeElement.__data__;
        this.updateDetailsPanel(nodeData, "node");

        return nodeData;
    }

    handleLinkClick(event, linkElement, selectionHighlight) {
        event.stopPropagation();

        // If clicking the same link, unselect it
        if (this.selectedElement === linkElement) {
            this.clearSelection();
            return;
        }

        if (this.selectedElement) {
            // Hide previous selection highlight
            if (this.selectedElement.previousSibling) {
                this.selectedElement.previousSibling.setAttribute("opacity", "0");
            }
        }

        this.selectedElement = linkElement;
        selectionHighlight.setAttribute("opacity", "0.8");

        const linkData = linkElement.__data__;
        this.updateDetailsPanel(linkData, "link");

        return linkData;
    }

    updateDetailsPanel(data, type) {
        if (!data) {
            this.updateDetailsWithNetworkOverview();
            return;
        }

        if (type === "node") {
            const nodeDetails = {
                ...data,
                allocation: data.metrics?.current?.allocation ?? 0
            };
            this.detailsPanelManager.updateNodeDetails(nodeDetails);
        } else if (type === "link") {
            const linkDetails = {
                ...data,
                allocation: data.metrics?.current?.allocation ?? 0,
                capacity: data.metrics?.current?.capacity ?? "N/A"
            };
            this.detailsPanelManager.updateLinkDetails(linkDetails);
        }
    }

    setupContextMenuHandlers(element, type) {
        const callbacks = {
            onViewDetails: (element, type) => {
                if (this.selectedElement !== element) {
                    if (this.selectedElement?.previousSibling) {
                        this.selectedElement.previousSibling.setAttribute("opacity", "0");
                    }
                    this.selectedElement = element;
                    element.previousSibling.setAttribute("opacity", "0.3");
                }
                this.updateDetailsPanel(element.__data__, type);
            },
            onExploreCluster: async (networkId) => {
                if (this.onClusterExplore) {
                    await this.onClusterExplore(networkId);
                }
            }
        };

        element.addEventListener("contextmenu", (event) =>
            this.contextMenu.handleContextMenu(event, element, type, callbacks));
        element.addEventListener("touchstart", (event) =>
            this.contextMenu.handleTouchStart(event, element, type, callbacks));
        element.addEventListener("touchmove", (event) =>
            this.contextMenu.handleTouchMove(event));
        element.addEventListener("touchend", () =>
            this.contextMenu.handleTouchEnd());
    }

    setClusterExploreHandler(handler) {
        this.onClusterExplore = handler;
    }

    getSelectedElement() {
        return this.selectedElement;
    }
}
