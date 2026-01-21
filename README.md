# Intersight - Grafana Scenes App Plugin

A Grafana Scenes-based app plugin for Cisco Intersight dashboards, targeting Grafana 12.x+.

## Prerequisites

- Node.js 20+
- Docker Desktop (running)
- npm

## Development Environment Setup

### 1. Install Dependencies

```bash
cd myorg-scenesapp-app
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

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start webpack in watch mode |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `docker compose up -d` | Start Grafana |
| `docker compose down` | Stop Grafana |
| `docker compose restart` | Restart Grafana (reload plugin) |
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
1. Run `npm run build` (or ensure `npm run dev` is running)
2. Hard refresh browser (Ctrl+Shift+R)

### Build errors
Run `npm run typecheck` to see TypeScript errors
