"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  Star,
  ArrowLeft,
  ArrowRight,
  Check,
  Layers,
} from "lucide-react";
import { useApp, useData } from "./context";
import { Loading, ErrorBox, AudioButton, Empty } from "./ui";
import { api, uid } from "@/lib/client";
import type {
  Word,
  Grammar,
  Review,
  Dashboard,
  Achievement,
} from "@/lib/types";
import { units } from "@/lib/content";
export function Vocabulary({ id }: { id?: string }) {
  const { t, b, user, refresh } = useApp();
  const [query, setQuery] = useState(""),
    [debounced, setDebounced] = useState(""),
    [topic, setTopic] = useState(""),
    [filter, setFilter] = useState(""),
    [page, setPage] = useState(1),
    [message, setMessage] = useState(""),
    [actionError, setActionError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const { data, error } = useData<
    Word | { items: Word[]; total: number; pages: number; page: number }
  >(
    id
      ? "vocabulary/" + id
      : `vocabulary?q=${encodeURIComponent(debounced)}&topic=${topic}&filter=${filter}&page=${page}`,
  );
  async function favorite(wordId: string) {
    try {
      const list = user!.profile.favorites ?? [];
      await api("profile", {
        favorites: list.includes(wordId)
          ? list.filter((v) => v !== wordId)
          : [...list, wordId],
      });
      await refresh();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }
  if (!data)
    return (
      <>
        <ErrorBox message={error} />
        <Loading />
      </>
    );
  const word = "hanzi" in data ? data : null;
  const items = "items" in data ? data.items : [];
  const translation = (w: Word) =>
    w.translations.find((v) => v.locale === user!.profile.locale)?.text ?? "";
  return (
    <div id="main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">WORDS THAT STAY WITH YOU</span>
          <h1>
            {word
              ? word.hanzi
              : t("Your vocabulary library", "Pustaka kosakatamu")}
          </h1>
          <p>
            {t(
              "Find a word. Hear it. Put it into a sentence.",
              "Temukan kata. Dengarkan. Gunakan dalam kalimat.",
            )}
          </p>
        </div>
        <Link className="button ghost" href="/review">
          <Layers size={18} />
          {t("Review words", "Review kata")}
        </Link>
      </div>
      <ErrorBox message={actionError} />
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {word ? (
        <>
          <Link href="/vocabulary">← {t("All words", "Semua kata")}</Link>
          <article className="card word-detail">
            <div className="section-heading">
              <span className="hanzi large">
                {user!.profile.traditional
                  ? (word.traditional ?? word.hanzi)
                  : word.hanzi}
              </span>
              <button
                className="icon-button"
                aria-label="Favorite word"
                onClick={() => void favorite(word.id)}
              >
                <Star
                  fill={
                    user!.profile.favorites.includes(word.id)
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            </div>
            <p className="pinyin">{word.pinyin}</p>
            <h2>{translation(word)}</h2>
            <div className="row">
              <AudioButton text={word.hanzi} />
              <AudioButton text={word.hanzi} slow />
            </div>
            <hr />
            <h3>{t("In a sentence", "Dalam kalimat")}</h3>
            <p className="hanzi medium">{word.sample}</p>
            {user!.profile.pinyin && (
              <p className="pinyin">{word.samplePinyin}</p>
            )}
            <p>{b(word.sampleTranslation)}</p>
            <AudioButton text={word.sample} />
            <div className="word-chips">
              {word.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <p className="muted">
              {t(
                "No official HSK mapping. Traditional variants are unavailable for this draft.",
                "Belum dipetakan ke HSK resmi. Varian tradisional belum tersedia untuk draf ini.",
              )}
            </p>
            {word.reviews?.[0] && (
              <p>
                {t("Next review", "Review berikutnya")}:{" "}
                {new Date(word.reviews[0].due).toLocaleString(
                  user!.profile.locale,
                  { timeZone: user!.profile.timezone },
                )}
              </p>
            )}
          </article>
        </>
      ) : (
        <>
          <div className="library-filters">
            <label className="search-input">
              <Search size={19} />
              <input
                aria-label={t("Search vocabulary", "Cari kosakata")}
                placeholder={t(
                  "Hanzi, pinyin, English, Indonesian…",
                  "Hanzi, pinyin, Inggris, Indonesia…",
                )}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Topic"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t("All topics", "Semua topik")}</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {b(u.title)}
                </option>
              ))}
            </select>
            <select
              aria-label="Mastery filter"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t("All words", "Semua kata")}</option>
              <option value="favorite">{t("Favorites", "Favorit")}</option>
              <option value="difficult">{t("Difficult", "Sulit")}</option>
              <option value="mastered">{t("Mastered", "Dikuasai")}</option>
            </select>
          </div>
          {items.length ? (
            <div className="vocabulary-grid">
              {items.map((w) => (
                <article className="card word-card" key={w.id}>
                  <div className="section-heading">
                    <Link className="hanzi medium" href={`/vocabulary/${w.id}`}>
                      {w.hanzi}
                    </Link>
                    <button
                      className="icon-button"
                      aria-label={`Favorite ${w.hanzi}`}
                      onClick={() => void favorite(w.id)}
                    >
                      <Star
                        size={18}
                        fill={
                          user!.profile.favorites.includes(w.id)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                  </div>
                  {user!.profile.pinyin && <p className="pinyin">{w.pinyin}</p>}
                  <strong>{translation(w)}</strong>
                  <div className="word-card-foot">
                    <span>{w.tags[0]}</span>
                    <AudioButton text={w.hanzi} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title={t("No words found", "Kata tidak ditemukan")}
              text={t(
                "Try another search or topic.",
                "Coba pencarian atau topik lain.",
              )}
            />
          )}
          <div className="pagination">
            <button
              className="button ghost"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ArrowLeft size={17} />
              {t("Previous", "Sebelumnya")}
            </button>
            <span>
              {page} / {"pages" in data ? Math.max(1, data.pages) : 1}
            </span>
            <button
              className="button ghost"
              disabled={"pages" in data && page >= data.pages}
              onClick={() => setPage(page + 1)}
            >
              {t("Next", "Berikutnya")}
              <ArrowRight size={17} />
            </button>
          </div>
          <button
            className="text-link"
            onClick={() => {
              const existing = JSON.parse(
                localStorage.getItem("hf-offline-words") ?? "[]",
              ) as Word[];
              const combined = new Map(
                [...existing, ...items].map((w) => [
                  w.id,
                  { ...w, reviews: undefined },
                ]),
              );
              localStorage.setItem(
                "hf-offline-words",
                JSON.stringify([...combined.values()]),
              );
              setMessage(
                t(
                  "This page is saved for offline reading. Open /offline to use it.",
                  "Halaman ini disimpan untuk dibaca offline. Buka /offline untuk menggunakannya.",
                ),
              );
            }}
          >
            {t(
              "Save this page for offline reading",
              "Simpan halaman ini untuk dibaca offline",
            )}
          </button>
        </>
      )}
    </div>
  );
}
export function GrammarLibrary({ id }: { id?: string }) {
  const { t, b, user } = useApp();
  const { data, error } = useData<Grammar | Grammar[]>(
    id ? "grammar/" + id : "grammar",
  );
  if (!data)
    return (
      <>
        <ErrorBox message={error} />
        <Loading />
      </>
    );
  const list = Array.isArray(data) ? data : [data];
  return (
    <div id="main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE SENTENCES MAKE SENSE</span>
          <h1>{t("Grammar, made practical", "Tata bahasa yang praktis")}</h1>
          <p>
            {t(
              "A small pattern. A sentence you can use.",
              "Satu pola kecil. Kalimat yang bisa kamu gunakan.",
            )}
          </p>
        </div>
        {id && <Link href="/grammar">← {t("All patterns", "Semua pola")}</Link>}
      </div>
      <div className="grammar-grid">
        {list.map((g) => (
          <article className="card grammar-card" key={g.id}>
            <span className="tag">{b(g.title)}</span>
            <h2 className="hanzi">
              <Link href={`/grammar/${g.id}`}>{g.pattern}</Link>
            </h2>
            <p>{b(g.explanation)}</p>
            {g.examples.map((e, i) => (
              <div className="grammar-example" key={i}>
                <strong className="hanzi">{e.hanzi}</strong>
                {user!.profile.pinyin && <p className="pinyin">{e.pinyin}</p>}
                <p>{b(e.translation)}</p>
                <AudioButton text={e.hanzi} />
              </div>
            ))}
            <small>{b(g.commonErrors)}</small>
            {g.lessons
              ?.filter((l) => l.version.status === "PUBLISHED")
              .slice(0, 3)
              .map((l) => (
                <Link
                  className="text-link"
                  key={l.version.lessonId}
                  href={`/lesson/${l.version.lessonId}`}
                >
                  {b(l.version.title)} →
                </Link>
              ))}
          </article>
        ))}
      </div>
    </div>
  );
}
export function Reviews() {
  const { t, b, user } = useApp();
  const { data, error: loadError, reload } = useData<Review[]>("reviews");
  const [revealed, setRevealed] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [count, setCount] = useState(0),
    [done, setDone] = useState<Set<string>>(new Set());
  const pending = useRef<{
    id: string;
    rating: string;
    eventId: string;
  } | null>(null);
  const card = data?.find((c) => !done.has(c.id));
  async function rate(rating: string) {
    if (!card) return;
    setBusy(true);
    setError("");
    try {
      if (
        !pending.current ||
        pending.current.id !== card.id ||
        pending.current.rating !== rating
      )
        pending.current = { id: card.id, rating, eventId: uid() };
      await api("reviews", {
        stateId: card.id,
        rating,
        eventId: pending.current.eventId,
        expectedDue: card.due,
      });
      pending.current = null;
      setDone((prev) => new Set([...prev, card.id]));
      setRevealed(false);
      setCount(count + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <>
        <ErrorBox message={loadError} />
        <Loading />
      </>
    );
  return (
    <div id="main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A FRESH LOOK AT FAMILIAR WORDS</span>
          <h1>
            {t("Let your words take root", "Biarkan kata-katamu berakar")}
          </h1>
          <p>
            {t(
              "Recall first. Reveal second. Choose an honest rating.",
              "Ingat dulu. Lihat jawaban. Beri penilaian jujur.",
            )}
          </p>
        </div>
        <span className="tag">
          {count} {t("reviewed", "direview")} ·{" "}
          {data.filter((c) => !done.has(c.id)).length} {t("due", "tersisa")}
        </span>
      </div>
      <ErrorBox message={error} />
      {card ? (
        <section className="review-card">
          <span className="eyebrow">
            {t("WHAT DOES THIS MEAN?", "APA ARTINYA?")}
          </span>
          <h2 className="hanzi large">{card.vocabulary.hanzi}</h2>
          <AudioButton text={card.vocabulary.hanzi} />
          {revealed ? (
            <>
              <p className="pinyin">{card.vocabulary.pinyin}</p>
              <h3>
                {
                  card.vocabulary.translations.find(
                    (v) => v.locale === user!.profile.locale,
                  )?.text
                }
              </h3>
              <p className="hanzi">{card.vocabulary.sample}</p>
              <p>{card.vocabulary.samplePinyin}</p>
              <p>{b(card.vocabulary.sampleTranslation)}</p>
              <div className="review-ratings">
                {[
                  ["AGAIN", t("Again", "Ulangi"), "10 min"],
                  ["HARD", t("Hard", "Sulit"), "≥ 1 day"],
                  ["GOOD", t("Good", "Baik"), "1+ day"],
                  ["EASY", t("Easy", "Mudah"), "≥ 4 days"],
                ].map(([rating, label, hint]) => (
                  <button
                    key={rating}
                    disabled={busy}
                    onClick={() => void rate(rating)}
                    className={"rating " + rating.toLowerCase()}
                  >
                    <strong>{label}</strong>
                    <small>{hint}</small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button className="button" onClick={() => setRevealed(true)}>
              {t("Reveal meaning", "Lihat arti")}
            </button>
          )}
        </section>
      ) : (
        <Empty
          title={
            count
              ? t("A little stronger today", "Lebih kuat hari ini")
              : t("Your review queue is clear", "Antrean review kosong")
          }
          text={t(
            "Complete a lesson to add words, or return when your next cards are due.",
            "Selesaikan pelajaran untuk menambah kata, atau kembali saat kartu jatuh tempo.",
          )}
          href="/learn"
          label={t("Explore lessons", "Jelajahi pelajaran")}
        />
      )}
      <p className="muted">
        {t(
          "SM-2 inspired scheduler: intervals and review history are computed and saved on the server. Ratings are self-reported recall, not objective retention scores. Offline rating sync is not available.",
          "Penjadwal terinspirasi SM-2: interval dan riwayat dihitung serta disimpan server. Penilaian adalah laporan ingatan sendiri, bukan skor retensi objektif. Sinkronisasi rating offline belum tersedia.",
        )}
      </p>
      {!card && (
        <button
          className="text-link"
          onClick={() => {
            setDone(new Set());
            void reload();
          }}
        >
          {t("Refresh due cards", "Muat ulang kartu jatuh tempo")}
        </button>
      )}
    </div>
  );
}
export function Progress() {
  const { t, user } = useApp();
  const { data, error } = useData<Dashboard>("progress");
  if (!data)
    return (
      <>
        <ErrorBox message={error} />
        <Loading />
      </>
    );
  const values = [
    [
      t("First-try accuracy", "Akurasi pertama"),
      data.accuracy === null ? "—" : data.accuracy + "%",
    ],
    [
      t("Recall ratings (Good/Hard/Easy)", "Rating ingatan (Baik/Sulit/Mudah)"),
      data.retention === null ? "—" : data.retention + "%",
    ],
    [
      t("Time in completed lessons", "Waktu pada pelajaran selesai"),
      data.minutes + " min",
    ],
    [t("Words mastered", "Kata dikuasai"), String(data.mastered)],
    [t("Difficult words", "Kata sulit"), String(data.difficult)],
    [
      t("Due / overdue / upcoming", "Jatuh tempo / terlambat / mendatang"),
      `${data.due} / ${data.overdue} / ${data.upcoming}`,
    ],
    [t("Writing sessions", "Sesi menulis"), String(data.writing)],
    [t("AI conversations", "Percakapan AI"), String(data.speaking)],
  ];
  return (
    <div id="main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR OWN PACE</span>
          <h1>
            {t("Look how far you’ve come", "Lihat sejauh mana kamu melangkah")}
          </h1>
          <p>
            {t(
              "Every number comes from your saved learning history.",
              "Setiap angka berasal dari riwayat belajarmu yang tersimpan.",
            )}
          </p>
        </div>
      </div>
      <div className="stats-grid">
        {values.map(([label, value]) => (
          <article className="card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="card">
        <h2>{t("Original foundations", "Fondasi asli")}</h2>
        <p>
          {data.completed} / {data.totalLessons}{" "}
          {t("lessons complete", "pelajaran selesai")}
        </p>
        <div className="progress-track">
          <span
            style={{
              width: `${data.totalLessons ? (data.completed / data.totalLessons) * 100 : 0}%`,
            }}
          />
        </div>
        <p className="muted">
          {t(
            "This is curriculum progress, not an official HSK readiness estimate.",
            "Ini progres kurikulum, bukan perkiraan kesiapan HSK resmi.",
          )}
        </p>
        <p>
          {t("Your study timezone", "Zona waktu belajar")}:{" "}
          {user!.profile.timezone}
        </p>
      </section>
      <div className="row">
        <Link className="button ghost" href="/achievements">
          {t("Achievements", "Pencapaian")}
        </Link>
        <Link className="button ghost" href="/leaderboard">
          {t("Optional leaderboard", "Papan peringkat opsional")}
        </Link>
      </div>
    </div>
  );
}
export function Achievements() {
  const { t, b } = useApp();
  const { data, error } = useData<Achievement[]>("achievements");
  if (!data)
    return (
      <>
        <ErrorBox message={error} />
        <Loading />
      </>
    );
  return (
    <div id="main">
      <h1>{t("Small milestones", "Pencapaian kecil")}</h1>
      <div className="grammar-grid">
        {data.map((a) => (
          <article
            className={"card achievement " + (a.users?.length ? "earned" : "")}
            key={a.id}
          >
            <span className="completion-medal">
              <Check size={32} />
            </span>
            <h2>{b(a.title)}</h2>
            <p>{b(a.description)}</p>
            <span className="tag">
              {a.users?.length
                ? t("Earned", "Diperoleh")
                : t("Still growing", "Dalam proses")}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
export function Leaderboard() {
  const { t } = useApp();
  const { data, error } =
    useData<{ name: string; xp: number }[]>("leaderboard");
  if (!data)
    return (
      <>
        <ErrorBox message={error} />
        <Loading />
      </>
    );
  return (
    <div id="main">
      <h1>{t("Learn together", "Belajar bersama")}</h1>
      <p>
        {t(
          "Only learners who opted in appear here. Enable sharing in settings.",
          "Hanya pengguna yang memilih ikut ditampilkan. Aktifkan berbagi di pengaturan.",
        )}
      </p>
      {data.length ? (
        <div className="card">
          {data.map((u, i) => (
            <div className="leader-row" key={i}>
              <span>{i + 1}</span>
              <strong>{u.name}</strong>
              <span>{u.xp} XP</span>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title={t("A quiet start", "Awal yang tenang")}
          text={t(
            "No learners have opted in yet.",
            "Belum ada pengguna yang ikut.",
          )}
        />
      )}
    </div>
  );
}
