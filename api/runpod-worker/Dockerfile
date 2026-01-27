# Slopcade ComfyUI Worker for RunPod Serverless
# Includes: Flux Dev (FP8) + BiRefNet/RMBG background removal
#
# Build: docker build -t hassoncs/slopcade-comfyui:latest .
# Push:  docker push hassoncs/slopcade-comfyui:latest

FROM runpod/worker-comfyui:5.7.1-base

# =============================================================================
# Custom Nodes for Background Removal
# =============================================================================

# 1038lab RMBG - supports BiRefNet, RMBG-2.0, BEN2, and more
RUN comfy node install https://github.com/1038lab/ComfyUI-RMBG

# ComfyUI Essentials - common utility nodes
RUN comfy node install https://github.com/cubiq/ComfyUI_essentials

# =============================================================================
# Models - Flux Dev (FP8 for faster inference, ~12GB total)
# =============================================================================

# Main Flux checkpoint (FP8 quantized - faster, smaller)
RUN comfy model download \
    --url https://huggingface.co/Comfy-Org/flux1-dev/resolve/main/flux1-dev-fp8.safetensors \
    --relative-path models/unet \
    --filename flux1-dev-fp8.safetensors

# VAE for Flux
RUN comfy model download \
    --url https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors \
    --relative-path models/vae \
    --filename ae.safetensors

# CLIP text encoders for Flux
RUN comfy model download \
    --url https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors \
    --relative-path models/clip \
    --filename clip_l.safetensors

RUN comfy model download \
    --url https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors \
    --relative-path models/clip \
    --filename t5xxl_fp8_e4m3fn.safetensors

# =============================================================================
# Models - Background Removal (BiRefNet)
# =============================================================================

# BiRefNet model for high-quality background removal
# The 1038lab node auto-downloads models on first use to: /comfyui/models/RMBG/
# Pre-baking the model would speed up cold starts but the HuggingFace URL is unreliable
# The model will be downloaded automatically on first use (adds ~30s to first cold start)
