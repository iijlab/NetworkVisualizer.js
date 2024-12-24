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

class NetworkVisualizer {
    constructor(containerId, config = {}) {
        this.config = this.mergeConfig(DEFAULT_CONFIG, config);
        this.containerId = containerId;
        this.selectedElement = null;
        this.currentNetwork = null;
        this.detailsPanel = document.getElementById('details-panel');
        this.detailsPanel.classList.remove('hidden'); // Always show panel

        // Create the details panel manager
        this.detailsPanelManager = new DetailsPanelManager(this.detailsPanel);

        // Initialize network path
        this.networkPath = [];
        this.setupNavigationBar();

        // Properties for dynamic updates
        this.updateInterval = null;
        this.lastUpdate = null;
        this.dataCache = new Map();
        this.updateCallbacks = new Set();
        this.transitions = {
            duration: 750,
            ease: d3.easeCubic
        };

        // Add click handler to the container for blank space clicks
        const container = document.querySelector(this.containerId);
        container.addEventListener('click', (event) => {
            // Only handle clicks directly on the SVG, not on nodes or links
            if (event.target === container) {
                this.clearSelection();
            }
        });
    }

    // New method to start dynamic updates
    startDynamicUpdates(networkId) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        const network = this.currentNetwork;
        const updateInterval = network?.metadata?.updateInterval || 2000; // Default to 2 seconds

        console.log(`Starting dynamic updates for network ${networkId} with interval ${updateInterval}ms`);

        this.updateInterval = setInterval(async () => {
            if (this.mockDataGenerator) {
                const updates = this.mockDataGenerator.generateUpdate();
                console.log('Applying update:', updates);
                this.applyNetworkUpdates(updates);
            } else {
                try {
                    const updates = await this.fetchNetworkUpdates(networkId);
                    this.applyNetworkUpdates(updates);
                } catch (error) {
                    console.error('Error fetching network updates:', error);
                }
            }
        }, updateInterval);
    }

    // New method to fetch and apply updates
    async fetchAndApplyUpdates(networkId) {
        try {
            const updates = await this.fetchNetworkUpdates(networkId);
            if (!updates) return;

            this.applyNetworkUpdates(updates);
            this.lastUpdate = updates.timestamp;
        } catch (error) {
            console.error('Error fetching network updates:', error);
        }
    }

    getColorForMetric(metrics) {
        const metricName = this.config.visualization.metric;
        const value = metrics?.current?.[metricName] ?? 0;

        // Debug log
        console.log('Getting color for value:', value);

        const range = this.config.visualization.ranges.find(r => value <= r.max);
        const color = range ? range.color : this.config.visualization.ranges[this.config.visualization.ranges.length - 1].color;

        // Debug log
        console.log('Selected color:', color);

        return color;
    }

    // New method to apply updates with animations
    applyNetworkUpdates(updates) {
        if (!updates || !updates.changes) {
            console.warn('Invalid update data received');
            return;
        }

        const svg = d3.select(this.containerId);
        const metricName = this.config.visualization.metric;
        const self = this;

        // Update nodes
        Object.entries(updates.changes.nodes || {}).forEach(([id, change]) => {
            // Find node with matching text content
            const nodeGroups = svg.selectAll('g.node').filter(function () {
                return d3.select(this).select('text').text() === id;
            });

            nodeGroups.each(function () {
                const nodeGroup = d3.select(this);
                // Get the main circle (second circle, index 1)
                const circle = nodeGroup.select('circle:nth-child(2)');

                if (!circle.empty()) {
                    const newMetric = change.metrics?.current;
                    if (newMetric && newMetric[metricName] !== undefined) {
                        const newValue = newMetric[metricName];
                        console.log(`Updating node ${id} to ${newValue}`);

                        // Update stored data
                        const nodeData = self.currentNetwork.nodes.find(n => n.id === id);
                        if (nodeData) {
                            nodeData.metrics = change.metrics;

                            // Determine if it's a cluster node (has white fill)
                            const isCluster = circle.attr('fill') === 'white';
                            const newColor = self.getColorForMetric(change.metrics);

                            // Update visual appearance
                            circle.transition()
                                .duration(750)
                                .style('fill', isCluster ? 'white' : newColor)
                                .style('stroke', newColor);
                        }
                    }
                }
            });
        });

        // Update links
        Object.entries(updates.changes.links || {}).forEach(([id, change]) => {
            const [source, target] = id.split('->');

            // Find all link elements that match the source->target path
            svg.selectAll('g.link').each(function () {
                const linkGroup = d3.select(this);
                const linkLine = linkGroup.select('line.link-half');
                const linkArrow = linkGroup.select('path.link-half');

                // Check if this is our target link by examining its coordinates
                // We'll need to check against both the line and arrow coordinates
                if (linkLine.size() > 0 && linkArrow.size() > 0) {
                    const newMetric = change.metrics?.current;
                    if (newMetric && newMetric[metricName] !== undefined) {
                        const newValue = newMetric[metricName];
                        console.log(`Updating link ${source}->${target} to ${newValue}`);

                        const newColor = self.getColorForMetric(change.metrics);

                        // Update both line and arrowhead
                        linkLine.transition()
                            .duration(750)
                            .style('stroke', newColor);

                        linkArrow.transition()
                            .duration(750)
                            .style('fill', newColor)
                            .style('stroke', newColor);

                        // Update stored data
                        const linkData = self.currentNetwork.links.find(
                            l => l.source === source && l.target === target
                        );
                        if (linkData) {
                            linkData.metrics = change.metrics;
                        }
                    }
                }
            });
        });

        // Update details panel if selected element exists
        if (this.selectedElement) {
            const data = this.selectedElement.__data__;
            this.updateDetailsPanel(data,
                this.selectedElement.classList.contains('node') ? 'node' : 'link');
        }
    }

    // New method to register update callbacks
    onUpdate(callback) {
        this.updateCallbacks.add(callback);
        return () => this.updateCallbacks.delete(callback);
    }


    setupNavigationBar() {
        const container = document.querySelector('.visualization-container');

        // Create navigation bar
        const navBar = document.createElement('div');
        navBar.className = 'navigation-bar';

        // Create theme toggle button
        const themeToggle = document.createElement('button');
        themeToggle.className = 'theme-toggle';
        themeToggle.innerHTML = `
            <svg class="sun-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M12 17.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zm0 1.5a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-16a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm0 15a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1zM4 12a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1zm15 0a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1z"/>
            </svg>
            <svg class="moon-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
            </svg>
        `;

        // Create path container
        const pathContainer = document.createElement('div');
        pathContainer.className = 'network-path';

        navBar.appendChild(themeToggle);
        navBar.appendChild(pathContainer);
        container.insertBefore(navBar, container.firstChild);

        // Setup theme toggle functionality
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });

        // Set initial theme based on user preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
        }

        // Watch for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (e.matches) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        });
    }

    updateNetworkPath(networkId) {
        // Add current network to path if it's not already the last item
        if (!this.networkPath.length || this.networkPath[this.networkPath.length - 1] !== networkId) {
            this.networkPath.push(networkId);
        }

        // Render the path
        const pathContainer = document.querySelector('.network-path');
        pathContainer.innerHTML = '';

        this.networkPath.forEach((pathNetworkId, index) => {
            if (index > 0) {
                const separator = document.createElement('span');
                separator.className = 'path-separator';
                separator.textContent = ' / ';
                pathContainer.appendChild(separator);
            }

            const segment = document.createElement('span');
            segment.className = 'path-segment';
            if (pathNetworkId.length > 20) {
                segment.classList.add('truncated');
                segment.title = pathNetworkId; // Show full path on hover
            }
            segment.textContent = pathNetworkId;

            // Add click handler for navigation
            segment.addEventListener('click', () => {
                // Navigate to this level and truncate the path
                this.networkPath = this.networkPath.slice(0, index + 1);
                this.loadNetwork(pathNetworkId);
                // Update details panel with network overview
                this.updateDetailsWithNetworkOverview();
            });

            pathContainer.appendChild(segment);
        });
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
            colors: { ...defaultConfig.colors, ...userConfig.colors }
        };
    }

    calculateNetworkStats(network) {
        const stats = {
            totalNodes: network.nodes.length,
            clusterNodes: network.nodes.filter(n => n.type === 'cluster').length,
            leafNodes: network.nodes.filter(n => n.type === 'leaf').length,
            totalLinks: network.links.length,
            avgAllocation: {
                nodes: 0,
                links: 0
            },
            maxAllocation: {
                nodes: 0,
                links: 0
            },
            criticalResources: {
                nodes: [],
                links: []
            }
        };

        // Calculate node statistics
        const nodeAllocations = network.nodes.map(node => node.metrics?.current?.allocation ?? 0);
        stats.avgAllocation.nodes = nodeAllocations.reduce((sum, val) => sum + val, 0) / stats.totalNodes;
        stats.maxAllocation.nodes = Math.max(...nodeAllocations);
        stats.criticalResources.nodes = network.nodes
            .filter(node => (node.metrics?.current?.allocation ?? 0) > 75)
            .map(node => node.id);

        // Calculate link statistics
        const linkAllocations = network.links.map(link => link.metrics?.current?.allocation ?? 0);
        stats.avgAllocation.links = linkAllocations.reduce((sum, val) => sum + val, 0) / stats.totalLinks;
        stats.maxAllocation.links = Math.max(...linkAllocations);
        stats.criticalResources.links = network.links
            .filter(link => (link.metrics?.current?.allocation ?? 0) > 75)
            .map(link => `${link.source}->${link.target}`);

        return stats;
    }

    cleanup() {
        if (this.selectedElement) {
            // Hide selection highlight
            if (this.selectedElement.previousSibling) {
                this.selectedElement.previousSibling.setAttribute("opacity", "0");
            }
            this.selectedElement = null;
        }
        this.hideTooltip();
        const svg = document.querySelector(this.containerId);
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
    }

    clearSelection() {
        if (this.selectedElement) {
            // Hide selection highlight
            if (this.selectedElement.previousSibling) {
                this.selectedElement.previousSibling.setAttribute("opacity", "0");
            }
            this.selectedElement = null;
        }
        this.updateDetailsWithNetworkOverview();
    }

    getColorForAllocation(metrics) {
        const allocation = metrics?.current?.allocation ?? 0;
        const range = this.config.colors.ranges.find(r => allocation <= r.max);
        return range ? range.color : this.config.colors.ranges[this.config.colors.ranges.length - 1].color;
    }

    calculateNodeRadius(node) {
        return node.type === "cluster"
            ? this.config.nodes.cluster.radius
            : this.config.nodes.leaf.radius;
    }

    calculateArrowPoints(x, y, unitX, unitY) {
        const arrowSize = this.config.links.arrowSize;
        const height = (arrowSize * Math.sqrt(3)) / 2;
        const cos60 = Math.cos(Math.PI / 3);
        const sin60 = Math.sin(Math.PI / 3);

        const leftX = x - height * unitX + arrowSize / 2 * (-unitX * cos60 + unitY * sin60);
        const leftY = y - height * unitY + arrowSize / 2 * (-unitY * cos60 - unitX * sin60);
        const rightX = x - height * unitX + arrowSize / 2 * (-unitX * cos60 - unitY * sin60);
        const rightY = y - height * unitY + arrowSize / 2 * (-unitY * cos60 + unitX * sin60);

        return {
            point: [x, y],
            left: [leftX, leftY],
            right: [rightX, rightY],
            base: [(leftX + rightX) / 2, (leftY + rightY) / 2]
        };
    }

    renderBidirectionalLink(linkGroup, links, nodes) {
        const sourceNode = nodes.find(n => n.id === links[0].source);
        const targetNode = nodes.find(n => n.id === links[0].target);

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const unitX = dx / length;
        const unitY = dy / length;

        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;

        links.forEach(link => {
            const isSourceToTarget = link.source === links[0].source;
            const startNode = isSourceToTarget ? sourceNode : targetNode;
            const endPoint = { x: midX, y: midY };

            const startRadius = this.calculateNodeRadius(startNode);
            const startX = startNode.x + startRadius * (endPoint.x - startNode.x) / length;
            const startY = startNode.y + startRadius * (endPoint.y - startNode.y) / length;

            const linkUnitX = isSourceToTarget ? unitX : -unitX;
            const linkUnitY = isSourceToTarget ? unitY : -unitY;

            const arrow = this.calculateArrowPoints(
                endPoint.x,
                endPoint.y,
                linkUnitX,
                linkUnitY
            );

            this.drawLink(linkGroup, startX, startY, arrow, link);
        });
    }

    renderUnidirectionalLink(linkGroup, link, nodes) {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const unitX = dx / length;
        const unitY = dy / length;

        const sourceRadius = this.calculateNodeRadius(sourceNode);
        const targetRadius = this.calculateNodeRadius(targetNode);

        const startX = sourceNode.x + sourceRadius * unitX;
        const startY = sourceNode.y + sourceRadius * unitY;
        const endX = targetNode.x - targetRadius * unitX;
        const endY = targetNode.y - targetRadius * unitY;

        const arrow = this.calculateArrowPoints(endX, endY, unitX, unitY);
        this.drawLink(linkGroup, startX, startY, arrow, link);
    }

    drawLink(linkGroup, startX, startY, arrow, link) {
        const svgNS = "http://www.w3.org/2000/svg";
        const group = document.createElementNS(svgNS, "g");

        // Create selection highlight element (initially hidden)
        const selectionHighlight = document.createElementNS(svgNS, "line");
        selectionHighlight.setAttribute("class", "link-selection");
        selectionHighlight.setAttribute("x1", startX);
        selectionHighlight.setAttribute("y1", startY);
        selectionHighlight.setAttribute("x2", arrow.base[0]);
        selectionHighlight.setAttribute("y2", arrow.base[1]);
        selectionHighlight.setAttribute("stroke", "#666");  // Gray color
        selectionHighlight.setAttribute("stroke-width", this.config.links.width + 4);
        selectionHighlight.setAttribute("opacity", "0");    // Hidden by default

        const linkLine = document.createElementNS(svgNS, "line");
        linkLine.setAttribute("class", "link-half");
        linkLine.setAttribute("x1", startX);
        linkLine.setAttribute("y1", startY);
        linkLine.setAttribute("x2", arrow.base[0]);
        linkLine.setAttribute("y2", arrow.base[1]);
        linkLine.setAttribute("stroke", this.getColorForAllocation(link.metrics));
        linkLine.setAttribute("stroke-width", this.config.links.width);

        const arrowHead = document.createElementNS(svgNS, "path");
        arrowHead.setAttribute("class", "link-half");
        arrowHead.setAttribute("d", `
            M${arrow.left[0]},${arrow.left[1]}
            L${arrow.point[0]},${arrow.point[1]}
            L${arrow.right[0]},${arrow.right[1]}
            Z
        `);
        arrowHead.setAttribute("fill", this.getColorForAllocation(link.metrics));
        arrowHead.setAttribute("stroke", "none");

        const handleClick = (event) => {
            event.stopPropagation();
            if (this.selectedElement === linkLine) {
                this.clearSelection();
                return;
            }
            if (this.selectedElement) {
                if (this.selectedElement.previousSibling) {
                    this.selectedElement.previousSibling.setAttribute("opacity", "0");
                }
            }
            this.selectedElement = linkLine;
            selectionHighlight.setAttribute("opacity", "0.8");
            this.updateDetailsPanel(link, 'link');
        };

        [linkLine, arrowHead].forEach(element => {
            element.addEventListener("mouseover", (event) => this.showLinkTooltip(event, link));
            element.addEventListener("mouseout", () => this.hideTooltip());
            element.addEventListener("click", handleClick);
        });

        group.appendChild(selectionHighlight);  // Add highlight first (underneath)
        group.appendChild(linkLine);
        group.appendChild(arrowHead);
        linkGroup.appendChild(group);
    }

    showNodeTooltip(event, d) {
        const tooltip = document.getElementById("tooltip");
        tooltip.innerHTML = `
            <strong>Node ${d.id}</strong><br>
            Type: ${d.type}<br>
            Resource Allocation: ${d.metrics?.current?.allocation ?? 0}%
            ${d.type === "cluster" ? "<br>(Click to explore)" : ""}
        `;
        tooltip.style.left = (event.pageX + 10) + "px";
        tooltip.style.top = (event.pageY - 10) + "px";
        tooltip.style.display = "block";
    }

    showLinkTooltip(event, d) {
        const tooltip = document.getElementById("tooltip");
        tooltip.innerHTML = `
            <strong>${d.source} → ${d.target}</strong><br>
            Allocation: ${d.metrics?.current?.allocation ?? 0}%<br>
            Capacity: ${d.metrics?.current?.capacity ?? 'N/A'}
        `;
        tooltip.style.left = (event.pageX + 10) + "px";
        tooltip.style.top = (event.pageY - 10) + "px";
        tooltip.style.display = "block";
    }

    hideTooltip() {
        document.getElementById("tooltip").style.display = "none";
    }

    updateDetailsWithNetworkOverview() {
        if (!this.currentNetwork) return;
        this.detailsPanelManager.updateNetworkOverview(this.currentNetwork);
    }

    updateDetailsPanel(data, type) {
        if (!data) {
            this.updateDetailsWithNetworkOverview();
            return;
        }

        if (type === 'node') {
            const nodeDetails = {
                ...data,
                allocation: data.metrics?.current?.allocation ?? 0
            };
            this.detailsPanelManager.updateNodeDetails(nodeDetails);
        } else if (type === 'link') {
            const linkDetails = {
                ...data,
                allocation: data.metrics?.current?.allocation ?? 0,
                capacity: data.metrics?.current?.capacity ?? 'N/A'
            };
            this.detailsPanelManager.updateLinkDetails(linkDetails);
        }
    }

    async createVisualization(data) {
        this.currentNetwork = data;
        this.updateDetailsWithNetworkOverview();

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.querySelector(this.containerId);

        // Clear existing content
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }

        // Calculate the bounding box of the network
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        data.nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x);
            maxY = Math.max(maxY, node.y);
        });

        // Calculate network dimensions
        const networkWidth = maxX - minX;
        const networkHeight = maxY - minY;
        const networkCenterX = minX + networkWidth / 2;
        const networkCenterY = minY + networkHeight / 2;

        // Get SVG dimensions
        const svgRect = svg.getBoundingClientRect();
        const svgCenterX = svgRect.width / 2;
        const svgCenterY = svgRect.height / 2;

        // Calculate translation to center
        const translateX = svgCenterX - networkCenterX;
        const translateY = svgCenterY - networkCenterY;

        // Create a container group for all elements
        const mainGroup = document.createElementNS(svgNS, "g");
        mainGroup.setAttribute("transform", `translate(${translateX}, ${translateY})`);

        const linkGroup = document.createElementNS(svgNS, "g");
        const nodeGroup = document.createElementNS(svgNS, "g");

        mainGroup.appendChild(linkGroup);
        mainGroup.appendChild(nodeGroup);
        svg.appendChild(mainGroup);

        // Process links
        const linkPairs = new Map();
        data.links.forEach(link => {
            const nodes = [link.source, link.target].sort();
            const pairKey = `${nodes[0]}-${nodes[1]}`;

            if (!linkPairs.has(pairKey)) {
                linkPairs.set(pairKey, [link]);
            } else {
                linkPairs.get(pairKey).push(link);
            }
        });

        // Render links
        linkPairs.forEach((links, key) => {
            const isBidirectional = links.length === 2;
            if (isBidirectional) {
                this.renderBidirectionalLink(linkGroup, links, data.nodes);
            } else {
                this.renderUnidirectionalLink(linkGroup, links[0], data.nodes);
            }
        });

        // Create nodes
        data.nodes.forEach(node => {
            const nodeG = document.createElementNS(svgNS, "g");
            nodeG.setAttribute("class", "node");
            nodeG.setAttribute("transform", `translate(${node.x},${node.y})`);

            // Create selection highlight circle (initially hidden)
            const selectionHighlight = document.createElementNS(svgNS, "circle");
            selectionHighlight.setAttribute("r", this.calculateNodeRadius(node) + 3);
            selectionHighlight.setAttribute("fill", "none");
            selectionHighlight.setAttribute("stroke", "#666");  // Gray color
            selectionHighlight.setAttribute("stroke-width", "2");
            selectionHighlight.setAttribute("opacity", "0");    // Hidden by default

            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("r", this.calculateNodeRadius(node));
            circle.setAttribute("fill", node.type === "cluster" ? "white" :
                this.getColorForAllocation(node.metrics));
            circle.setAttribute("stroke", this.getColorForAllocation(node.metrics));
            circle.setAttribute("stroke-width", node.type === "cluster"
                ? this.config.nodes.cluster.strokeWidth
                : this.config.nodes.leaf.strokeWidth);
            circle.style.cursor = node.type === "cluster" ? "pointer" : "default";

            const label = document.createElementNS(svgNS, "text");
            label.setAttribute("class", "node-label");
            label.setAttribute("y", -this.calculateNodeRadius(node) - 5);
            label.setAttribute("text-anchor", "middle");
            label.textContent = node.id;

            const handleNodeClick = async (event) => {
                event.stopPropagation();
                this.hideTooltip();

                // If clicking the same node, unselect it
                if (this.selectedElement === circle) {
                    this.clearSelection();
                    return;
                }

                if (this.selectedElement) {
                    // Hide previous selection highlight
                    if (this.selectedElement.previousSibling) {
                        this.selectedElement.previousSibling.setAttribute("opacity", "0");
                    }
                }

                this.selectedElement = circle;
                // Show selection highlight
                selectionHighlight.setAttribute("opacity", "0.3");

                if (node.type === 'cluster' && node.childNetwork) {
                    const clusterNetwork = await this.fetchNetworkData(node.childNetwork);
                    this.updateDetailsPanel(node, 'node');
                    this.loadNetwork(node.childNetwork);
                } else {
                    this.updateDetailsPanel(node, 'node');
                }
            };

            nodeG.addEventListener("mouseover", (event) => this.showNodeTooltip(event, node));
            nodeG.addEventListener("mouseout", () => this.hideTooltip());
            nodeG.addEventListener("click", handleNodeClick);

            nodeG.appendChild(selectionHighlight);  // Add highlight first (underneath)
            nodeG.appendChild(circle);
            nodeG.appendChild(label);
            nodeGroup.appendChild(nodeG);
        });
    }


    // Update existing loadNetwork method to handle dynamic updates
    async loadNetwork(networkId) {
        try {
            this.cleanup();
            const networkData = await this.fetchNetworkData(networkId);
            if (!networkData) {
                throw new Error(`No data found for network: ${networkId}`);
            }

            // Store current network data
            this.currentNetwork = networkData;

            // Update network path
            this.updateNetworkPath(networkId);

            // Create visualization
            await this.createVisualization(networkData);

            // Update URL
            const url = new URL(window.location);
            url.searchParams.set("network", networkId);
            window.history.pushState({}, "", url);

            // Start dynamic updates
            this.startDynamicUpdates(networkId);

            console.log(`Network ${networkId} loaded and updates started`);
        } catch (error) {
            console.error("Error loading network data:", error);
            throw error;
        }
    }

    // New method to fetch network updates
    async fetchNetworkUpdates(networkId) {
        // This should be implemented based on your backend API
        throw new Error('fetchNetworkUpdates must be implemented');
    }

    async fetchNetworkData(networkId) {
        throw new Error('fetchNetworkData must be implemented');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkVisualizer;
} else {
    window.NetworkVisualizer = NetworkVisualizer;
}