"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { Word } from "@/lib/types";
export default function Offline() {
  const [words, setWords] = useState<Word[]>([]);
  useEffect(() => {
    try {
      setWords(JSON.parse(localStorage.getItem("hf-offline-words") ?? "[]"));
    } catch {
      setWords([]);
    }
  }, []);
  return (
    <main id="main" className="legal">
      <Link href="/dashboard">← HanyuFlow</Link>
      <h1>Offline library / Pustaka offline</h1>
      <p>
        Saved vocabulary is available for reading and self-practice. Server
        grading, progress, reviews, AI and uploads require a connection. No
        offline XP is awarded or queued.
      </p>
      <div className="grammar-grid">
        {words.map((w) => (
          <article className="card" key={w.id}>
            <h2 className="hanzi medium">{w.hanzi}</h2>
            <p className="pinyin">{w.pinyin}</p>
            <details>
              <summary>Reveal / Lihat arti</summary>
              <p>{w.translations.map((v) => v.text).join(" · ")}</p>
              <p className="hanzi">{w.sample}</p>
              <p>{w.samplePinyin}</p>
              <p>
                {w.sampleTranslation.en} · {w.sampleTranslation.id}
              </p>
            </details>
          </article>
        ))}
      </div>
      {!words.length && (
        <p>
          No words saved. Use “Save this page for offline reading” in the
          vocabulary library while online.
        </p>
      )}
    </main>
  );
}
