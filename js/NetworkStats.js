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
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkStats;
} else {
    window.NetworkStats = NetworkStats;
}