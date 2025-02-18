export class GeometryUtils {
    static calculateNodeRadius(node, config) {
        return node.type === "cluster"
            ? config.nodes.cluster.radius
            : config.nodes.leaf.radius;
    }

    static calculateArrowPoints(x, y, unitX, unitY, arrowSize) {
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

    static calculateLinkEndpoints(sourceNode, targetNode, sourceRadius, targetRadius) {
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const unitX = dx / length;
        const unitY = dy / length;

        return {
            startX: sourceNode.x + sourceRadius * unitX,
            startY: sourceNode.y + sourceRadius * unitY,
            endX: targetNode.x - targetRadius * unitX,
            endY: targetNode.y - targetRadius * unitY,
            unitX,
            unitY,
            length
        };
    }

    static calculateNetworkBounds(nodes, padding = 50) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x);
            maxY = Math.max(maxY, node.y);
        });

        return {
            minX: minX - padding,
            minY: minY - padding,
            maxX: maxX + padding,
            maxY: maxY + padding,
            width: (maxX - minX) + (2 * padding),
            height: (maxY - minY) + (2 * padding)
        };
    }
}
