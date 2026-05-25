import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULTS, fileToBitmap, process, type Settings } from './imageProcessor';
import './App.css';

function SnapSlider({
  label,
  value,
  onCommit,
  min,
  max,
  unit,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min: number;
  max: number;
  unit?: string;
}) {
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => onCommit(Number(el.value));
    el.addEventListener('change', handler);
    return () => el.removeEventListener('change', handler);
  }, [onCommit]);

  return (
    <label className="slider">
      <span className="slider-label">
        <span>{label}</span>
        <span className="slider-value">
          {local}
          {unit ?? ''}
        </span>
      </span>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={1}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
      />
    </label>
  );
}

function App() {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const bm = await fileToBitmap(file);
    setBitmap((prev) => {
      prev?.close?.();
      return bm;
    });
  }, []);

  useEffect(() => {
    if (!bitmap) return;
    let cancelled = false;
    setProcessing(true);
    process(bitmap, settings)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setResultUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .finally(() => {
        if (!cancelled) setProcessing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bitmap, settings]);

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      setDragOver(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget) return;
      setDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer?.files[0];
      if (file) handleFile(file);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleFile]);

  const openPicker = () => fileInputRef.current?.click();

  return (
    <main className={dragOver ? 'drag' : ''}>
      <section className="stage">
        {resultUrl ? (
          <figure>
            <img src={resultUrl} alt="result" />
            {processing && <div className="busy" aria-hidden="true" />}
            <figcaption>이미지를 길게 눌러 저장하세요</figcaption>
          </figure>
        ) : (
          <button type="button" className="dropzone" onClick={openPicker}>
            <span className="dropzone-title">이미지 추가</span>
            <span className="dropzone-sub">탭하거나 파일을 드래그하세요</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        {resultUrl && (
          <button type="button" className="ghost" onClick={openPicker}>
            다른 이미지 선택
          </button>
        )}
      </section>

      <p className="credit">
        Inspired by{' '}
        <a
          href="https://www.instagram.com/p/DChFXFoKXKP/"
          target="_blank"
          rel="noreferrer noopener"
        >
          this work
        </a>{' '}
        by{' '}
        <a
          href="https://www.instagram.com/10.years.time/"
          target="_blank"
          rel="noreferrer noopener"
        >
          @10.years.time
        </a>{' '}
        on Instagram.
      </p>

      <section className="controls">
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.clockwise}
            onChange={(e) => setSettings((s) => ({ ...s, clockwise: e.target.checked }))}
          />
          <span>시계 방향</span>
        </label>

        <SnapSlider
          label="가장 바깥 링 크기"
          unit="%"
          min={30}
          max={100}
          value={settings.ringSizePct}
          onCommit={(v) => setSettings((s) => ({ ...s, ringSizePct: v }))}
        />
        <SnapSlider
          label="링 갯수"
          min={2}
          max={20}
          value={settings.ringCount}
          onCommit={(v) => setSettings((s) => ({ ...s, ringCount: v }))}
        />
        <SnapSlider
          label="회전 각도"
          unit="°"
          min={0}
          max={90}
          value={settings.rotationDeg}
          onCommit={(v) => setSettings((s) => ({ ...s, rotationDeg: v }))}
        />
      </section>

      {dragOver && <div className="drop-overlay">여기에 놓기</div>}
    </main>
  );
}

export default App;
