# ControlNet Investigation Summary

## What We Tried

### 1. Black Forest Labs FLUX.1-Canny-dev (Official)
- **Status:** GATED on HuggingFace
- **Issue:** Requires special access approval from BFL
- **Verdict:** Not available without application

### 2. XLabs-AI/flux-controlnet-canny (Open Alternative)
- **Status:** Downloaded successfully (1.4GB)
- **Location:** `/models/xlabs/controlnet/controlnet.safetensors`
- **Issue:** Requires XLabs custom nodes (`x-flux-comfyui`)

### What We Learned

**ControlNet Canny Workflow Requirements:**
- Custom nodes: `x-flux-comfyui` ( LoadFluxControlNet, ApplyFluxControlNet, XlabsSampler, CLIPTextEncodeFlux)
- ControlNet model location: `models/xlabs/controlnet/`
- Uses CannyEdgePreprocessor to detect edges
- Control strength: 0.5-0.9 (higher = stricter shape adherence)

**Why It Failed:**
- Workflow node structure was complex and error-prone
- Required specific XLabs node types that may have compatibility issues
- Overkill for simple UI button shape preservation

### Recommendation
**For UI buttons:** Stick with img2img approach - it's simpler and can work well with proper tuning.

**For complex sprites/shapes:** Consider revisiting ControlNet with simpler workflow structure or using IP-Adapter instead.

## References

- XLabs ControlNet Repo: https://github.com/XLabs-AI/x-flux-comfyui
- Model: https://huggingface.co/XLabs-AI/flux-controlnet-canny
- Canny thresholds: low=100, high=200 for edge detection
- Control strength: 0.6-0.8 recommended for good balance

## Current Modal Endpoints

1. **web_generate** (img2img/txt2img): Working ✅
   - `https://hassoncs--slopcade-comfyui-comfyuiworker-web-generate.modal.run`

2. **web_controlnet**: Not working ❌
   - Complex workflow issues
   - Consider removing or fixing with simpler approach

## Next Steps (Recommended)

1. Optimize img2img strengths (try 0.55-0.72 range)
2. Improve prompts with explicit shape preservation language
3. Adjust silhouette colors for better edge detection
4. Test systematic variations to find optimal settings
