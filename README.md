# NetworkVisualizer.js

> [!WARNING]
> This project is in early development stage. The API is unstable and the documentation is incomplete. Please do not use it in production yet.

> [!NOTE]
> This README is a work in progress and will be updated as the project evolves.


A flexible, interactive network topology visualization library for hierarchical network structures. Visualize complex network relationships with support for nested clusters, resource allocation metrics, and real-time updates.

![Network Visualization Demo](placeholder-for-demo-screenshot.png)

## Features

- 📊 Interactive network visualization with support for nested hierarchies
- 🎨 Dynamic color-coded resource allocation visualization
- 🔍 Drill-down navigation through network clusters
- 📱 Responsive design with dark mode support
- 📈 Real-time resource utilization monitoring
- 🔄 Bidirectional link visualization
- 📋 Detailed node and link information panel
- 🌐 Backend-agnostic design

## Installation

1. Download the latest release from the [releases page](https://github.com/Azzaare/NetworkVisualizer.js/releases)
2. Include the files in your project:
```html
<link rel="stylesheet" href="path/to/networkvisualizer.css">
<script src="path/to/networkvisualizer.js"></script>
```

## Quick Start

```html
<div id="network"></div>
<div id="details-panel"></div>

<script>
const visualizer = new NetworkVisualizer("#network", {
    nodes: {
        leaf: { radius: 8, strokeWidth: 2 },
        cluster: { radius: 12, strokeWidth: 3 }
    },
    links: {
        width: 5,
        arrowSize: 5
    }
});

// Load network data
visualizer.loadNetwork('root');
</script>
```

## API Reference

### Configuration

The visualizer accepts a configuration object matching this JSON structure:

```json
{
    "nodes": {
        "leaf": {
            "radius": 8,
            "strokeWidth": 2
        },
        "cluster": {
            "radius": 12,
            "strokeWidth": 3
        }
    },
    "links": {
        "width": 5,
        "arrowSize": 5
    },
    "colors": {
        "ranges": [
            { "max": 0, "color": "#006994" },
            { "max": 45, "color": "#4CAF50" },
            { "max": 55, "color": "#FFC107" },
            { "max": 75, "color": "#FF9800" },
            { "max": 100, "color": "#f44336" }
        ]
    }
}
```

### Network Data Format

Each network layer should be defined in a JSON file with the following structure:

```json
{
    "metadata": {
        "id": "root",
        "parentNetwork": null,
        "description": "Root network view",
        "timestamp": "2024-11-20T12:00:00Z"
    },
    "nodes": [
        {
            "id": "A",
            "x": 400,
            "y": 200,
            "allocation": 55,
            "type": "cluster",
            "childNetwork": "A"
        },
        {
            "id": "B",
            "x": 200,
            "y": 400,
            "allocation": 35,
            "type": "leaf"
        }
    ],
    "links": [
        {
            "source": "A",
            "target": "B",
            "allocation": 60,
            "capacity": "100"
        },
        {
            "source": "B",
            "target": "A",
            "allocation": 40,
            "capacity": "100"
        }
    ]
}
```

Note that:
- Each cluster node can reference a child network through the `childNetwork` field
- Links can be unidirectional or bidirectional (defined by separate link objects)
- The `allocation` field represents resource utilization (0-100%)
- Node types can be either `"cluster"` or `"leaf"`

## Backend Integration

NetworkVisualizer.js is designed to work with any backend that can serve data in the required JSON format. A reference implementation using [Oxygen.jl](https://github.com/ndortega/Oxygen.jl) is available at [NetworkVisualizer.jl](https://github.com/Azzaare/NetworkVisualizer.jl).

To implement your own backend, you need to provide these endpoints:

```
GET /api/config                    # Visualization configuration
GET /api/networks/{network_id}     # Network data
GET /api/networks                  # Available networks list
GET /api/hierarchy/{root_id?}      # Network hierarchy
```

See the [Backend Integration Guide](docs/backend-integration.md) for detailed implementation requirements.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.