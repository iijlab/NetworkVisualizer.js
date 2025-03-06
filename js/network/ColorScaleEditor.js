export class ColorScaleEditor {
    constructor() {
        this.modalId = 'colorScaleModal';
        this.currentMetric = null;
        this.currentMetricConfig = null;
        this.config = null;
        this.onSaveCallback = null;
        this.colorStops = [];
        this.ranges = [];

        // Create modal if it doesn't exist
        this.createModal();

        // Initialize event handlers
        this.setupEventHandlers();
    }

    createModal() {
        // Check if modal already exists
        if (document.getElementById(this.modalId)) {
            return;
        }

        // Create modal element
        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.className = 'reveal';
        modal.setAttribute('data-reveal', '');

        // Set modal content
        modal.innerHTML = `
            <h3>Color Scale Editor</h3>
            <div class="color-scale-editor">
                <div class="mode-selector">
                    <label for="colorScaleMode">Color Scale Mode:</label>
                    <select id="colorScaleMode" class="mode-select">
                        <option value="continuous">Continuous</option>
                        <option value="range">Range</option>
                    </select>
                </div>

                <!-- Continuous Editor -->
                <div class="editor-content" id="continuous-editor">
                    <h4>Color List</h4>
                    <div class="color-list" id="colorList">
                        <!-- Color items will be added here -->
                    </div>
                    <button class="add-color-btn" id="addColorBtn">Add Color</button>

                    <div class="scale-container">
                        <div class="color-gradient" id="gradient"></div>
                    </div>

                    <div class="markers" id="markers">
                        <!-- Markers will be added here -->
                    </div>

                    <div class="slider-container">
                        <label for="colorSlider">Select a point on the scale:</label>
                        <input type="range" id="colorSlider" min="0" max="1000" value="0" step="1">
                        <span id="sliderValue">0.0</span>

                        <div class="color-indicator" id="colorIndicator"></div>
                        <div class="color-value" id="colorValue"></div>
                    </div>
                </div>

                <!-- Range Editor -->
                <div class="editor-content" id="range-editor">
                    <h4>Range List</h4>
                    <div class="range-list" id="rangeList">
                        <!-- Range items will be added here -->
                    </div>
                    <button class="add-range-btn" id="addRangeBtn">Add Range</button>
                </div>

                <div class="modal-footer">
                    <button class="button secondary" data-close>Cancel</button>
                    <button class="button primary" id="saveColorScale">Save</button>
                </div>
            </div>

            <button class="close-button" data-close aria-label="Close modal" type="button">
                <span aria-hidden="true">&times;</span>
            </button>
        `;

        // Add modal to document
        document.body.appendChild(modal);

        // Add CSS link if not already added
        if (!document.querySelector('link[href="css/color-scale-editor.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/color-scale-editor.css';
            document.head.appendChild(link);
        }

        // Initialize Foundation modal
        $(document).ready(() => {
            try {
                $(document).foundation();
            } catch (error) {
                console.warn("Error initializing modal:", error);
            }
        });
    }

    setupEventHandlers() {
        // Mode selector change event
        $(document).on('change', '#colorScaleMode', (e) => {
            const mode = $(e.currentTarget).val();

            // Update active content
            $('.editor-content').removeClass('active');
            $(`#${mode}-editor`).addClass('active');
        });

        // Add color button
        $(document).on('click', '#addColorBtn', () => {
            this.addColorStop();
        });

        // Add range button
        $(document).on('click', '#addRangeBtn', () => {
            this.addRange();
        });

        // Save button
        $(document).on('click', '#saveColorScale', () => {
            this.saveColorScale();
        });

        // Color slider
        $(document).on('input', '#colorSlider', () => {
            this.updateColorDisplay();
        });

        // Modal open event
        $(document).on('open.zf.reveal', `#${this.modalId}`, () => {
            this.initializeEditor();
        });
    }

    open(config, metricName, onSave) {
        this.config = config;
        this.currentMetric = metricName;
        this.onSaveCallback = onSave;

        // Get metric configuration
        this.currentMetricConfig = this.config.visualization.metrics?.[metricName] || {};

        console.debug('Opening color scale editor for metric:', metricName);
        console.debug('Config:', config);
        console.debug('Metric config:', this.currentMetricConfig);
        console.debug('Metric type:', this.currentMetricConfig.type || 'range (default)');

        // Open modal
        $(`#${this.modalId}`).foundation('open');
    }

    initializeEditor() {
        // Determine which mode to show based on metric type
        // Default to 'range' if no type is specified
        const metricType = this.currentMetricConfig.type || 'range';

        console.debug('Initializing editor with metric type:', metricType, 'for metric:', this.currentMetric);
        console.debug('Current metric config:', this.currentMetricConfig);

        // Set selected mode in dropdown
        $('#colorScaleMode').val(metricType);

        // Set active content
        $('.editor-content').removeClass('active');
        $(`#${metricType}-editor`).addClass('active');

        if (metricType === 'continuous') {
            this.initializeContinuousEditor();
        } else {
            this.initializeRangeEditor();
        }
    }

    initializeContinuousEditor() {
        console.debug('Initializing continuous editor with config:', this.currentMetricConfig);

        // Get color stops from config or create default
        let colorStops = [];

        if (this.currentMetricConfig.colorScale) {
            if (this.currentMetricConfig.colorScale.stops) {
                // Use existing stops
                colorStops = [...this.currentMetricConfig.colorScale.stops];
                console.debug('Using existing color stops:', colorStops);
            } else if (this.currentMetricConfig.colorScale.min && this.currentMetricConfig.colorScale.max) {
                // Convert min/max to stops
                colorStops = [
                    { position: 0, color: this.currentMetricConfig.colorScale.min },
                    { position: 1, color: this.currentMetricConfig.colorScale.max }
                ];
                console.debug('Created stops from min/max:', colorStops);
            }
        }

        // Ensure we have at least 2 stops
        if (colorStops.length < 2) {
            // Use default colors from the example
            colorStops = [
                { position: 0, color: "#00FF00" },  // Green
                { position: 0.5, color: "#FFFF00" }, // Yellow
                { position: 1, color: "#FF0000" }   // Red
            ];
            console.debug('Using default color stops:', colorStops);
        }

        // Sort stops by position
        colorStops.sort((a, b) => a.position - b.position);

        // Store color stops
        this.colorStops = colorStops;

        // Render color list
        this.renderColorList();

        // Update gradient
        this.updateGradient();

        // Initialize slider
        this.updateColorDisplay();
    }

    initializeRangeEditor() {
        console.debug('Initializing range editor with config:', this.currentMetricConfig);

        // Get ranges from config or create default
        let ranges = [];

        if (this.currentMetricConfig.ranges) {
            // Use existing ranges
            ranges = [...this.currentMetricConfig.ranges];
            console.debug('Using existing ranges:', ranges);
        } else if (this.config.visualization.ranges) {
            // Use default ranges from global config
            ranges = [...this.config.visualization.ranges];
            console.debug('Using global ranges:', ranges);
        }

        // Ensure we have at least 2 ranges
        if (ranges.length < 2) {
            ranges = [
                { max: 0, color: "#006994" },
                { max: 100, color: "#f44336" }
            ];
            console.debug('Using default ranges:', ranges);
        }

        // Sort ranges by max value
        ranges.sort((a, b) => a.max - b.max);

        // Store ranges
        this.ranges = ranges;

        // Render range list
        this.renderRangeList();
    }

    renderColorList() {
        const colorList = document.getElementById('colorList');
        colorList.innerHTML = '';

        this.colorStops.forEach((stop, index) => {
            const colorItem = document.createElement('div');
            colorItem.className = 'color-item';
            colorItem.dataset.index = index;

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = stop.color;
            colorInput.dataset.index = index;
            colorInput.addEventListener('input', () => {
                this.colorStops[index].color = colorInput.value;
                this.updateGradient();
            });

            const indexSpan = document.createElement('span');
            indexSpan.textContent = index;
            indexSpan.style.marginRight = '10px';
            indexSpan.style.marginLeft = '5px';

            const positionLabel = document.createElement('span');
            positionLabel.textContent = 'Position:';

            const positionInput = document.createElement('input');
            positionInput.type = 'number';
            positionInput.className = 'position-input';
            positionInput.min = 0;
            positionInput.max = 1;
            positionInput.step = 0.01;
            positionInput.value = stop.position;
            positionInput.dataset.index = index;
            positionInput.addEventListener('input', () => {
                const value = parseFloat(positionInput.value);
                if (!isNaN(value) && value >= 0 && value <= 1) {
                    this.colorStops[index].position = value;
                    this.updateGradient();
                }
            });

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '×';
            removeBtn.dataset.index = index;
            removeBtn.addEventListener('click', () => {
                if (this.colorStops.length > 2) {
                    this.colorStops.splice(index, 1);
                    this.renderColorList();
                    this.updateGradient();
                } else {
                    alert("You need at least 2 colors!");
                }
            });

            colorItem.appendChild(colorInput);
            colorItem.appendChild(indexSpan);
            colorItem.appendChild(positionLabel);
            colorItem.appendChild(positionInput);
            colorItem.appendChild(removeBtn);

            colorList.appendChild(colorItem);
        });
    }

    renderRangeList() {
        const rangeList = document.getElementById('rangeList');
        rangeList.innerHTML = '';

        this.ranges.forEach((range, index) => {
            const rangeItem = document.createElement('div');
            rangeItem.className = 'range-item';
            rangeItem.dataset.index = index;

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = range.color;
            colorInput.dataset.index = index;
            colorInput.addEventListener('input', () => {
                this.ranges[index].color = colorInput.value;
            });

            const maxLabel = document.createElement('span');
            maxLabel.textContent = 'Max Value:';

            const maxInput = document.createElement('input');
            maxInput.type = 'number';
            maxInput.min = 0;
            maxInput.max = 100;
            maxInput.step = 1;
            maxInput.value = range.max;
            maxInput.dataset.index = index;
            maxInput.addEventListener('input', () => {
                const value = parseInt(maxInput.value, 10);
                if (!isNaN(value) && value >= 0) {
                    this.ranges[index].max = value;
                }
            });

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '×';
            removeBtn.dataset.index = index;
            removeBtn.addEventListener('click', () => {
                if (this.ranges.length > 2) {
                    this.ranges.splice(index, 1);
                    this.renderRangeList();
                } else {
                    alert("You need at least 2 ranges!");
                }
            });

            rangeItem.appendChild(colorInput);
            rangeItem.appendChild(maxLabel);
            rangeItem.appendChild(maxInput);
            rangeItem.appendChild(removeBtn);

            rangeList.appendChild(rangeItem);
        });
    }

    updateGradient() {
        const gradient = document.getElementById('gradient');
        const markers = document.getElementById('markers');

        // Sort stops by position
        this.colorStops.sort((a, b) => a.position - b.position);

        // Create CSS gradient string
        const gradientStops = this.colorStops.map(stop => {
            return `${stop.color} ${stop.position * 100}%`;
        }).join(', ');

        gradient.style.background = `linear-gradient(to right, ${gradientStops})`;

        // Update markers
        markers.innerHTML = '';
        markers.style.position = 'relative';
        markers.style.height = '20px';

        this.colorStops.forEach((stop, index) => {
            const marker = document.createElement('div');
            marker.className = 'marker';
            marker.textContent = index;
            marker.style.left = `${stop.position * 100}%`;
            markers.appendChild(marker);
        });

        this.updateColorDisplay();
    }

    updateColorDisplay() {
        const slider = document.getElementById('colorSlider');
        const sliderValue = document.getElementById('sliderValue');
        const colorIndicator = document.getElementById('colorIndicator');
        const colorValue = document.getElementById('colorValue');

        const position = slider.value / 1000;
        sliderValue.textContent = position.toFixed(2);

        const color = this.getColorAtPosition(position);
        colorIndicator.style.backgroundColor = color.rgb;
        colorValue.textContent = `${color.hex} / ${color.rgb}`;
    }

    getColorAtPosition(position) {
        // Ensure position is between 0 and 1
        position = Math.max(0, Math.min(1, position));

        // Sort stops by position
        const stops = [...this.colorStops].sort((a, b) => a.position - b.position);

        // If position is exactly on a color stop, return that color
        const exactStop = stops.find(stop => stop.position === position);
        if (exactStop) {
            return {
                rgb: this.hexToRgb(exactStop.color),
                hex: exactStop.color
            };
        }

        // Find the color stops that position falls between
        let beforeStop = stops[0];
        let afterStop = stops[stops.length - 1];

        for (let i = 0; i < stops.length - 1; i++) {
            if (position >= stops[i].position && position <= stops[i + 1].position) {
                beforeStop = stops[i];
                afterStop = stops[i + 1];
                break;
            }
        }

        // Calculate how far position is between beforeStop and afterStop (0 to 1)
        const segmentLength = afterStop.position - beforeStop.position;
        const segmentPosition = segmentLength === 0 ? 0 : (position - beforeStop.position) / segmentLength;

        // Get RGB values for both colors
        const startColor = this.hexToRgbObj(beforeStop.color);
        const endColor = this.hexToRgbObj(afterStop.color);

        // Interpolate between colors
        const r = Math.round(startColor.r + segmentPosition * (endColor.r - startColor.r));
        const g = Math.round(startColor.g + segmentPosition * (endColor.g - startColor.g));
        const b = Math.round(startColor.b + segmentPosition * (endColor.b - startColor.b));

        return {
            rgb: `rgb(${r}, ${g}, ${b})`,
            hex: this.rgbToHex(r, g, b)
        };
    }

    hexToRgbObj(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    hexToRgb(hex) {
        const rgb = this.hexToRgbObj(hex);
        return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    addColorStop() {
        // Generate a random color
        const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        // Find a good position for the new stop
        let position = 0.5;
        if (this.colorStops.length >= 2) {
            // Find the largest gap between stops
            let maxGap = 0;
            let gapPosition = 0.5;

            const sortedStops = [...this.colorStops].sort((a, b) => a.position - b.position);

            for (let i = 0; i < sortedStops.length - 1; i++) {
                const gap = sortedStops[i + 1].position - sortedStops[i].position;
                if (gap > maxGap) {
                    maxGap = gap;
                    gapPosition = sortedStops[i].position + gap / 2;
                }
            }

            position = gapPosition;
        }

        // Add new stop
        this.colorStops.push({
            position: position,
            color: randomColor
        });

        // Update UI
        this.renderColorList();
        this.updateGradient();
    }

    addRange() {
        // Find a good max value for the new range
        let maxValue = 50;
        if (this.ranges.length >= 2) {
            // Sort ranges by max value
            const sortedRanges = [...this.ranges].sort((a, b) => a.max - b.max);

            // Find a value between the last two ranges
            const lastMax = sortedRanges[sortedRanges.length - 1].max;
            const secondLastMax = sortedRanges[sortedRanges.length - 2].max;

            maxValue = Math.floor((lastMax + secondLastMax) / 2);
        }

        // Generate a random color
        const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        // Add new range
        this.ranges.push({
            max: maxValue,
            color: randomColor
        });

        // Update UI
        this.renderRangeList();
    }

    saveColorScale() {
        // Get active mode
        const activeMode = $('#colorScaleMode').val();

        // Validate minimum number of colors/ranges
        if (activeMode === 'continuous' && this.colorStops.length < 2) {
            alert("You need at least 2 colors for a continuous scale!");
            return;
        }

        if (activeMode === 'range' && this.ranges.length < 2) {
            alert("You need at least 2 ranges for a range scale!");
            return;
        }

        // Update metric configuration
        if (activeMode === 'continuous') {
            // Sort stops by position
            this.colorStops.sort((a, b) => a.position - b.position);

            // Update config
            if (!this.currentMetricConfig.colorScale) {
                this.currentMetricConfig.colorScale = {};
            }

            this.currentMetricConfig.colorScale.stops = [...this.colorStops];

            // For backward compatibility, also set min and max
            this.currentMetricConfig.colorScale.min = this.colorStops[0].color;
            this.currentMetricConfig.colorScale.max = this.colorStops[this.colorStops.length - 1].color;

            // Set type to continuous
            this.currentMetricConfig.type = 'continuous';
        } else {
            // Sort ranges by max value
            this.ranges.sort((a, b) => a.max - b.max);

            // Update config
            this.currentMetricConfig.ranges = [...this.ranges];

            // Set type to range
            this.currentMetricConfig.type = 'range';
        }

        // Update metrics config
        if (!this.config.visualization.metrics) {
            this.config.visualization.metrics = {};
        }

        this.config.visualization.metrics[this.currentMetric] = this.currentMetricConfig;

        console.debug('Saving color scale config:', this.currentMetricConfig);

        // Close modal
        $(`#${this.modalId}`).foundation('close');

        // Call save callback
        if (this.onSaveCallback) {
            this.onSaveCallback(this.config);
        }
    }
}
