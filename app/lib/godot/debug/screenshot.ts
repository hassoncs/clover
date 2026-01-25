import type { Annotation, Vec2 } from './types';

export async function annotateImage(base64: string, annotations: Annotation[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);

      for (const ann of annotations) {
        drawAnnotation(ctx, ann);
      }

      const result = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
      resolve(result);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = `data:image/png;base64,${base64}`;
  });
}

function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation): void {
  const color = ann.color ?? '#FF0000';
  const strokeWidth = ann.strokeWidth ?? 2;
  const opacity = ann.opacity ?? 1;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.font = '14px sans-serif';

  switch (ann.type) {
    case 'rect':
      drawRect(ctx, ann.position, ann.width, ann.height, ann.fill ?? false, ann.label);
      break;

    case 'circle':
      drawCircle(ctx, ann.position, ann.radius, ann.fill ?? false, ann.label);
      break;

    case 'line':
      drawLine(ctx, ann.start, ann.end);
      break;

    case 'arrow':
      drawArrow(ctx, ann.start, ann.end, ann.headSize ?? 10, ann.label);
      break;

    case 'label':
      drawLabel(ctx, ann.position, ann.text, ann.fontSize ?? 14, ann.backgroundColor, ann.padding ?? 4);
      break;

    case 'point':
      drawPoint(ctx, ann.position, ann.size ?? 6, ann.label);
      break;
  }

  ctx.restore();
}

function drawRect(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
  width: number,
  height: number,
  fill: boolean,
  label?: string
): void {
  const x = pos.x - width / 2;
  const y = pos.y - height / 2;

  if (fill) {
    ctx.fillRect(x, y, width, height);
  } else {
    ctx.strokeRect(x, y, width, height);
  }

  if (label) {
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(label, x, y - 4);
  }
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
  radius: number,
  fill: boolean,
  label?: string
): void {
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);

  if (fill) {
    ctx.fill();
  } else {
    ctx.stroke();
  }

  if (label) {
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(label, pos.x - radius, pos.y - radius - 4);
  }
}

function drawLine(ctx: CanvasRenderingContext2D, start: Vec2, end: Vec2): void {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  start: Vec2,
  end: Vec2,
  headSize: number,
  label?: string
): void {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headSize * Math.cos(angle - Math.PI / 6),
    end.y - headSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    end.x - headSize * Math.cos(angle + Math.PI / 6),
    end.y - headSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  if (label) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(label, midX + 5, midY - 5);
  }
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
  text: string,
  fontSize: number,
  backgroundColor?: string,
  padding: number = 4
): void {
  ctx.font = `${fontSize}px sans-serif`;
  const metrics = ctx.measureText(text);
  const textHeight = fontSize;

  if (backgroundColor) {
    const prevFill = ctx.fillStyle;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(
      pos.x - padding,
      pos.y - textHeight - padding,
      metrics.width + padding * 2,
      textHeight + padding * 2
    );
    ctx.fillStyle = prevFill;
  }

  ctx.fillText(text, pos.x, pos.y);
}

function drawPoint(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
  size: number,
  label?: string
): void {
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
  ctx.fill();

  if (label) {
    ctx.fillText(label, pos.x + size, pos.y - size / 2);
  }
}
