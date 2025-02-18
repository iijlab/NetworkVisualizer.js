export class NetworkContextMenu {
    constructor() {
        this.element = null;
        this.touchTimer = null;
        this.touchStartPosition = null;
        this.longPressDelay = 500;
        this.moveThreshold = 10;
        this.initialize();
    }

    initialize() {
        if (!this.element) {
            this.element = document.createElement("div");
            this.element.className = "context-menu";
            document.body.appendChild(this.element);

            // Close menu when clicking outside
            document.addEventListener("click", (e) => {
                if (!this.element.contains(e.target)) {
                    this.hide();
                }
            });

            // Handle theme changes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === "class") {
                        if (document.body.classList.contains("dark-mode")) {
                            this.element.classList.add("dark-mode");
                        } else {
                            this.element.classList.remove("dark-mode");
                        }
                    }
                });
            });

            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ["class"]
            });
        }
    }

    show(x, y, items) {
        this.element.innerHTML = items.map(item => `
            <div class="context-menu-item" style="
                padding: 8px 20px;
                cursor: pointer;
                white-space: nowrap;
                ${item.color ? `color: ${item.color};` : ""}
            ">${item.label}</div>
        `).join("");

        const menuItems = this.element.querySelectorAll(".context-menu-item");
        items.forEach((item, index) => {
            menuItems[index].addEventListener("click", () => {
                item.action();
                this.hide();
            });
        });

        this.element.style.display = "block";

        // Position menu within viewport bounds
        const rect = this.element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        x = Math.min(x, viewportWidth - rect.width);
        y = Math.min(y, viewportHeight - rect.height);

        this.element.style.left = x + "px";
        this.element.style.top = y + "px";
    }

    hide() {
        if (this.element) {
            this.element.style.display = "none";
        }
    }

    handleContextMenu(event, element, type, callbacks) {
        event.preventDefault();
        event.stopPropagation();

        const items = this.getContextMenuItems(element, type, callbacks);
        this.show(event.clientX, event.clientY, items);
    }

    handleTouchStart(event, element, type, callbacks) {
        const touch = event.touches[0];
        this.touchStartPosition = {
            x: touch.clientX,
            y: touch.clientY
        };

        this.touchTimer = setTimeout(() => {
            const items = this.getContextMenuItems(element, type, callbacks);
            this.show(touch.clientX, touch.clientY, items);
        }, this.longPressDelay);
    }

    handleTouchMove(event) {
        if (!this.touchStartPosition) return;

        const touch = event.touches[0];
        const xDiff = Math.abs(touch.clientX - this.touchStartPosition.x);
        const yDiff = Math.abs(touch.clientY - this.touchStartPosition.y);

        if (xDiff > this.moveThreshold || yDiff > this.moveThreshold) {
            clearTimeout(this.touchTimer);
            this.touchStartPosition = null;
        }
    }

    handleTouchEnd() {
        if (this.touchTimer) {
            clearTimeout(this.touchTimer);
        }
        this.touchStartPosition = null;
    }

    getContextMenuItems(element, type, callbacks) {
        const baseItems = [
            {
                label: "View Details",
                action: () => callbacks.onViewDetails(element, type)
            }
        ];

        if (type === "node" && element.__data__.type === "cluster") {
            baseItems.push({
                label: "Explore Cluster",
                action: () => callbacks.onExploreCluster(element.__data__.childNetwork)
            });
        }

        // Add type-specific items
        if (type === "link") {
            baseItems.push({
                label: `Capacity: ${element.__data__.metrics?.current?.capacity ?? "N/A"}`,
                action: () => { } // This is just informational
            });
        }

        // Add monitoring-related items
        baseItems.push(
            {
                label: "Set Alert",
                action: () => {
                    console.log("Set alert for:", element.__data__.id ||
                        `${element.__data__.source}->${element.__data__.target}`);
                }
            },
            {
                label: "Mark for Review",
                color: document.body.classList.contains("dark-mode") ? "#ff6b6b" : "#f44336",
                action: () => {
                    console.log("Marked for review:", element.__data__.id ||
                        `${element.__data__.source}->${element.__data__.target}`);
                }
            }
        );

        return baseItems;
    }
}
