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
        "safetensors", "accelerate", "transformers", "sentencepiece"
    )
    .run_commands(
        f"comfy --skip-prompt install --nvidia --version {COMFYUI_COMMIT}",
        "comfy --skip-prompt node install https://github.com/1038lab/ComfyUI-RMBG",
        "comfy --skip-prompt node install https://github.com/cubiq/ComfyUI_essentials",
    )
)

models_volume = modal.Volume.from_name(MODELS_VOLUME, create_if_missing=True)


def download_models_if_needed(models_path: Path):
    """Download Flux models to persistent volume if not present."""
    models_path.mkdir(parents=True, exist_ok=True)
    
    unet_path = models_path / "unet" / "flux1-dev-fp8.safetensors"
    clip_l_path = models_path / "clip" / "clip_l.safetensors"
    clip_t5_path = models_path / "clip" / "t5xxl_fp8_e4m3fn.safetensors"
    vae_path = models_path / "vae" / "ae.safetensors"
    
    downloads = [
        (unet_path, "https://huggingface.co/Comfy-Org/flux1-dev/resolve/main/flux1-dev-fp8.safetensors"),
        (clip_l_path, "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors"),
        (clip_t5_path, "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors"),
        (vae_path, "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors"),
    ]
    
    for file_path, url in downloads:
        if not file_path.exists():
            print(f"Downloading {file_path.name}...")
            file_path.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["curl", "-L", "--fail", "-o", str(file_path), url], check=True)
            print(f"Downloaded {file_path.name}")
        else:
            print(f"Already have {file_path.name}")


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
                print("ComfyUI is ready")
                return
            except (urllib.error.URLError, ConnectionRefusedError):
                time.sleep(1)
        raise TimeoutError("ComfyUI failed to start")
    
    def _run_workflow(self, workflow: dict, input_images: list[tuple[str, bytes]] = None) -> bytes:
        """Execute a workflow and return the output image."""
        import urllib.request
        import uuid
        
        if input_images:
            for name, data in input_images:
                files = {"image": (name, data, "image/png")}
                import io
                from email.mime.multipart import MIMEMultipart
                from email.mime.base import MIMEBase
                import email.encoders
                
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
        
        prompt_id = str(uuid.uuid4())
        payload = {"prompt": workflow, "client_id": prompt_id}
        
        req = urllib.request.Request(
            "http://127.0.0.1:8188/prompt",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req)
        
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
    def remove_background(self, image_base64: str) -> str:
        """Remove background from image. Returns base64 PNG."""
        img_bytes = base64.b64decode(image_base64)
        workflow = build_rmbg_workflow("input.png")
        result = self._run_workflow(workflow, [("input.png", img_bytes)])
        return base64.b64encode(result).decode()


@app.local_entrypoint()
def main():
    """Test the endpoint locally."""
    worker = ComfyUIWorker()
    
    print("Testing txt2img...")
    result = worker.txt2img.remote(
        prompt="A cute pixel art cat, 16-bit style, game sprite",
        width=512,
        height=512,
        steps=20
    )
    
    output_path = Path("test_output.png")
    output_path.write_bytes(base64.b64decode(result))
    print(f"Saved to {output_path}")
