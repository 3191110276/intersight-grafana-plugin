#!/bin/bash

# Validate Grafana Plugin using Docker
# This script runs the @grafana/plugin-validator inside a Docker container
# to work around Windows/MSYS compatibility issues.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PARENT_DIR="$(cd "$PROJECT_DIR/.." && pwd)"

# Convert Windows/MSYS path to Docker-compatible format
# Example: /c/Users/... -> //c/Users/... (double slash for MSYS Docker)
if [[ "$PARENT_DIR" =~ ^/[a-z]/ ]]; then
  # MSYS path like /c/Users/... -> add extra slash for Docker on Windows
  DOCKER_PATH="/$PARENT_DIR"
else
  # Already in correct format or native Windows path
  DOCKER_PATH="$PARENT_DIR"
fi

echo ""
echo "=== Grafana Plugin Validator (Docker) ==="
echo ""
echo "ℹ Starting Docker container with Node.js..."
echo "ℹ Project path: $PROJECT_DIR"
echo "ℹ Parent path: $PARENT_DIR"
echo "ℹ Docker mount: $DOCKER_PATH"
echo ""

# Run validation in Docker container
# Mount parent directory and validate ZIP from there
# Note: Using cd instead of -w flag to avoid MSYS path conversion issues
docker run --rm \
  -v "$DOCKER_PATH:/plugin" \
  node:20-alpine \
  sh -c "cd /plugin/intersight-app && npx -y @grafana/plugin-validator@latest -sourceCodeUri file://. ../intersight-app-1.0.0.zip"

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ Validation completed successfully"
else
  echo "✗ Validation failed with exit code $EXIT_CODE"
fi
echo ""

exit $EXIT_CODE
