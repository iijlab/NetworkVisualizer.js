export class NetworkPathManager {
    constructor(containerSelector) {
        this.pathContainer = document.querySelector(containerSelector);
        this.networkPath = [];
    }

    updatePath(networkId, onNavigate) {
        // Add current network to path if it's not already the last item
        if (!this.networkPath.length || this.networkPath[this.networkPath.length - 1] !== networkId) {
            this.networkPath.push(networkId);
        }

        // Clear and render the path
        this.pathContainer.innerHTML = "";

        this.networkPath.forEach((pathNetworkId, index) => {
            if (index > 0) {
                const separator = document.createElement("span");
                separator.className = "path-separator";
                separator.textContent = " / ";
                this.pathContainer.appendChild(separator);
            }

            const segment = document.createElement("span");
            segment.className = "path-segment";
            if (pathNetworkId.length > 20) {
                segment.classList.add("truncated");
                segment.title = pathNetworkId; // Show full path on hover
            }
            segment.textContent = pathNetworkId;

            // Add click handler for navigation
            segment.addEventListener("click", () => {
                // Navigate to this level and truncate the path
                this.networkPath = this.networkPath.slice(0, index + 1);
                onNavigate(pathNetworkId);
            });

            this.pathContainer.appendChild(segment);
        });
    }

    getCurrentPath() {
        return [...this.networkPath];
    }

    getCurrentNetwork() {
        return this.networkPath[this.networkPath.length - 1];
    }

    clear() {
        this.networkPath = [];
        this.pathContainer.innerHTML = "";
    }
}
