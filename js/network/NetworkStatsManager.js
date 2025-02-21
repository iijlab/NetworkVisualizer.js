export class NetworkStatsManager {
    constructor() {
        this.currentStats = null;
    }

    calculateNetworkStats(network) {
        const stats = {
            totalNodes: network.nodes.length,
            clusterNodes: network.nodes.filter(n => n.type === "cluster").length,
            leafNodes: network.nodes.filter(n => n.type === "leaf").length,
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

        this.currentStats = stats;
        return stats;
    }

    getCurrentStats() {
        return this.currentStats;
    }

    getCriticalResources() {
        if (!this.currentStats) return { nodes: [], links: [] };
        return this.currentStats.criticalResources;
    }

    getAverageAllocations() {
        if (!this.currentStats) return { nodes: 0, links: 0 };
        return this.currentStats.avgAllocation;
    }

    getMaxAllocations() {
        if (!this.currentStats) return { nodes: 0, links: 0 };
        return this.currentStats.maxAllocation;
    }

    getNodeCount(type = "all") {
        if (!this.currentStats) return 0;
        switch (type.toLowerCase()) {
            case "cluster":
                return this.currentStats.clusterNodes;
            case "leaf":
                return this.currentStats.leafNodes;
            default:
                return this.currentStats.totalNodes;
        }
    }

    getLinkCount() {
        if (!this.currentStats) return 0;
        return this.currentStats.totalLinks;
    }

    hasHighUtilization() {
        if (!this.currentStats) return false;
        return this.currentStats.maxAllocation.nodes > 75 ||
            this.currentStats.maxAllocation.links > 75;
    }
}
