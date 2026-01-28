"""
Modal ComfyUI Serverless Endpoint

Deploy: modal deploy api/modal/comfyui.py
Test locally: modal run api/modal/comfyui.py
"""

import modal
import json
import base64
import subprocess
import time
from pathlib import Path

app = modal.App("slopcade-comfyui")

COMFYUI_COMMIT = "latest"
MODELS_VOLUME = "slopcade-comfyui-models"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "git", "wget", "curl", "libgl1", "libglib2.0-0",
        "libsm6", "libxext6", "libxrender1", "ffmpeg"
    )
    .pip_install(
        "torch", "torchvision", "torchaudio",
        extra_options="--index-url https://download.pytorch.org/whl/cu121"
    )
    .pip_install(
        "comfy-cli", "aiohttp", "requests", "websocket-client",
        "safetensors", "accelerate", "transformers", "sentencepiece",
        "huggingface-hub"
    )
    .run_commands(
        f"comfy --skip-prompt install --nvidia --version {COMFYUI_COMMIT}",
        "comfy --skip-prompt node install https://github.com/1038lab/ComfyUI-RMBG",
        "comfy --skip-prompt node install https://github.com/cubiq/ComfyUI_essentials",
    )
)

models_volume = modal.Volume.from_name(MODELS_VOLUME, create_if_missing=True)


# Expected file sizes in bytes (for validation)
MODEL_SIZES = {
    "flux1-dev-fp8.safetensors": 17_000_000_000,  # ~17GB
    "clip_l.safetensors": 250_000_000,  # ~250MB
    "t5xxl_fp8_e4m3fn.safetensors": 5_000_000_000,  # ~5GB
    "ae.safetensors": 300_000_000,  # ~300MB
}


def download_models_if_needed(models_path: Path):
    """Download Flux models to persistent volume if not present."""
    from huggingface_hub import hf_hub_download
    import os
    
    models_path.mkdir(parents=True, exist_ok=True)
    
    downloads = [
        ("Comfy-Org/flux1-dev", "flux1-dev-fp8.safetensors", "unet"),
        ("comfyanonymous/flux_text_encoders", "clip_l.safetensors", "clip"),
        ("comfyanonymous/flux_text_encoders", "t5xxl_fp8_e4m3fn.safetensors", "clip"),
        ("Comfy-Org/z_image_turbo", "split_files/vae/ae.safetensors", "vae"),
    ]
    
    for repo_id, filename, subfolder in downloads:
        target_path = models_path / subfolder / Path(filename).name
        expected_size = MODEL_SIZES.get(Path(filename).name, 0)
        
        # Check if file exists and has correct size (within 10% tolerance)
        needs_download = True
        if target_path.exists():
            actual_size = target_path.stat().st_size
            if actual_size >= expected_size * 0.9:  # Within 10% of expected
                print(f"✓ {filename} already exists ({actual_size / 1e9:.1f} GB)")
                needs_download = False
            else:
                print(f"⚠ {filename} is incomplete ({actual_size / 1e9:.1f} GB, expected {expected_size / 1e9:.1f} GB). Re-downloading...")
                target_path.unlink()  # Delete corrupted file
        
        if needs_download:
            print(f"📥 Downloading {filename}...")
            target_path.parent.mkdir(parents=True, exist_ok=True)
            try:
                downloaded = hf_hub_download(
                    repo_id=repo_id,
                    filename=filename,
                    local_dir=str(models_path / subfolder),
                    local_dir_use_symlinks=False,
                    resume_download=True
                )
                final_size = Path(downloaded).stat().st_size
                print(f"✅ Downloaded {filename} ({final_size / 1e9:.1f} GB)")
            except Exception as e:
                print(f"❌ Failed to download {filename}: {e}")
                raise


def build_txt2img_workflow(prompt: str, width: int, height: int, steps: int, guidance: float, seed: int) -> dict:
    """Build ComfyUI workflow JSON for text-to-image with Flux."""
    return {
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {"batch_size": 1, "height": height, "width": width}
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["11", 0], "text": prompt}
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["13", 0], "vae": ["12", 0]}
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": "ComfyUI", "images": ["8", 0]}
        },
        "10": {
            "class_type": "UNETLoader",
            "inputs": {"unet_name": "flux1-dev-fp8.safetensors", "weight_dtype": "fp8_e4m3fn"}
        },
        "11": {
            "class_type": "DualCLIPLoader",
            "inputs": {
                "clip_name1": "clip_l.safetensors",
                "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
                "type": "flux"
            }
        },
        "12": {
            "class_type": "VAELoader",
            "inputs": {"vae_name": "ae.safetensors"}
        },
        "13": {
            "class_type": "KSampler",
            "inputs": {
                "cfg": guidance,
                "denoise": 1,
                "latent_image": ["5", 0],
                "model": ["10", 0],
                "negative": ["6", 0],
                "positive": ["6", 0],
                "sampler_name": "euler",
                "scheduler": "simple",
                "seed": seed,
                "steps": steps
            }
        }
    }


def build_img2img_workflow(prompt: str, input_image_name: str, strength: float, steps: int, guidance: float, seed: int) -> dict:
    """Build ComfyUI workflow JSON for image-to-image with Flux.

    Args:
        prompt: Text prompt for transformation
        input_image_name: Name of the input image file (must be uploaded first)
        strength: How much to change the image (0.0-1.0, higher = more change)
        steps: Number of denoising steps
        guidance: CFG scale
        seed: Random seed
    """
    # Calculate denoise based on strength (strength 0.5 = denoise 0.5)
    denoise = strength

    return {
        "1": {
            "class_type": "LoadImage",
            "inputs": {"image": input_image_name}
        },
        "2": {
            "class_type": "VAEEncode",
            "inputs": {"pixels": ["1", 0], "vae": ["12", 0]}
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["11", 0], "text": prompt}
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["13", 0], "vae": ["12", 0]}
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": "ComfyUI_img2img", "images": ["8", 0]}
        },
        "10": {
            "class_type": "UNETLoader",
            "inputs": {"unet_name": "flux1-dev-fp8.safetensors", "weight_dtype": "fp8_e4m3fn"}
        },
        "11": {
            "class_type": "DualCLIPLoader",
            "inputs": {
                "clip_name1": "clip_l.safetensors",
                "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
                "type": "flux"
            }
        },
        "12": {
            "class_type": "VAELoader",
            "inputs": {"vae_name": "ae.safetensors"}
        },
        "13": {
            "class_type": "KSampler",
            "inputs": {
                "cfg": guidance,
                "denoise": denoise,
                "latent_image": ["2", 0],
                "model": ["10", 0],
                "negative": ["6", 0],
                "positive": ["6", 0],
                "sampler_name": "euler",
                "scheduler": "simple",
                "seed": seed,
                "steps": steps
            }
        }
    }


def build_rmbg_workflow(input_image_name: str) -> dict:
    """Build ComfyUI workflow JSON for background removal."""
    return {
        "1": {
            "class_type": "LoadImage",
            "inputs": {"image": input_image_name}
        },
        "2": {
            "class_type": "RMBG",
            "inputs": {"image": ["1", 0]}
        },
        "3": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": "RMBG", "images": ["2", 0]}
        }
    }


@app.cls(
    image=image,
    gpu="A10G",
    timeout=600,
    volumes={"/models": models_volume},
    scaledown_window=60,
)
class ComfyUIWorker:
    @modal.enter()
    def setup(self):
        """Called once when container starts."""
        import os
        
        models_path = Path("/models")
        download_models_if_needed(models_path)
        models_volume.commit()
        
        # Create symlinks for ComfyUI to find models
        comfy_models = Path("/root/comfy/ComfyUI/models")
        for subdir in ["unet", "clip", "vae"]:
            src = models_path / subdir
            dst = comfy_models / subdir
            if src.exists():
                dst.mkdir(parents=True, exist_ok=True)
                for f in src.iterdir():
                    target = dst / f.name
                    if not target.exists():
                        os.symlink(f, target)
        
        # Start ComfyUI server
        self.comfyui_process = subprocess.Popen(
            ["comfy", "launch", "--", "--listen", "127.0.0.1", "--port", "8188"],
            cwd="/root/comfy/ComfyUI"
        )
        
        self._wait_for_comfyui()
    
    def _wait_for_comfyui(self, timeout: int = 120):
        """Wait for ComfyUI to be ready."""
        import urllib.request
        import urllib.error
        
        start = time.time()
        while time.time() - start < timeout:
            try:
                urllib.request.urlopen("http://127.0.0.1:8188/system_stats", timeout=2)
                print("✅ ComfyUI is ready")
                return
            except (urllib.error.URLError, ConnectionRefusedError):
                time.sleep(1)
        raise TimeoutError("ComfyUI failed to start")
    
    def _run_workflow(self, workflow: dict, input_images: list = None) -> bytes:
        """Execute a workflow and return the output image."""
        import urllib.request
        import uuid
        
        # Upload input images if provided
        if input_images:
            for name, data in input_images:
                boundary = uuid.uuid4().hex
                body = []
                body.append(f"--{boundary}".encode())
                body.append(f'Content-Disposition: form-data; name="image"; filename="{name}"'.encode())
                body.append(b"Content-Type: image/png")
                body.append(b"")
                body.append(data)
                body.append(f"--{boundary}--".encode())
                
                req = urllib.request.Request(
                    "http://127.0.0.1:8188/upload/image",
                    data=b"\r\n".join(body),
                    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
                )
                urllib.request.urlopen(req)
        
        # Submit workflow
        prompt_id = str(uuid.uuid4())
        payload = {"prompt": workflow, "client_id": prompt_id}
        
        req = urllib.request.Request(
            "http://127.0.0.1:8188/prompt",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req)
        
        # Wait for completion
        while True:
            time.sleep(0.5)
            history_url = f"http://127.0.0.1:8188/history/{prompt_id}"
            try:
                resp = urllib.request.urlopen(history_url)
                history = json.loads(resp.read())
                if prompt_id in history:
                    outputs = history[prompt_id].get("outputs", {})
                    for node_id, node_output in outputs.items():
                        if "images" in node_output:
                            img_info = node_output["images"][0]
                            img_url = f"http://127.0.0.1:8188/view?filename={img_info['filename']}&type={img_info['type']}&subfolder={img_info.get('subfolder', '')}"
                            img_resp = urllib.request.urlopen(img_url)
                            return img_resp.read()
            except Exception:
                pass
    
    @modal.method()
    def txt2img(self, prompt: str, width: int = 512, height: int = 512, 
                steps: int = 20, guidance: float = 3.5, seed: int = None) -> str:
        """Generate image from text prompt. Returns base64 PNG."""
        import random
        if seed is None:
            seed = random.randint(0, 2**32 - 1)
        
        workflow = build_txt2img_workflow(prompt, width, height, steps, guidance, seed)
        img_bytes = self._run_workflow(workflow)
        return base64.b64encode(img_bytes).decode()
    
    @modal.method()
    def img2img(self, prompt: str, image_base64: str, strength: float = 0.5, steps: int = 20, guidance: float = 3.5, seed: int = None) -> str:
        """Transform image based on prompt. Returns base64 PNG.

        Args:
            prompt: Text description of desired transformation
            image_base64: Input image as base64 string
            strength: How much to change image (0.0-1.0, default 0.5)
            steps: Number of denoising steps (default 20)
            guidance: CFG scale (default 3.5)
            seed: Random seed (optional)
        """
        import random
        if seed is None:
            seed = random.randint(0, 2**32 - 1)

        img_bytes = base64.b64decode(image_base64)
        workflow = build_img2img_workflow(prompt, "input.png", strength, steps, guidance, seed)
        result = self._run_workflow(workflow, [("input.png", img_bytes)])
        return base64.b64encode(result).decode()

    @modal.method()
    def remove_background(self, image_base64: str) -> str:
        """Remove background from image. Returns base64 PNG."""
        img_bytes = base64.b64decode(image_base64)
        workflow = build_rmbg_workflow("input.png")
        result = self._run_workflow(workflow, [("input.png", img_bytes)])
        return base64.b64encode(result).decode()


@app.local_entrypoint()
def main():
    """Test all ComfyUI functions locally."""
    worker = ComfyUIWorker()
    output_dir = Path("/Users/hassoncs/Workspaces/Personal/slopcade/test_outputs")
    output_dir.mkdir(exist_ok=True)

    print("\n" + "="*60)
    print("🎨 COMPREHENSIVE COMFYUI TEST SUITE")
    print("="*60)

    # Test 1: txt2img
    print("\n📸 TEST 1: Text-to-Image (txt2img)")
    print("-" * 60)
    txt_result = worker.txt2img.remote(
        prompt="A cute pixel art cat, 16-bit style, game sprite",
        width=512,
        height=512,
        steps=15
    )
    (output_dir / "01_txt2img.png").write_bytes(base64.b64decode(txt_result))
    print("✅ txt2img complete -> test_outputs/01_txt2img.png")

    # Test 2: img2img (transform the generated image)
    print("\n🎭 TEST 2: Image-to-Image (img2img)")
    print("-" * 60)
    img2img_result = worker.img2img.remote(
        prompt="A cute pixel art dog, 16-bit style, game sprite",
        image_base64=txt_result,
        strength=0.6,
        steps=15
    )
    (output_dir / "02_img2img.png").write_bytes(base64.b64decode(img2img_result))
    print("✅ img2img complete -> test_outputs/02_img2img.png")

    # Test 3: Remove background
    print("\n✂️  TEST 3: Background Removal (RMBG)")
    print("-" * 60)
    rmbg_result = worker.remove_background.remote(
        image_base64=txt_result
    )
    (output_dir / "03_rmbg.png").write_bytes(base64.b64decode(rmbg_result))
    print("✅ remove_background complete -> test_outputs/03_rmbg.png")

    # Test 4: Full pipeline (txt2img -> img2img)
    print("\n🔗 TEST 4: Full Pipeline (txt2img -> img2img)")
    print("-" * 60)
    base_img = worker.txt2img.remote(
        prompt="A magical potion bottle, pixel art",
        width=512,
        height=512,
        steps=15
    )
    transformed = worker.img2img.remote(
        prompt="A glowing magical potion, neon colors, pixel art",
        image_base64=base_img,
        strength=0.5,
        steps=15
    )
    (output_dir / "04a_pipeline_base.png").write_bytes(base64.b64decode(base_img))
    (output_dir / "04b_pipeline_transformed.png").write_bytes(base64.b64decode(transformed))
    print("✅ Pipeline complete:")
    print("   -> test_outputs/04a_pipeline_base.png")
    print("   -> test_outputs/04b_pipeline_transformed.png")

    print("\n" + "="*60)
    print("🎉 ALL TESTS PASSED!")
    print("="*60)
    print(f"\n📁 All outputs saved to: {output_dir}")
