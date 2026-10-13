"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Send } from "lucide-react";
import { useApp, useData } from "./context";
import { AudioButton, ErrorBox } from "./ui";
import { api } from "@/lib/client";
import type { Capabilities } from "@/lib/types";
const scenarios = [
  ["guided", "你好", "Guided beginner", "Pemula terpandu"],
  ["free", "说", "Free chat", "Obrolan bebas"],
  ["restaurant", "茶", "At a restaurant", "Di restoran"],
  ["travel", "路", "Travel", "Perjalanan"],
  ["shopping", "买", "Shopping", "Berbelanja"],
  ["introductions", "我", "Introductions", "Perkenalan"],
  ["workplace", "工", "Workplace", "Tempat kerja"],
  ["interview", "问", "Interview", "Wawancara"],
  ["hsk-oral", "试", "Oral practice", "Latihan lisan"],
  ["custom", "✦", "Your scenario", "Skenario kamu"],
];
type Conversation = {
  id: string;
  scenario: string;
  createdAt: string;
  messages: { id: string; role: string; text: string }[];
};
export function Speaking({ scenario }: { scenario?: string }) {
  const { t } = useApp();
  const { data: status } = useData<Capabilities>("capabilities");
  const { data: history, reload } = useData<Conversation[]>("conversations");
  const [conversation, setConversation] = useState<Conversation | null>(null),
    [text, setText] = useState(""),
    [support, setSupport] = useState("translated"),
    [custom, setCustom] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const selected = scenarios.find((s) => s[0] === scenario);
  async function send() {
    setBusy(true);
    setError("");
    try {
      const response = await api<{ conversationId: string; text: string }>(
        "chat",
        {
          conversationId: conversation?.id,
          scenario: scenario ?? "guided",
          text,
          support,
          custom,
        },
      );
      setConversation({
        id: response.conversationId,
        scenario: scenario ?? "guided",
        createdAt: new Date().toISOString(),
        messages: [
          ...(conversation?.messages ?? []),
          { id: crypto.randomUUID(), role: "user", text },
          { id: crypto.randomUUID(), role: "assistant", text: response.text },
        ],
      });
      setText("");
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    try {
      await api("delete-conversation", { id });
      if (conversation?.id === id) setConversation(null);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div id="main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">FIND YOUR VOICE</span>
          <h1>
            {selected
              ? t(selected[2], selected[3])
              : t("Make Mandarin your own", "Buat Mandarin jadi milikmu")}
          </h1>
          <p>
            {t(
              "Practice aloud. Listen back. Build confidence without a fabricated score.",
              "Latih suara. Dengarkan kembali. Tingkatkan percaya diri tanpa skor buatan.",
            )}
          </p>
        </div>
        {scenario && (
          <Link href="/speaking">← {t("All scenarios", "Semua skenario")}</Link>
        )}
      </div>
      <div className="notice">
        <div>
          <strong>
            {status?.ai
              ? t(
                  "AI provider configured; responses require a successful live request.",
                  "Penyedia AI dikonfigurasi; respons memerlukan permintaan langsung yang berhasil.",
                )
              : t("AI tutor: unconfigured", "Tutor AI: belum dikonfigurasi")}
          </strong>
          <p>
            {t(
              "Specialized Mandarin pronunciation assessment is unavailable. Transcription, when configured, does not measure pronunciation accuracy.",
              "Penilaian pelafalan Mandarin khusus belum tersedia. Transkripsi, jika dikonfigurasi, tidak mengukur akurasi pelafalan.",
            )}
          </p>
        </div>
      </div>
      {!scenario && (
        <div className="scenario-grid">
          {scenarios.map((s) => (
            <Link
              className="scenario-card"
              key={s[0]}
              href={"/speaking/" + s[0]}
            >
              <span>{s[1]}</span>
              <h2>{t(s[2], s[3])}</h2>
              <p>
                {status?.ai
                  ? t("Open conversation →", "Buka percakapan →")
                  : t(
                      "Device practice · AI unavailable",
                      "Latihan perangkat · AI belum tersedia",
                    )}
              </p>
            </Link>
          ))}
        </div>
      )}
      <Recorder status={status} onTranscript={setText} />
      {scenario && (
        <section className="card">
          <h2>{t("Text conversation", "Percakapan teks")}</h2>
          <label>
            {t("Support", "Bantuan")}
            <select
              value={support}
              onChange={(e) => setSupport(e.target.value)}
            >
              <option value="chinese">Mandarin only</option>
              <option value="pinyin">Mandarin + pinyin</option>
              <option value="translated">Mandarin + translation</option>
            </select>
          </label>
          {scenario === "custom" && (
            <label>
              {t("Scenario description", "Deskripsi skenario")}
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                maxLength={500}
              />
            </label>
          )}
          <ErrorBox message={error} />
          {conversation && (
            <div className="chat-messages" aria-live="polite">
              {conversation.messages.map((m) => (
                <div key={m.id} className={"chat-message " + m.role}>
                  <small>
                    {m.role === "user" ? t("You", "Kamu") : "Tutor"}
                  </small>
                  <div>{m.text}</div>
                  {m.role === "assistant" && <AudioButton text={m.text} />}
                </div>
              ))}
            </div>
          )}
          <div className="chat-form">
            <textarea
              aria-label={t("Your message", "Pesan kamu")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t(
                "Write a short Mandarin sentence…",
                "Tulis kalimat Mandarin singkat…",
              )}
              maxLength={2000}
            />
            <button
              className="button"
              disabled={!status?.ai || !text.trim() || busy}
              onClick={() => void send()}
            >
              <Send size={18} />
              {busy ? t("Waiting…", "Menunggu…") : t("Send", "Kirim")}
            </button>
          </div>
          <p className="muted" style={{ marginTop: 18, fontSize: 12 }}>
            {t(
              "Your text and recent chat context go to the configured provider. Free accounts: 5 requests per study day. Failed provider calls still consume quota.",
              "Teks dan konteks obrolan terbaru dikirim ke penyedia yang dikonfigurasi. Akun Free: 5 permintaan per hari belajar. Permintaan gagal tetap memakai kuota.",
            )}
          </p>
        </section>
      )}
      {history && history.length > 0 && (
        <section className="card">
          <h2>{t("Saved conversations", "Percakapan tersimpan")}</h2>
          {history.map((c) => (
            <div className="leader-row" key={c.id}>
              <button className="text-link" onClick={() => setConversation(c)}>
                {c.scenario} · {new Date(c.createdAt).toLocaleDateString()}
              </button>
              <button
                className="icon-button"
                aria-label="Delete conversation"
                onClick={() => void remove(c.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
function Recorder({
  status,
  onTranscript,
}: {
  status: Capabilities | null;
  onTranscript: (t: string) => void;
}) {
  const { t } = useApp();
  const [recording, setRecording] = useState(false),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [seconds, setSeconds] = useState(0),
    [energy, setEnergy] = useState(0),
    [transcript, setTranscript] = useState(""),
    [busy, setBusy] = useState(false),
    [speed, setSpeed] = useState(1);
  const media = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    blob = useRef<Blob | null>(null),
    chunks = useRef<Blob[]>([]),
    audio = useRef<HTMLAudioElement | null>(null),
    timer = useRef<ReturnType<typeof setInterval> | null>(null),
    context = useRef<AudioContext | null>(null),
    frame = useRef<number>(0);
  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (timer.current) clearInterval(timer.current);
      cancelAnimationFrame(frame.current);
      void context.current?.close();
    },
    [],
  );
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  function stop() {
    if (media.current?.state === "recording") media.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    if (timer.current) clearInterval(timer.current);
    cancelAnimationFrame(frame.current);
    void context.current?.close();
    context.current = null;
    setRecording(false);
  }
  async function start() {
    setError("");
    setTranscript("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window))
        throw new Error(
          t(
            "Recording is unsupported in this browser. Use a secure HTTPS browser.",
            "Browser belum mendukung rekaman. Gunakan browser HTTPS yang aman.",
          ),
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((m) =>
        MediaRecorder.isTypeSupported(m),
      );
      media.current = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : undefined,
      );
      chunks.current = [];
      media.current.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      media.current.onstop = () => {
        blob.current = new Blob(chunks.current, {
          type: media.current?.mimeType ?? "audio/webm",
        });
        setUrl(URL.createObjectURL(blob.current));
      };
      media.current.start();
      setRecording(true);
      setSeconds(0);
      let elapsed = 0;
      timer.current = setInterval(() => {
        elapsed++;
        setSeconds(elapsed);
        if (elapsed >= 60) stop();
      }, 1000);
      context.current = new AudioContext();
      const analyser = context.current.createAnalyser();
      context.current.createMediaStreamSource(stream.current).connect(analyser);
      analyser.fftSize = 256;
      const buffer = new Uint8Array(analyser.fftSize);
      const inspect = () => {
        analyser.getByteTimeDomainData(buffer);
        setEnergy(
          Math.round(
            Math.sqrt(
              buffer.reduce((s, v) => s + ((v - 128) / 128) ** 2, 0) /
                buffer.length,
            ) * 100,
          ),
        );
        frame.current = requestAnimationFrame(inspect);
      };
      inspect();
    } catch (e) {
      stream.current?.getTracks().forEach((track) => track.stop());
      const denied = e instanceof DOMException && e.name === "NotAllowedError";
      setError(
        denied
          ? t(
              "Microphone permission denied. Enable access in browser settings to retry.",
              "Izin mikrofon ditolak. Aktifkan akses di pengaturan browser untuk mencoba lagi.",
            )
          : (e as Error).message,
      );
    }
  }
  async function sendAudio() {
    if (!blob.current) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set(
        "file",
        new File(
          [blob.current],
          "practice." + (blob.current.type.includes("mp4") ? "mp4" : "webm"),
          { type: blob.current.type },
        ),
      );
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "Transcription failed.");
      setTranscript(result.data.transcript);
      onTranscript(result.data.transcript);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="recorder">
      <h3>
        {t("Private record & replay", "Rekam dan putar ulang secara lokal")}
      </h3>
      <p style={{ fontSize: 12 }}>
        {t(
          "Allow the microphone only when you are ready. Recordings stay in this browser until you explicitly request transcription. Maximum 60 seconds.",
          "Izinkan mikrofon saat kamu siap. Rekaman tetap di browser sampai kamu meminta transkripsi. Maksimal 60 detik.",
        )}
      </p>
      <div className="row">
        <button
          className="button"
          onClick={() => (recording ? stop() : void start())}
        >
          {recording ? <Square size={17} /> : <Mic size={17} />}{" "}
          {recording
            ? t("Stop recording", "Hentikan rekaman")
            : t("Allow mic & record", "Izinkan mikrofon dan rekam")}
        </button>
        <span role="status">
          {recording
            ? `${seconds}s · ${t("Input level", "Level masukan")} ${energy}%`
            : t("No audio uploaded", "Audio belum diunggah")}
        </span>
      </div>
      {recording && energy < 2 && seconds >= 5 && (
        <p className="muted">
          {t(
            "Very quiet input. Check your microphone and move closer.",
            "Masukan sangat pelan. Periksa mikrofon dan mendekatlah.",
          )}
        </p>
      )}
      {url && (
        <>
          <audio ref={audio} src={url} controls />
          <label style={{ marginTop: 18 }}>
            {t("Replay speed", "Kecepatan pemutaran")}
            <select
              value={speed}
              onChange={(e) => {
                const value = Number(e.target.value);
                setSpeed(value);
                if (audio.current) audio.current.playbackRate = value;
              }}
            >
              <option value={0.65}>0.65×</option>
              <option value={1}>1×</option>
            </select>
          </label>
          <button
            className="button ghost"
            disabled={!status?.transcription || busy}
            onClick={() => void sendAudio()}
          >
            {busy
              ? t("Transcribing…", "Mentranskripsi…")
              : status?.transcription
                ? t(
                    "Send recording for transcription",
                    "Kirim rekaman untuk transkripsi",
                  )
                : t(
                    "Transcription unconfigured",
                    "Transkripsi belum dikonfigurasi",
                  )}
          </button>
          <button
            className="text-link"
            style={{ marginLeft: 20 }}
            onClick={() => {
              setUrl("");
              blob.current = null;
              setTranscript("");
            }}
          >
            <Trash2 size={16} />
            {t("Delete recording", "Hapus rekaman")}
          </button>
        </>
      )}
      {transcript && (
        <div className="notice">
          {t(
            "Transcript only; no pronunciation score",
            "Hanya transkrip; tanpa skor pelafalan",
          )}
          : {transcript}
        </div>
      )}
      <ErrorBox message={error} />
      <p className="muted" style={{ marginTop: 18, fontSize: 11 }}>
        {t(
          "Tone references: 1 high-level · 2 rising · 3 low/dipping · 4 falling · neutral light. Syllable and tone assessment are unavailable.",
          "Referensi nada: 1 tinggi datar · 2 naik · 3 rendah/melengkung · 4 turun · netral ringan. Penilaian suku kata dan nada belum tersedia.",
        )}
      </p>
    </section>
  );
}
