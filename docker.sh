#!/bin/bash
# Solana bridge development container
# Usage: ./docker.sh start <devnet|mainnet>
#        ./docker.sh stop
#        ./docker.sh rebuild

set -e
cd "$(dirname "$0")"

IMAGE_NAME="solana"
CONTAINER_NAME="solana"

usage() {
    echo "Usage:"
    echo "  ./docker.sh start <devnet|mainnet>  # Start and enter"
    echo "  ./docker.sh stop                    # Stop container"
    echo "  ./docker.sh rebuild                 # Rebuild image"
    exit 1
}

ACTION="$1"

ensure_image() {
    if ! docker image inspect "$IMAGE_NAME" &>/dev/null; then
        echo "Image not found, building..."
        docker build -f Dockerfile.dev -t "$IMAGE_NAME" .
    fi
}

case "$ACTION" in
    start)
        NETWORK="$2"
        if [[ "$NETWORK" != "devnet" && "$NETWORK" != "mainnet" ]]; then
            echo "Error: network required (devnet or mainnet)"
            usage
        fi
        if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
            echo "Entering running container..."
        else
            docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
            ensure_image
            echo "Starting container ($NETWORK)..."
            docker run -d --name "$CONTAINER_NAME" \
                -v "$(pwd)":/bridge \
                -v ~/.config/solana:/root/.config/solana \
                -w /bridge \
                "$IMAGE_NAME" tail -f /dev/null
        fi
        docker exec "$CONTAINER_NAME" solana config set --url "$NETWORK" >/dev/null
        docker exec -it "$CONTAINER_NAME" /bridge/docker-entrypoint.sh bash
        ;;
    stop)
        docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
        echo "Stopped."
        ;;
    rebuild)
        docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
        echo "Rebuilding image..."
        docker build -f Dockerfile.dev -t "$IMAGE_NAME" .
        echo "Done."
        ;;
    *)
        usage
        ;;
esac
