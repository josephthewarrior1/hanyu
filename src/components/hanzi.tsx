"use client";
import { useRef, useState, useEffect } from "react";
import { Undo2, Trash2, Play, Check } from "lucide-react";
import { useApp } from "./context";
import { ErrorBox } from "./ui";
import { api } from "@/lib/client";
import { strokeGuides, followsGuide, Point } from "@/lib/strokes";
export function Hanzi() {
  const { t } = useApp();
  const [character, setCharacter] = useState("一"),
    [strokes, setStrokes] = useState<Point[][]>([]),
    [current, setCurrent] = useState<Point[]>([]),
    [trace, setTrace] = useState(true),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [replay, setReplay] = useState<number | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null),
    started = useRef(0),
    active = useRef(false);
  const guide = strokeGuides[character];
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, 300, 300);
    context.strokeStyle = "#e3eaf4";
    context.lineWidth = 1;
    context.setLineDash([5, 5]);
    for (const value of [75, 150, 225]) {
      context.beginPath();
      context.moveTo(value, 0);
      context.lineTo(value, 300);
      context.stroke();
      context.beginPath();
      context.moveTo(0, value);
      context.lineTo(300, value);
      context.stroke();
    }
    if (trace)
      guide.paths.forEach((path, i) => {
        context.strokeStyle = "#b5cbf5";
        context.lineWidth = 14;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(...path[0]);
        context.lineTo(...path[1]);
        context.stroke();
        context.fillStyle = "#2869f0";
        context.font = "14px Arial";
        context.fillText(String(i + 1), path[0][0] - 18, path[0][1] - 12);
      });
    context.setLineDash([]);
    context.strokeStyle = "#142033";
    context.lineWidth = 13;
    context.lineCap = "round";
    context.lineJoin = "round";
    [
      ...(replay === null ? strokes : strokes.slice(0, replay)),
      current,
    ].forEach((path) => {
      if (!path.length) return;
      context.beginPath();
      context.moveTo(...path[0]);
      path.slice(1).forEach((p) => context.lineTo(...p));
      context.stroke();
    });
  }, [strokes, current, trace, guide, replay]);
  useEffect(() => {
    if (replay === null) return;
    const timer = setTimeout(() => {
      if (replay >= strokes.length) setReplay(null);
      else setReplay(replay + 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [replay, strokes.length]);
  useEffect(() => {
    started.current = Date.now();
  }, []);
  useEffect(() => {
    started.current = Date.now();
  }, []);
  const point = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(300, ((e.clientX - rect.left) / rect.width) * 300)),
      Math.max(0, Math.min(300, ((e.clientY - rect.top) / rect.height) * 300)),
    ];
  };
  async function save() {
    setError("");
    setMessage("");
    try {
      await api("writing", {
        character,
        strokes,
        seconds: Math.min(
          1800,
          Math.floor((Date.now() - started.current) / 1000),
        ),
      });
      const match =
        strokes.length === guide.paths.length &&
        strokes.every((s, i) => followsGuide(s, guide.paths[i]));
      setMessage(
        t(
          match
            ? "Saved. Your stroke sequence follows this simple geometric guide."
            : "Saved. Compare your stroke direction and sequence with the guide.",
          match
            ? "Tersimpan. Urutan goresanmu mengikuti panduan geometris sederhana ini."
            : "Tersimpan. Bandingkan arah dan urutan goresan dengan panduan.",
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div id="main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SLOW DOWN. MAKE YOUR MARK.</span>
          <h1>{t("Your writing studio", "Ruang latihan menulismu")}</h1>
          <p>
            {t(
              "Four original geometric guides. Real pointer strokes. No recognition claim.",
              "Empat panduan geometris asli. Goresan pointer nyata. Tanpa klaim pengenalan tulisan.",
            )}
          </p>
        </div>
      </div>
      <div className="writing-select">
        {Object.keys(strokeGuides).map((c) => (
          <button
            key={c}
            className={c === character ? "active" : ""}
            onClick={() => {
              setCharacter(c);
              setStrokes([]);
              setCurrent([]);
              setMessage("");
              started.current = Date.now();
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="writing-layout">
        <section className="card">
          <canvas
            ref={canvas}
            className="writing-canvas"
            width={300}
            height={300}
            aria-label={t(
              "Hanzi writing canvas. Use touch or mouse to draw.",
              "Kanvas menulis Hanzi. Gunakan sentuhan atau mouse.",
            )}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              active.current = true;
              setCurrent([point(e)]);
            }}
            onPointerMove={(e) => {
              if (active.current) {
                const position = point(e);
                setCurrent((prev) =>
                  prev.length < 2000 ? [...prev, position] : prev,
                );
              }
            }}
            onPointerUp={(e) => {
              if (active.current) {
                const position = point(e);
                setStrokes((prev) =>
                  prev.length < 50 ? [...prev, [...current, position]] : prev,
                );
                setCurrent([]);
                active.current = false;
              }
            }}
            onPointerCancel={() => {
              active.current = false;
              setCurrent([]);
            }}
          />
          <div className="row">
            <button
              className="button ghost"
              disabled={!strokes.length}
              onClick={() => setStrokes(strokes.slice(0, -1))}
            >
              <Undo2 size={16} />
              {t("Undo", "Urungkan")}
            </button>
            <button
              className="button ghost"
              onClick={() => {
                setStrokes([]);
                setCurrent([]);
              }}
            >
              <Trash2 size={16} />
              {t("Clear", "Hapus")}
            </button>
            <button
              className="button ghost"
              disabled={!strokes.length}
              onClick={() => setReplay(0)}
            >
              <Play size={16} />
              {t("Replay", "Putar ulang")}
            </button>
          </div>
        </section>
        <section className="card">
          <span className="hanzi large">{character}</span>
          <p>{guide.meaning}</p>
          <p>
            {t("Radical", "Radikal")}:{" "}
            <span className="hanzi">{guide.radical}</span>
          </p>
          <label className="toggle-label">
            {t("Trace guide", "Panduan jiplak")}
            <input
              type="checkbox"
              checked={trace}
              onChange={(e) => setTrace(e.target.checked)}
            />
          </label>
          <h3>{t("Stroke sequence", "Urutan goresan")}</h3>
          <div className="stroke-list">
            {guide.paths.map((path, i) => (
              <span key={i}>
                {i + 1}.{" "}
                {path[0][1] === path[1][1]
                  ? t("Left → right", "Kiri → kanan")
                  : t("Top → bottom", "Atas → bawah")}
              </span>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 20 }}>
            {t(
              "The guides are original CC0 line data. Feedback compares endpoints and distance to these paths, not handwriting quality or character recognition. Keyboard users can study the sequence and use the rest of the app; drawing requires a pointer.",
              "Panduan memakai data garis asli CC0. Umpan balik membandingkan titik dan jarak pada jalur, bukan mutu tulisan atau pengenalan karakter. Pengguna keyboard dapat membaca urutan; menggambar memerlukan pointer.",
            )}
          </p>
          <button
            className="button"
            disabled={!strokes.length}
            onClick={() => void save()}
          >
            <Check size={17} />
            {t("Save practice", "Simpan latihan")}
          </button>
          <ErrorBox message={error} />
          {message && (
            <div className="notice" role="status">
              {message}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
