export class NetworkThemeManager {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.createThemeToggle();
        this.setupSystemThemeDetection();
        this.applyInitialTheme();
    }

    createThemeToggle() {
        const navBar = document.querySelector(".navigation-bar");
        if (!navBar) return;

        const themeToggle = document.createElement("button");
        themeToggle.className = "theme-toggle";
        themeToggle.innerHTML = `
            <svg class="sun-icon" viewBox="0 0 24 24" width="18" height="18">
                <circle cx="12" cy="12" r="4" fill="currentColor"/>
                <!-- Primary rays -->
                <rect x="11" y="2" width="2" height="6" rx="1" fill="currentColor"/>
                <rect x="11" y="16" width="2" height="6" rx="1" fill="currentColor"/>
                <rect x="16" y="11" width="6" height="2" rx="1" fill="currentColor"/>
                <rect x="2" y="11" width="6" height="2" rx="1" fill="currentColor"/>
                <!-- Diagonal rays -->
                <g transform="translate(12 12)">
                    <g transform="rotate(45)">
                        <rect x="-1" y="-10" width="2" height="6" rx="1" fill="currentColor"/>
                    </g>
                    <g transform="rotate(135)">
                        <rect x="-1" y="-10" width="2" height="6" rx="1" fill="currentColor"/>
                    </g>
                    <g transform="rotate(225)">
                        <rect x="-1" y="-10" width="2" height="6" rx="1" fill="currentColor"/>
                    </g>
                    <g transform="rotate(315)">
                        <rect x="-1" y="-10" width="2" height="6" rx="1" fill="currentColor"/>
                    </g>
                </g>
            </svg>
            <svg class="moon-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" fill="currentColor"/>
            </svg>
        `;

        themeToggle.addEventListener("click", () => this.toggleTheme());
        navBar.insertBefore(themeToggle, navBar.firstChild);
    }

    setupSystemThemeDetection() {
        // Watch for system theme changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        mediaQuery.addEventListener("change", (e) => {
            if (!localStorage.getItem("theme")) {
                // Only auto-switch if user hasn't manually set a theme
                this.setTheme(e.matches ? "dark" : "light");
            }
        });
    }

    applyInitialTheme() {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            // Use system preference as default
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            this.setTheme(prefersDark ? "dark" : "light");
        }
    }

    toggleTheme() {
        const isDark = document.body.classList.contains("dark-mode");
        this.setTheme(isDark ? "light" : "dark");
        localStorage.setItem("theme", isDark ? "light" : "dark");
    }

    setTheme(theme) {
        if (theme === "dark") {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }
    }

    getCurrentTheme() {
        return document.body.classList.contains("dark-mode") ? "dark" : "light";
    }
}
