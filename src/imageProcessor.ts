export type Settings = {
  clockwise: boolean;
  ringSizePct: number;
  ringCount: number;
  rotationDeg: number;
};

export const DEFAULTS: Settings = {
  clockwise: false,
  ringSizePct: 60,
  ringCount: 12,
  rotationDeg: 45,
};

const OUTPUT_LONG_AXIS = 1440;
const WEBP_QUALITY = 0.92;

export async function fileToBitmap(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file, { imageOrientation: 'from-image' });
}

export async function process(src: ImageBitmap, s: Settings): Promise<Blob> {
  const scale = OUTPUT_LONG_AXIS / Math.max(src.width, src.height);
  const w = Math.round(src.width * scale);
  const h = Math.round(src.height * scale);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');

  ctx.drawImage(src, 0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const majorAxis = Math.max(w, h);
  const outerR = (s.ringSizePct / 100) * majorAxis / 2;
  const N = Math.max(1, s.ringCount);
  const dir = s.clockwise ? 1 : -1;
  const stepRad = ((s.rotationDeg * Math.PI) / 180) / N;

  for (let i = 1; i <= N; i++) {
    const ringOuterR = (outerR * (N - i + 1)) / N;
    const ringInnerR = (outerR * (N - i)) / N;
    const angle = stepRad * i * dir;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, ringOuterR, 0, Math.PI * 2, false);
    if (ringInnerR > 0) {
      ctx.arc(cx, cy, ringInnerR, 0, Math.PI * 2, true);
    }
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
    ctx.drawImage(src, 0, 0, w, h);
    ctx.restore();
  }

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let i = 1; i <= N; i++) {
    const r = (outerR * i) / N;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  return await canvas.convertToBlob({ type: 'image/webp', quality: WEBP_QUALITY });
}
