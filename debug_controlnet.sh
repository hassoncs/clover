#!/bin/bash
# Debug ControlNet in Modal container
# Usage: modal shell api/modal/comfyui.py -c 'bash /mnt/debug_controlnet.sh'

echo "=== Checking ControlNet Model ==="
ls -lh /models/controlnet/ 2>/dev/null || echo "ControlNet directory not found"

echo ""
echo "=== Checking ComfyUI Custom Nodes ==="
ls -la /root/comfy/ComfyUI/custom_nodes/ | grep -i control

echo ""
echo "=== Testing ComfyUI API ==="
curl -s http://127.0.0.1:8188/system_stats | head -20

echo ""
echo "=== Checking if ComfyUI is running ==="
ps aux | grep -i comfy

echo ""
echo "=== Testing simple workflow ==="
cat > /tmp/test_workflow.json << 'EOF'
{"1": {"class_type": "LoadImage", "inputs": {"image": "test.png"}}}
EOF
curl -s -X POST http://127.0.0.1:8188/prompt \
  -H "Content-Type: application/json" \
  -d @/tmp/test_workflow.json

echo ""
echo "=== Check ComfyUI logs ==="
tail -50 /root/comfy/ComfyUI/comfyui.log 2>/dev/null || echo "No log file"
