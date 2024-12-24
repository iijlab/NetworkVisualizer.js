# NetworkVisualizer.js

A flexible, interactive network topology visualization library for hierarchical network structures. Perfect for visualizing complex network relationships with support for nested clusters, resource allocation metrics, and real-time updates.

![Network Visualization Demo](placeholder-for-demo-screenshot.png)

## Quick Start (Mock Data Development)

The simplest way to start developing with NetworkVisualizer.js is to use the provided mock data setup:

1. Install http-server if you haven't already:
   ```bash
   npm install -g http-server
   ```

2. Copy the repository files into your project directory

3. Start the server:
   ```bash
   http-server -p 8000
   ```

4. Open `index-mock.html` in your browser:
   ```
   http://localhost:8000/index-mock.html
   ```

This will start the visualization with mock data that updates automatically.

## Project Structure

```
networkvisualizer/
├── index.html          # Production version (needs backend)
├── index-mock.html     # Development version (with mock data)
├── js/                 # JavaScript files
├── css/               # CSS files
└── data/              # Mock data for development
    ├── config.json    # Visualization configuration
    └── networks/      # Network layer data
        ├── root.json
        ├── A.json
        ├── A2.json
        └── ...
```

## Backend Integration

NetworkVisualizer.js is backend-agnostic. Any backend that can serve the required API endpoints can be integrated. A reference implementation using [Oxygen.jl](https://github.com/ndortega/Oxygen.jl) is available at [NetworkVisualizer.jl](https://github.com/iijlab/NetworkVisualizer.jl).

### Required API Endpoints

Your backend needs to implement these endpoints:

1. `GET /api/config` - Returns visualization configuration:
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
    "visualization": {
        "metric": "allocation",
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

2. `GET /api/networks/{id}` - Returns network data for given ID:
```json
{
    "metadata": {
        "id": "root",
        "parentNetwork": null,
        "description": "Root network view",
        "lastUpdated": "2024-12-24T12:00:00Z",
        "updateInterval": 5000,
        "retentionPeriod": 3600
    },
    "nodes": [
        {
            "id": "A",
            "x": 400,
            "y": 200,
            "type": "cluster",
            "childNetwork": "A",
            "metrics": {
                "current": {
                    "allocation": 55,
                    "timestamp": "2024-12-24T12:00:00Z"
                },
                "history": [],
                "alerts": []
            }
        }
    ],
    "links": [
        {
            "source": "A",
            "target": "B",
            "metrics": {
                "current": {
                    "allocation": 60,
                    "capacity": 100,
                    "timestamp": "2024-12-24T12:00:00Z"
                },
                "history": [],
                "alerts": []
            }
        }
    ]
}
```

3. `GET /api/networks/{id}/updates` - Returns real-time updates:
```json
{
    "timestamp": "2024-12-24T12:00:05Z",
    "changes": {
        "nodes": {
            "A": {
                "metrics": {
                    "current": {
                        "allocation": 65,
                        "timestamp": "2024-12-24T12:00:05Z"
                    },
                    "alerts": []
                }
            }
        },
        "links": {
            "A->B": {
                "metrics": {
                    "current": {
                        "allocation": 70,
                        "timestamp": "2024-12-24T12:00:05Z"
                    },
                    "alerts": []
                }
            }
        }
    }
}
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT License - see [LICENSE](LICENSE) file for details