import { ColorUtils } from "./utils/ColorUtils.js";
import { GeometryUtils } from "./utils/GeometryUtils.js";

export class NetworkRenderer {
    constructor(containerId, config) {
        this.containerId = containerId;
        this.config = config;
        // Ensure we're selecting the SVG element correctly
        this.svg = d3.select(containerId);
        if (this.svg.empty()) {
            console.error(`No SVG element found with selector: ${containerId}`);
        }
    }

    createVisualization(data, onNodeClick, onLinkClick) {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = this.svg.node();

        // Clear existing content
        this.svg.selectAll("*").remove();

        // Set SVG to be responsive
        this.svg
            .attr("width", "100%")
            .attr("height", "100%");

        // Calculate network bounds and set viewBox
        const bounds = GeometryUtils.calculateNetworkBounds(data.nodes);
        this.svg
            .attr("viewBox", `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        // Create groups for organizing elements
        const linkGroup = this.svg.append("g").attr("class", "links");
        const nodeGroup = this.svg.append("g").attr("class", "nodes");

        this.renderLinks(data, linkGroup, onLinkClick);
        this.renderNodes(data, nodeGroup, onNodeClick);

        return svg;
    }

    renderNodes(data, nodeGroup, onNodeClick) {
        const nodes = nodeGroup.selectAll("g.node")
            .data(data.nodes)
            .join("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x},${d.y})`);

        // Add selection highlight circle (initially hidden)
        nodes.append("circle")
            .attr("class", "selection-highlight")
            .attr("r", d => GeometryUtils.calculateNodeRadius(d, this.config) + 3)
            .attr("fill", "none")
            .attr("stroke", "#666")
            .attr("stroke-width", "2")
            .attr("opacity", "0");

        // Add main circle
        const circles = nodes.append("circle")
            .attr("r", d => GeometryUtils.calculateNodeRadius(d, this.config))
            .attr("fill", d => d.type === "cluster" ? "white" : ColorUtils.getColorForMetric(d.metrics, this.config))
            .attr("stroke", d => ColorUtils.getColorForMetric(d.metrics, this.config))
            .attr("stroke-width", d => d.type === "cluster" ? this.config.nodes.cluster.strokeWidth : this.config.nodes.leaf.strokeWidth)
            .style("cursor", d => d.type === "cluster" ? "pointer" : "default");

        // Add labels
        nodes.append("text")
            .attr("class", "node-label")
            .attr("y", d => -GeometryUtils.calculateNodeRadius(d, this.config) - 5)
            .attr("text-anchor", "middle")
            .text(d => d.id);

        // Add click handlers
        nodes.on("click", (event, d) => {
            event.stopPropagation();
            const circle = event.currentTarget.querySelector("circle:not(.selection-highlight)");
            const highlight = event.currentTarget.querySelector(".selection-highlight");
            onNodeClick(event, circle, highlight);
        });

        return nodes;
    }

    renderLinks(data, linkGroup, onLinkClick) {
        // Create a map for bidirectional links
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

        // Create array of link data for rendering
        const linkData = [];
        linkPairs.forEach((links, key) => {
            if (links.length === 2) { // Bidirectional
                links.forEach(link => {
                    const sourceNode = data.nodes.find(n => n.id === link.source);
                    const targetNode = data.nodes.find(n => n.id === link.target);
                    const midPoint = {
                        x: (sourceNode.x + targetNode.x) / 2,
                        y: (sourceNode.y + targetNode.y) / 2
                    };
                    linkData.push({ ...link, endPoint: midPoint });
                });
            } else { // Unidirectional
                const link = links[0];
                const targetNode = data.nodes.find(n => n.id === link.target);
                linkData.push({ ...link, endPoint: targetNode });
            }
        });

        // Create link groups
        const linkGroups = linkGroup.selectAll("g.link")
            .data(linkData)
            .join("g")
            .attr("class", "link");

        // Add selection highlight (initially hidden)
        linkGroups.append("line")
            .attr("class", "link-selection")
            .attr("stroke", "#666")
            .attr("stroke-width", this.config.links.width + 4)
            .attr("opacity", "0");

        // Add main line
        const lines = linkGroups.append("line")
            .attr("class", "link-half")
            .attr("source", d => d.source)
            .attr("target", d => d.target)
            .attr("stroke", d => ColorUtils.getColorForMetric(d.metrics, this.config))
            .attr("stroke-width", this.config.links.width);

        // Add arrowheads
        const arrows = linkGroups.append("path")
            .attr("class", "link-half")
            .attr("source", d => d.source)
            .attr("target", d => d.target)
            .attr("fill", d => ColorUtils.getColorForMetric(d.metrics, this.config))
            .attr("stroke", "none");

        // Update positions
        this.updateLinkPositions(linkGroups, data.nodes);

        // Add click handlers
        linkGroups.on("click", (event, d) => {
            event.stopPropagation();
            const line = event.currentTarget.querySelector("line.link-half");
            const highlight = event.currentTarget.querySelector(".link-selection");
            onLinkClick(event, line, highlight);
        });

        return linkGroups;
    }

    renderBidirectionalLink(linkGroup, links, nodes, onLinkClick) {
        const sourceNode = nodes.find(n => n.id === links[0].source);
        const targetNode = nodes.find(n => n.id === links[0].target);

        const sourceRadius = GeometryUtils.calculateNodeRadius(sourceNode, this.config);
        const targetRadius = GeometryUtils.calculateNodeRadius(targetNode, this.config);

        const endpoints = GeometryUtils.calculateLinkEndpoints(
            sourceNode, targetNode, sourceRadius, targetRadius
        );

        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;

        links.forEach(link => {
            const isSourceToTarget = link.source === links[0].source;
            const startNode = isSourceToTarget ? sourceNode : targetNode;
            const endPoint = { x: midX, y: midY };

            const startRadius = GeometryUtils.calculateNodeRadius(startNode, this.config);
            const startX = startNode.x + startRadius * (endPoint.x - startNode.x) / endpoints.length;
            const startY = startNode.y + startRadius * (endPoint.y - startNode.y) / endpoints.length;

            const linkUnitX = isSourceToTarget ? endpoints.unitX : -endpoints.unitX;
            const linkUnitY = isSourceToTarget ? endpoints.unitY : -endpoints.unitY;

            const arrow = GeometryUtils.calculateArrowPoints(
                endPoint.x,
                endPoint.y,
                linkUnitX,
                linkUnitY,
                this.config.links.arrowSize
            );

            this.drawLink(linkGroup, startX, startY, arrow, link, onLinkClick);
        });
    }

    renderUnidirectionalLink(linkGroup, link, nodes, onLinkClick) {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);

        const sourceRadius = GeometryUtils.calculateNodeRadius(sourceNode, this.config);
        const targetRadius = GeometryUtils.calculateNodeRadius(targetNode, this.config);

        const endpoints = GeometryUtils.calculateLinkEndpoints(
            sourceNode, targetNode, sourceRadius, targetRadius
        );

        const arrow = GeometryUtils.calculateArrowPoints(
            endpoints.endX,
            endpoints.endY,
            endpoints.unitX,
            endpoints.unitY,
            this.config.links.arrowSize
        );

        this.drawLink(linkGroup, endpoints.startX, endpoints.startY, arrow, link, onLinkClick);
    }

    drawLink(linkGroup, startX, startY, arrow, link, onLinkClick) {
        const svgNS = "http://www.w3.org/2000/svg";
        const group = document.createElementNS(svgNS, "g");

        // Create selection highlight element (initially hidden)
        const selectionHighlight = document.createElementNS(svgNS, "line");
        selectionHighlight.setAttribute("class", "link-selection");
        selectionHighlight.setAttribute("x1", startX);
        selectionHighlight.setAttribute("y1", startY);
        selectionHighlight.setAttribute("x2", arrow.base[0]);
        selectionHighlight.setAttribute("y2", arrow.base[1]);
        selectionHighlight.setAttribute("stroke", "#666");
        selectionHighlight.setAttribute("stroke-width", this.config.links.width + 4);
        selectionHighlight.setAttribute("opacity", "0");

        const linkLine = document.createElementNS(svgNS, "line");
        linkLine.setAttribute("class", "link-half");
        linkLine.setAttribute("source", link.source);
        linkLine.setAttribute("target", link.target);
        linkLine.setAttribute("x1", startX);
        linkLine.setAttribute("y1", startY);
        linkLine.setAttribute("x2", arrow.base[0]);
        linkLine.setAttribute("y2", arrow.base[1]);
        linkLine.setAttribute("stroke", ColorUtils.getColorForMetric(link.metrics, this.config));
        linkLine.setAttribute("stroke-width", this.config.links.width);

        // Store link data
        linkLine.__data__ = link;

        const arrowHead = document.createElementNS(svgNS, "path");
        arrowHead.setAttribute("class", "link-half");
        arrowHead.setAttribute("source", link.source);
        arrowHead.setAttribute("target", link.target);
        arrowHead.setAttribute("d", `
            M${arrow.left[0]},${arrow.left[1]}
            L${arrow.point[0]},${arrow.point[1]}
            L${arrow.right[0]},${arrow.right[1]}
            Z
        `);
        arrowHead.setAttribute("fill", ColorUtils.getColorForMetric(link.metrics, this.config));
        arrowHead.setAttribute("stroke", "none");

        // Store link data (same as line)
        arrowHead.__data__ = link;

        const handleClick = (event) => {
            event.stopPropagation();
            onLinkClick(event, linkLine, selectionHighlight);
        };

        // Add event listeners to both line and arrowhead
        [linkLine, arrowHead].forEach(element => {
            element.addEventListener("click", handleClick);
        });

        group.appendChild(selectionHighlight);
        group.appendChild(linkLine);
        group.appendChild(arrowHead);
        linkGroup.appendChild(group);
    }

    updateNodeColor(nodeElement, metrics, isCluster = false) {
        const newColor = ColorUtils.getColorForMetric(metrics, this.config);
        nodeElement
            .transition()
            .duration(750)
            .style("fill", isCluster ? "white" : newColor)
            .style("stroke", newColor);
    }

    updateLinkPositions(linkGroups, nodes) {
        linkGroups.each((d, i, elements) => {
            const group = d3.select(elements[i]);
            const sourceNode = nodes.find(n => n.id === d.source);
            const targetNode = nodes.find(n => n.id === d.target);

            const sourceRadius = GeometryUtils.calculateNodeRadius(sourceNode, this.config);
            const targetRadius = GeometryUtils.calculateNodeRadius(targetNode, this.config);

            const endpoints = GeometryUtils.calculateLinkEndpoints(
                sourceNode,
                d.endPoint.x ? d.endPoint : targetNode, // Use midpoint for bidirectional links
                sourceRadius,
                targetRadius
            );

            const arrow = GeometryUtils.calculateArrowPoints(
                endpoints.endX,
                endpoints.endY,
                endpoints.unitX,
                endpoints.unitY,
                this.config.links.arrowSize
            );

            // Update selection highlight
            group.select(".link-selection")
                .attr("x1", endpoints.startX)
                .attr("y1", endpoints.startY)
                .attr("x2", arrow.base[0])
                .attr("y2", arrow.base[1]);

            // Update main line
            group.select("line.link-half")
                .attr("x1", endpoints.startX)
                .attr("y1", endpoints.startY)
                .attr("x2", arrow.base[0])
                .attr("y2", arrow.base[1]);

            // Update arrowhead
            group.select("path.link-half")
                .attr("d", `
                    M${arrow.left[0]},${arrow.left[1]}
                    L${arrow.point[0]},${arrow.point[1]}
                    L${arrow.right[0]},${arrow.right[1]}
                    Z
                `);
        });
    }

    updateNodeColor(nodeElement, metrics, isCluster = false) {
        const newColor = ColorUtils.getColorForMetric(metrics, this.config);
        nodeElement
            .transition()
            .duration(750)
            .style("fill", isCluster ? "white" : newColor)
            .style("stroke", newColor);
    }

    updateLinkColor(linkElements, metrics) {
        const newColor = ColorUtils.getColorForMetric(metrics, this.config);
        linkElements.line.attr("stroke", newColor);
        linkElements.arrow.attr("fill", newColor);
    }
}
