# Slopcade ComfyUI Worker for RunPod Serverless
# Includes: Flux Dev (FP8) + BiRefNet/RMBG background removal
#
# Build: docker build -t hassoncs/slopcade-comfyui:latest .
# Push:  docker push hassoncs/slopcade-comfyui:latest
#
# Note: This image is ~15GB with all models pre-baked
# Build on RunPod (not GitHub Actions - needs 20GB+ disk)

FROM runpod/worker-comfyui:5.7.1-base

# Install custom nodes for background removal and utilities
RUN comfy node install https://github.com/1038lab/ComfyUI-RMBG
RUN comfy node install https://github.com/cubiq/ComfyUI_essentials

# Pre-bake Flux Dev models for faster cold starts (~12GB)
RUN comfy model download \
    --url https://huggingface.co/Comfy-Org/flux1-dev/resolve/main/flux1-dev-fp8.safetensors \
    --relative-path models/unet \
    --filename flux1-dev-fp8.safetensors

RUN comfy model download \
    --url https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors \
    --relative-path models/vae \
    --filename ae.safetensors

RUN comfy model download \
    --url https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors \
    --relative-path models/clip \
    --filename clip_l.safetensors

RUN comfy model download \
    --url https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors \
    --relative-path models/clip \
    --filename t5xxl_fp8_e4m3fn.safetensors

# BiRefNet model downloads on first use (URL unreliable)
