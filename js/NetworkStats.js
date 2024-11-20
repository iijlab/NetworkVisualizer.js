class NetworkStats {
    static calculate(network) {
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
        stats.avgAllocation.nodes = network.nodes.reduce((sum, node) => sum + node.allocation, 0) / stats.totalNodes;
        stats.maxAllocation.nodes = Math.max(...network.nodes.map(node => node.allocation));
        stats.criticalResources.nodes = network.nodes
            .filter(node => node.allocation > 75)
            .map(node => node.id);

        // Calculate link statistics
        stats.avgAllocation.links = network.links.reduce((sum, link) => sum + link.allocation, 0) / stats.totalLinks;
        stats.maxAllocation.links = Math.max(...network.links.map(link => link.allocation));
        stats.criticalResources.links = network.links
            .filter(link => link.allocation > 75)
            .map(link => `${link.source}->${link.target}`);

        return stats;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkStats;
} else {
    window.NetworkStats = NetworkStats;
}