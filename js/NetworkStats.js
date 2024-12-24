class NetworkStats {
    static calculate(network) {
        const stats = {
            totalNodes: network.nodes.length,
            clusterNodes: network.nodes.filter(n => n.type === 'cluster').length,
            leafNodes: network.nodes.filter(n => n.type === 'leaf').length,
            totalLinks: network.links.length,
            avgMetric: {
                nodes: 0,
                links: 0
            },
            maxMetric: {
                nodes: 0,
                links: 0
            },
            criticalMetrics: {
                nodes: [],
                links: []
            }
        };

        // Calculate node statistics
        const nodeMetrics = network.nodes.map(node => node.metrics?.current?.allocation ?? 0);
        stats.avgMetric.nodes = nodeMetrics.reduce((sum, val) => sum + val, 0) / stats.totalNodes;
        stats.maxMetric.nodes = Math.max(...nodeMetrics);
        stats.criticalMetrics.nodes = network.nodes
            .filter(node => (node.metrics?.current?.allocation ?? 0) > 75)
            .map(node => node.id);

        // Calculate link statistics
        const linkMetrics = network.links.map(link => link.metrics?.current?.allocation ?? 0);
        stats.avgMetric.links = linkMetrics.reduce((sum, val) => sum + val, 0) / stats.totalLinks;
        stats.maxMetric.links = Math.max(...linkMetrics);
        stats.criticalMetrics.links = network.links
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