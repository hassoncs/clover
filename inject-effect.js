const fs = require('fs');
const file = './packages/pencil-server/canvas.pen';
const doc = JSON.parse(fs.readFileSync(file, 'utf8'));

doc.children.push({
  type: "effect",
  id: "effect-demo-1",
  name: "Live Shader",
  x: 500,
  y: 0,
  width: 300,
  height: 300,
  authoringMode: "graph",
  shaderCode: `shader_type canvas_item;

uniform float speed : hint_range(0.0, 5.0) = 1.0;
uniform vec4 color : source_color = vec4(1.0, 0.5, 0.0, 1.0);

void fragment() {
    vec2 uv = UV;
    COLOR = mix(vec4(uv.x, uv.y, 0.5 + 0.5 * sin(TIME * speed), 1.0), color, 0.5);
}`,
  uniforms: { speed: 2.0, color: [0.0, 1.0, 1.0, 1.0] }
});

fs.writeFileSync(file, JSON.stringify(doc, null, 2));
console.log("Injected effect node.");
