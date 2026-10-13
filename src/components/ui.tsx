"use client";
import { useState, useEffect } from "react";
import { Volume2, LoaderCircle, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useApp } from "./context";
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        汉
      </span>
      Hanyu<span>Flow</span>
    </span>
  );
}
export function Loading() {
  return (
    <div role="status" className="loading">
      <LoaderCircle className="spin" />
      <span>Loading / Memuat…</span>
    </div>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="notice error">
      <AlertCircle size={18} />
      {message}
    </div>
  ) : null;
}
export function Empty({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">芽</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {href && (
        <Link className="button" href={href}>
          {label}
          <ArrowRight size={18} />
        </Link>
      )}
    </div>
  );
}
export function AudioButton({
  text,
  slow = false,
}: {
  text: string;
  slow?: boolean;
}) {
  const { t, user } = useApp();
  const [error, setError] = useState(""),
    [speaking, setSpeaking] = useState(false);
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );
  function play() {
    setError("");
    if (user && !user.profile.audio) {
      setError(
        t(
          "Audio is disabled in settings.",
          "Audio dinonaktifkan di pengaturan.",
        ),
      );
      return;
    }
    if (!("speechSynthesis" in window)) {
      setError(
        t("Device speech is unavailable.", "Suara perangkat tidak tersedia."),
      );
      return;
    }
    const voices = speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang.toLowerCase().startsWith("zh-cn")) ??
      voices.find((v) => v.lang.toLowerCase().startsWith("zh"));
    if (!voice) {
      setError(
        t(
          "No Mandarin voice installed on this device. Try again after enabling a Chinese system voice.",
          "Belum ada suara Mandarin di perangkat. Aktifkan suara sistem Mandarin lalu coba lagi.",
        ),
      );
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = slow ? 0.65 : 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setError(
        t(
          "Audio playback failed. Try again.",
          "Audio gagal diputar. Coba lagi.",
        ),
      );
    };
    setSpeaking(true);
    speechSynthesis.speak(utterance);
  }
  return (
    <span className="audio-wrap">
      <button
        className="icon-button"
        onClick={play}
        aria-label={t(
          slow ? "Play slowly" : "Play Mandarin audio",
          slow ? "Putar perlahan" : "Putar audio Mandarin",
        )}
        title={t(
          "Uses an installed device voice",
          "Menggunakan suara perangkat",
        )}
      >
        <Volume2 size={19} />
        {speaking && <span className="sr-only">Playing</span>}
        {slow && <small>0.65×</small>}
      </button>
      {error && (
        <span className="audio-error" role="status">
          {error}
        </span>
      )}
    </span>
  );
}
