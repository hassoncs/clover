#!/bin/bash
# RunPod Serverless Startup Script for Slopcade ComfyUI
# This runs when the pod starts - installs custom nodes and downloads models

set -e

echo "=== Slopcade ComfyUI Worker Setup ==="

# Install custom nodes
if [ ! -d "/comfyui/custom_nodes/ComfyUI-RMBG" ]; then
    echo "Installing ComfyUI-RMBG node..."
    cd /comfyui/custom_nodes
    git clone https://github.com/1038lab/ComfyUI-RMBG
fi

if [ ! -d "/comfyui/custom_nodes/ComfyUI_essentials" ]; then
    echo "Installing ComfyUI_essentials node..."
    cd /comfyui/custom_nodes
    git clone https://github.com/cubiq/ComfyUI_essentials
fi

# Install dependencies for nodes
if [ -f "/comfyui/custom_nodes/ComfyUI-RMBG/requirements.txt" ]; then
    echo "Installing RMBG dependencies..."
    pip install -r /comfyui/custom_nodes/ComfyUI-RMBG/requirements.txt --quiet
fi

echo "=== Setup Complete ==="
echo "Models will be downloaded on first use"
