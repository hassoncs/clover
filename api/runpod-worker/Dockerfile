# Slopcade ComfyUI Worker for RunPod Serverless
# Base image with custom nodes - models download on first use
#
# Build: docker build -t hassoncs/slopcade-comfyui:latest .
# Push:  docker push hassoncs/slopcade-comfyui:latest

FROM runpod/worker-comfyui:5.7.1-base

# Install custom nodes for background removal and utilities
RUN comfy node install https://github.com/1038lab/ComfyUI-RMBG
RUN comfy node install https://github.com/cubiq/ComfyUI_essentials

# Models download automatically on first use and are cached
# Supported models: Flux Dev, SDXL, SD 1.5, and more
