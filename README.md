# Intersight - Grafana Scenes App Plugin

A Grafana Scenes-based app plugin for Cisco Intersight dashboards, targeting Grafana 12.x+.

## Prerequisites

- Node.js 20+
- Docker Desktop (running)
- npm

## Development Environment Setup

### 1. Install Dependencies

```bash
cd intersight-app
npm install
```

### 2. Build the Plugin

```bash
npm run build
```

### 3. Start Grafana (Docker)

```bash
docker compose up -d
```

This starts Grafana at http://localhost:3000 with:
- Anonymous admin access enabled (no login required)
- Plugin auto-loaded from the `dist/` folder
- Unsigned plugin allowed

### 4. Enable the Plugin

```bash
curl -X POST http://localhost:3000/api/plugins/intersight-app/settings \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'
```

### 5. Access the Plugin

Open http://localhost:3000/a/intersight-app

### 6. Development Mode (Watch)

For active development with auto-rebuild:

```bash
npm run dev
```

**Important**: Keep `npm run dev` running while developing. It watches for file changes and automatically rebuilds the plugin. After webpack finishes rebuilding, simply hard refresh your browser (Ctrl+Shift+R) to see changes. **No container restart is needed.**

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start webpack in watch mode for development (auto-rebuild on changes) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `docker compose up -d` | Start Grafana |
| `docker compose down` | Stop Grafana |
| `docker compose restart` | Restart Grafana container (troubleshooting only - use if Grafana seems stuck) |
| `docker logs grafana-scenes-dev` | View Grafana logs |

## Project Structure

```
myorg-scenesapp-app/
├── src/
│   ├── components/
│   │   ├── App.tsx          # Main app component
│   │   └── AppConfig.tsx    # Plugin configuration page
│   ├── pages/
│   │   └── HomePage.tsx     # Home page scene definition
│   ├── img/
│   │   └── logo.svg         # Plugin logo
│   ├── module.ts            # Plugin entry point
│   └── plugin.json          # Plugin metadata
├── dist/                    # Build output (mounted to Docker)
├── docker-compose.yaml      # Grafana dev environment
├── webpack.config.js        # Build configuration
├── package.json
└── tsconfig.json
```

## Key Technical Notes

- **Module Format**: SystemJS (required by Grafana)
- **@grafana/scenes**: Must be bundled (not external) - Grafana doesn't provide it at runtime
- **External packages**: react, react-dom, @grafana/data, @grafana/ui, @grafana/runtime, @emotion/css

## Troubleshooting

### Plugin not loading
1. Check Grafana logs: `docker logs grafana-scenes-dev`
2. Ensure plugin is enabled via API
3. Hard refresh browser (Ctrl+Shift+R)

### Changes not reflecting
1. **Verify `npm run dev` is running** - this is required for auto-rebuild during development
2. Wait for webpack to finish rebuilding (check terminal output for "webpack compiled successfully")
3. Hard refresh browser (Ctrl+Shift+R)
4. **Note**: Docker restart is NOT needed - the dist/ folder is mounted as a volume, changes are immediately available

### Grafana unresponsive or in bad state (troubleshooting only)
1. Check logs: `docker logs grafana-scenes-dev`
2. If Grafana seems stuck, try restarting: `docker compose restart`
3. If issues persist: `docker compose down && docker compose up -d`

### Build errors
Run `npm run typecheck` to see TypeScript errors
