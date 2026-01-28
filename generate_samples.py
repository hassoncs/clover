#!/usr/bin/env python3
"""
Generate sample images using Modal ComfyUI
Saves to debug-output/samples/
"""

import modal
import base64
from pathlib import Path
import time

# Output directory
OUTPUT_DIR = Path("/Users/hassoncs/Workspaces/Personal/slopcade/debug-output/samples")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Connect to Modal app
app = modal.App.lookup("slopcade-comfyui")
worker = app.ComfyUIWorker()

print("🎨 Generating Sample Images with Modal ComfyUI")
print("=" * 60)

# Test 1: txt2img
print("\n📸 Test 1: Text-to-Image (txt2img)")
print("-" * 60)
print("Prompt: A heroic pixel art knight, 16-bit style, game sprite")
start = time.time()

txt_result = worker.txt2img.remote(
    prompt="A heroic pixel art knight, 16-bit style, game sprite, white background",
    width=512,
    height=512,
    steps=20,
    guidance=3.5
)

elapsed = time.time() - start
img_data = base64.b64decode(txt_result)
output_path = OUTPUT_DIR / "01_txt2img_knight.png"
output_path.write_bytes(img_data)
print(f"✅ Generated in {elapsed:.1f}s → {output_path}")

# Test 2: img2img (transform the knight)
print("\n🎭 Test 2: Image-to-Image (img2img)")
print("-" * 60)
print("Transforming knight into a magical version...")
start = time.time()

img2img_result = worker.img2img.remote(
    prompt="A magical glowing knight with blue aura, pixel art, enchanted armor",
    image_base64=txt_result,
    strength=0.6,
    steps=20
)

elapsed = time.time() - start
img_data = base64.b64decode(img2img_result)
output_path = OUTPUT_DIR / "02_img2img_magical_knight.png"
output_path.write_bytes(img_data)
print(f"✅ Transformed in {elapsed:.1f}s → {output_path}")

# Test 3: removeBackground
print("\n✂️  Test 3: Background Removal")
print("-" * 60)
print("Removing background from knight...")
start = time.time()

rmbg_result = worker.remove_background.remote(
    image_base64=txt_result
)

elapsed = time.time() - start
img_data = base64.b64decode(rmbg_result)
output_path = OUTPUT_DIR / "03_rmbg_knight_transparent.png"
output_path.write_bytes(img_data)
print(f"✅ Removed BG in {elapsed:.1f}s → {output_path}")

# Test 4: generateLayered (Parallax Background)
print("\n🏞️  Test 4: Layered Parallax Background")
print("-" * 60)
print("Generating forest parallax with 4 layers...")
start = time.time()

layers_result = worker.generate_layered.remote(
    base_prompt="pixel art forest landscape, game background",
    layers=[
        {"depth": "sky", "prompt": "bright blue sky with fluffy white clouds"},
        {"depth": "far", "prompt": "distant purple mountains, misty"},
        {"depth": "mid", "prompt": "tall green pine trees"},
        {"depth": "near", "prompt": "foreground bushes and grass details"}
    ],
    width=1024,
    height=512,
    steps=15
)

for i, layer in enumerate(layers_result):
    img_data = base64.b64decode(layer["image_base64"])
    output_path = OUTPUT_DIR / f"04_layered_{layer['depth']}.png"
    output_path.write_bytes(img_data)
    print(f"  Layer {i+1} ({layer['depth']}): {output_path}")

elapsed = time.time() - start
print(f"✅ Generated all layers in {elapsed:.1f}s")

# Test 5: Another txt2img (different style)
print("\n📸 Test 5: Text-to-Image (Different Style)")
print("-" * 60)
print("Prompt: A cute pixel art cat, 16-bit style")
start = time.time()

cat_result = worker.txt2img.remote(
    prompt="A cute pixel art cat, 16-bit style, game sprite, orange fur",
    width=512,
    height=512,
    steps=20
)

elapsed = time.time() - start
img_data = base64.b64decode(cat_result)
output_path = OUTPUT_DIR / "05_txt2img_cat.png"
output_path.write_bytes(img_data)
print(f"✅ Generated in {elapsed:.1f}s → {output_path}")

# Test 6: Generate a potion bottle
print("\n📸 Test 6: Game Item (Potion)")
print("-" * 60)
print("Prompt: A magical potion bottle, green glowing liquid, pixel art")
start = time.time()

potion_result = worker.txt2img.remote(
    prompt="A magical potion bottle, green glowing liquid, pixel art, game item",
    width=256,
    height=256,
    steps=20
)

elapsed = time.time() - start
img_data = base64.b64decode(potion_result)
output_path = OUTPUT_DIR / "06_txt2img_potion.png"
output_path.write_bytes(img_data)
print(f"✅ Generated in {elapsed:.1f}s → {output_path}")

print("\n" + "=" * 60)
print("🎉 All Sample Images Generated!")
print("=" * 60)
print(f"\n📁 Output directory: {OUTPUT_DIR}")
print("\nGenerated files:")
for f in sorted(OUTPUT_DIR.glob("*.png")):
    size = f.stat().st_size / 1024
    print(f"  • {f.name} ({size:.0f} KB)")
