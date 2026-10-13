"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  Check,
  Flame,
  Layers,
  BookOpen,
  Clock,
  X,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { useApp, useData } from "./context";
import { Loading, ErrorBox, AudioButton } from "./ui";
import { api, uid } from "@/lib/client";
import type {
  Dashboard as DashboardData,
  Unit,
  Lesson,
  Exercise,
  Attempt,
  Bi,
} from "@/lib/types";
export function Dashboard() {
  const { user, t } = useApp();
  const { data, error } = useData<DashboardData>("dashboard");
  if (!data)
    return (
      <>
        <ErrorBox message={error} />
        <Loading />
      </>
    );
  const goalXp = Math.max(20, user!.profile.dailyMinutes * 4);
  return (
    <div id="main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {t("A LITTLE PROGRESS, EVERY DAY", "SEDIKIT KEMAJUAN SETIAP HARI")}
          </span>
          <h1>
            {t(
              `Hello, ${user?.name.split(" ")[0]}.`,
              `Halo, ${user?.name.split(" ")[0]}.`,
            )}{" "}
            <span className="wave">✦</span>
          </h1>
          <p>
            {t(
              "Let’s make room for your next small step.",
              "Mari luangkan waktu untuk langkah kecil berikutnya.",
            )}
          </p>
        </div>
        <span className="streak-pill">
          <Flame size={19} />
          {data.streak} {t("day streak", "hari beruntun")}
        </span>
      </div>
      <section className="continue-card">
        <div>
          <span className="eyebrow">
            {t("YOUR NEXT CHAPTER", "BAB BERIKUTNYA")}
          </span>
          <h2>
            {t("Every word opens a door.", "Setiap kata membuka pintu baru.")}
          </h2>
          <p>
            {t(
              "Five minutes of Mandarin. A little more confidence.",
              "Lima menit Mandarin. Sedikit lebih percaya diri.",
            )}
          </p>
          <Link
            className="button white"
            href={data.nextLesson ? `/lesson/${data.nextLesson}` : "/learn"}
          >
            {t("Continue learning", "Lanjut belajar")}
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="chapter-art" aria-hidden="true">
          <span>学</span>
          <small>xué · learn</small>
          <i>✦</i>
        </div>
      </section>
      <div className="stats-row">
        <article className="stat">
          <span>
            <Trophy size={18} />
            {t("Total XP", "Total XP")}
          </span>
          <strong>{data.xp}</strong>
          <small>
            {t("Earned from completed work", "Dari latihan yang selesai")}
          </small>
        </article>
        <article className="stat">
          <span>
            <BookOpen size={18} />
            {t("Lessons learned", "Pelajaran selesai")}
          </span>
          <strong>
            {data.completed}
            <small> / {data.totalLessons}</small>
          </strong>
          <small>
            {t("Your foundation is growing", "Fondasi kamu terus bertumbuh")}
          </small>
        </article>
        <article className="stat">
          <span>
            <Layers size={18} />
            {t("Ready to review", "Siap direview")}
          </span>
          <strong>{data.due}</strong>
          <Link href="/review">
            {t("Keep words fresh", "Ingat kembali kata")} →
          </Link>
        </article>
      </div>
      <div className="dashboard-grid">
        <section className="card">
          <div className="section-heading">
            <h2>{t("Your weekly rhythm", "Ritme mingguanmu")}</h2>
            <Link href="/progress">
              {t("View progress", "Lihat progres")} →
            </Link>
          </div>
          <p className="muted">
            {t(
              "XP from your actual learning and review history",
              "XP dari riwayat belajar dan review kamu",
            )}
          </p>
          <div className="weekly-chart" aria-label="Weekly XP chart">
            {data.chart.map((d) => (
              <div key={d.day}>
                <small>{d.xp || ""}</small>
                <span
                  style={{
                    height: `${d.xp ? Math.max(8, (d.xp / Math.max(...data.chart.map((v) => v.xp), 1)) * 90) : 3}px`,
                  }}
                />
                <label>
                  {new Date(d.day + "T12:00:00Z").toLocaleDateString(
                    user!.profile.locale,
                    { weekday: "short" },
                  )}
                </label>
              </div>
            ))}
          </div>
          <div className="goal-row">
            <div>
              <strong>{t("Daily XP goal", "Target XP harian")}</strong>
              <small>
                {data.todayXp} / {goalXp} XP · {user!.profile.dailyMinutes}{" "}
                {t("minute preference", "menit pilihan")}
              </small>
            </div>
            <span>
              {Math.min(100, Math.round((data.todayXp / goalXp) * 100))}%
            </span>
          </div>
          <div className="progress-track">
            <span
              style={{
                width: `${Math.min(100, (data.todayXp / goalXp) * 100)}%`,
              }}
            />
          </div>
        </section>
        <section className="card review-feature">
          <span className="mini-art">温习</span>
          <h2>
            {data.due
              ? t(
                  "A fresh look at familiar words",
                  "Ingat kembali kata yang dikenal",
                )
              : t("Let your words take root", "Biarkan kata-katamu berakar")}
          </h2>
          <p>
            {data.due
              ? t(
                  `${data.due} words are ready for another look.`,
                  `${data.due} kata siap untuk dilihat kembali.`,
                )
              : t(
                  "Finish a lesson to grow your personal review library.",
                  "Selesaikan pelajaran untuk menambah pustaka review.",
                )}
          </p>
          <Link className="button ghost full" href="/review">
            {t("Open review", "Buka review")}
            <ArrowRight size={18} />
          </Link>
        </section>
      </div>
      <div className="section-heading">
        <h2>{t("Your learning path", "Jalur belajarmu")}</h2>
        <Link href="/learn">{t("All units", "Semua unit")} →</Link>
      </div>
      <Roadmap compact />
      <div className="notice">
        {t(
          "Original beginner draft. Human linguistic review is pending. No official HSK alignment or accreditation is claimed.",
          "Materi pemula asli. Tinjauan ahli bahasa masih diperlukan. Tidak ada klaim pemetaan atau akreditasi HSK resmi.",
        )}
      </div>
    </div>
  );
}
export function Roadmap({
  compact = false,
  unitId,
}: {
  compact?: boolean;
  unitId?: string;
}) {
  const { t, b } = useApp();
  const { data, error } = useData<Unit[]>("curriculum");
  if (!data)
    return (
      <>
        <ErrorBox message={error} />
        <Loading />
      </>
    );
  const units = unitId
    ? data.filter((u) => u.id === unitId)
    : compact
      ? data.slice(0, 3)
      : data;
  return (
    <div className={unitId ? "unit-lessons" : "roadmap"}>
      {units.map((u) => (
        <article key={u.id} className="unit-card">
          <div className="unit-top">
            <span className="unit-glyph">{u.icon}</span>
            <div>
              <small>UNIT {String(u.order).padStart(2, "0")}</small>
              <h2>
                <Link href={`/learn/${u.id}`}>{b(u.title)}</Link>
              </h2>
              <p>{b(u.description)}</p>
            </div>
          </div>
          <div className="lesson-list">
            {u.lessons
              .filter((l) => l.versions.length)
              .map((l) => {
                const v = l.versions[0],
                  p = v.progress[0];
                const done = p?.completedAt;
                const completedIds = data
                  .flatMap((u) => u.lessons)
                  .filter((l) =>
                    l.versions.some((v) =>
                      v.progress.some((p) => p.completedAt),
                    ),
                  )
                  .map((l) => l.id);
                const locked = l.prerequisites.some(
                  (r) => !completedIds.includes(r.requiredId),
                );
                return (
                  <Link
                    key={l.id}
                    href={locked ? `/learn/${u.id}` : `/lesson/${l.id}`}
                    className="lesson-link"
                    aria-disabled={locked}
                  >
                    <span
                      className={done ? "lesson-dot complete" : "lesson-dot"}
                    >
                      {done ? <Check size={17} /> : l.order}
                    </span>
                    <span>
                      <strong>{b(v.title)}</strong>
                      <small>
                        {v.estimatedMinutes} {t("min", "menit")}
                        {p && !done ? " · " + t("Resume", "Lanjutkan") : ""}
                        {locked
                          ? " · " +
                            t("Prerequisite required", "Perlu prasyarat")
                          : ""}
                      </small>
                    </span>
                    <ArrowRight size={17} />
                  </Link>
                );
              })}
          </div>
        </article>
      ))}
    </div>
  );
}
export function Learn({ unitId }: { unitId?: string }) {
  const { t } = useApp();
  return (
    <div id="main">
      <div className="page-heading">
        <div>
          {unitId && (
            <Link className="text-link" href="/learn">
              ← {t("All units", "Semua unit")}
            </Link>
          )}
          <span className="eyebrow">FOUNDATIONS · ORIGINAL V0.1</span>
          <h1>{t("Your Mandarin path", "Jalur Mandarinmu")}</h1>
          <p>
            {t(
              "Ten everyday themes. Thirty small steps. Begin anywhere.",
              "Sepuluh tema sehari-hari. Tiga puluh langkah kecil. Mulai dari mana saja.",
            )}
          </p>
        </div>
        <Link className="button ghost" href="/grammar">
          {t("Grammar library", "Pustaka tata bahasa")}
        </Link>
      </div>
      <Roadmap unitId={unitId} />
    </div>
  );
}
type Feedback = {
  correct: boolean;
  explanation: Bi;
  answer: string | string[];
  cursor: number;
};
type Result = {
  accuracy: number;
  mastery?: number;
  xp: number;
  words: number;
  duplicate: boolean;
};
export function LessonPlayer({ id }: { id: string }) {
  const router = useRouter();
  const { t, b, user } = useApp();
  const { data, error: loadError } = useData<Lesson>("lessons/" + id);
  const [started, setStarted] = useState(false),
    [index, setIndex] = useState(0),
    [answer, setAnswer] = useState<string | string[]>(""),
    [feedback, setFeedback] = useState<Feedback | null>(null),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [hint, setHint] = useState(false),
    [attempts, setAttempts] = useState<Attempt[]>([]);
  const pending = useRef<{ eventId: string; payload: string } | null>(null);
  useEffect(() => {
    if (data) {
      setIndex(Math.min(data.progress.cursor, data.exercises.length - 1));
      setStarted(data.progress.cursor > 0);
      setAttempts(data.progress.attempts);
      if (data.progress.completedAt)
        void api<Result>(`lessons/${id}/complete`, {})
          .then(setResult)
          .catch((e) => setError(e.message));
    }
  }, [data, id]);
  if (!data)
    return (
      <main id="main" className="lesson-page">
        <ErrorBox message={loadError} />
        <Loading />
      </main>
    );
  const e = data.exercises[index];
  const vocab = data.vocabulary.map((v) => v.vocabulary);
  const label = (value: string) =>
    vocab
      .find((w) => w.id === value)
      ?.translations.find((v) => v.locale === user!.profile.locale)?.text ??
    data.exercises.flatMap((e) => e.options).find((o) => o.text === value)
      ?.display?.[user!.profile.locale] ??
    value;
  async function check() {
    setBusy(true);
    setError("");
    try {
      const submitted =
        e.type === "ordering" && Array.isArray(answer)
          ? answer.map((v) => v.split(":").slice(1).join(":"))
          : answer;
      const payload = JSON.stringify(submitted);
      if (!pending.current || pending.current.payload !== payload)
        pending.current = { eventId: uid(), payload };
      const response = await api<Feedback>(`lessons/${id}/attempt`, {
        exerciseId: e.id,
        answer: submitted,
        eventId: pending.current.eventId,
      });
      pending.current = null;
      setFeedback(response);
      setAttempts((prev) => [
        ...prev,
        {
          exerciseId: e.id,
          answer: submitted,
          correct: response.correct,
          attemptNo: prev.filter((a) => a.exerciseId === e.id).length + 1,
        },
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function move(next: number) {
    setIndex(next);
    setAnswer("");
    setFeedback(null);
    setHint(false);
    setError("");
    pending.current = null;
  }
  async function next() {
    if (index < data!.exercises.length - 1) {
      move(index + 1);
      return;
    }
    setBusy(true);
    try {
      setResult(await api<Result>(`lessons/${id}/complete`, {}));
    } catch (err) {
      setError((err as Error).message);
      const wrong = data!.exercises.findIndex(
        (ex) => !attempts.filter((a) => a.exerciseId === ex.id).at(-1)?.correct,
      );
      if (wrong >= 0) {
        setIndex(wrong);
        setAnswer("");
        setFeedback(null);
        setHint(false);
      }
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    if (
      result ||
      confirm(
        t(
          "Leave this lesson? Your saved answers will be here when you return.",
          "Keluar dari pelajaran? Jawaban tersimpan dapat dilanjutkan nanti.",
        ),
      )
    )
      router.push("/learn");
  };
  if (result)
    return (
      <main id="main" className="lesson-page completion">
        <span className="completion-medal">
          <Trophy size={48} />
        </span>
        <span className="eyebrow">
          {t("ONE STEP FURTHER", "SATU LANGKAH LEBIH MAJU")}
        </span>
        <h1>
          {t("You made room for progress.", "Kamu berhasil melangkah maju.")}
        </h1>
        <p>{b(data.title)}</p>
        <div className="completion-stats">
          <div>
            <strong>{result.accuracy}%</strong>
            <small>{t("First-try accuracy", "Akurasi jawaban pertama")}</small>
          </div>
          <div>
            <strong>{result.xp} XP</strong>
            <small>
              {t(
                result.duplicate ? "Already awarded" : "Server verified",
                result.duplicate ? "Sudah diberikan" : "Diverifikasi server",
              )}
            </small>
          </div>
          <div>
            <strong>{result.words}</strong>
            <small>
              {t("Words in your review library", "Kata di pustaka review")}
            </small>
          </div>
        </div>
        <p>
          {t(
            "Your answers, progress, and review cards are saved. Retries helped you learn; first-try accuracy is reported honestly.",
            "Jawaban, progres, dan kartu review tersimpan. Pengulangan membantu belajar; akurasi pertama ditampilkan apa adanya.",
          )}
        </p>
        <div className="word-chips">
          {vocab.map((w) => (
            <span key={w.id}>
              {w.hanzi} · {w.pinyin}
            </span>
          ))}
        </div>
        <div className="row">
          <Link className="button" href="/dashboard">
            {t("Back to today", "Kembali ke hari ini")}
            <ArrowRight size={18} />
          </Link>
          <Link className="button ghost" href="/review">
            {t("Review these words", "Review kata ini")}
          </Link>
        </div>
        <div className="completion-mistakes">
          {attempts
            .filter((a) => a.attemptNo === 1 && !a.correct)
            .map((a) => (
              <p key={a.exerciseId}>
                {t("Practice again", "Latih kembali")}:{" "}
                {b(data.exercises.find((e) => e.id === a.exerciseId)?.prompt)}
              </p>
            ))}
        </div>
      </main>
    );
  return (
    <main id="main" className="lesson-page">
      <header className="lesson-header">
        <button
          className="icon-button"
          onClick={close}
          aria-label={t("Close lesson", "Tutup pelajaran")}
        >
          <X />
        </button>
        <div className="progress-track">
          <span
            style={{
              width: `${started ? (index / data.exercises.length) * 100 : 0}%`,
            }}
          />
        </div>
        <small>
          {started ? index + 1 : 0} / {data.exercises.length}
        </small>
      </header>
      {!started ? (
        <section className="lesson-intro">
          <span className="eyebrow">LESSON · VERSION {data.version}</span>
          <h1>{b(data.title)}</h1>
          <p>{b(data.objective)}</p>
          <span className="tag">
            <Clock size={14} />
            {data.estimatedMinutes} {t("minutes", "menit")} · {data.threshold}%{" "}
            {t("mastery threshold", "batas penguasaan")}
          </span>
          <h2>{t("Meet your words", "Kenali kata-katamu")}</h2>
          <div className="intro-words">
            {vocab.map((w) => (
              <article className="card" key={w.id}>
                <div className="section-heading">
                  <span className="hanzi medium">{w.hanzi}</span>
                  <AudioButton text={w.hanzi} />
                </div>
                <p className="pinyin">{w.pinyin}</p>
                <strong>{label(w.id)}</strong>
                <p className="hanzi">{w.sample}</p>
                <small>{w.samplePinyin}</small>
                <p>{b(w.sampleTranslation)}</p>
                <AudioButton text={w.sample} slow />
              </article>
            ))}
          </div>
          {data.grammar.map((g) => (
            <div className="notice" key={g.grammar.id}>
              <div>
                <strong>{g.grammar.pattern}</strong>
                <p>{b(g.grammar.explanation)}</p>
              </div>
            </div>
          ))}
          {data.dialogues.map((d, i) => (
            <details key={i}>
              <summary>{t("Mini dialogue", "Dialog singkat")}</summary>
              {d.lines.map((l, j) => (
                <p key={j}>
                  {l.speaker}: <span className="hanzi">{l.hanzi}</span> ·{" "}
                  {l.pinyin} · {b(l.translation)} <AudioButton text={l.hanzi} />
                </p>
              ))}
            </details>
          ))}
          <button
            className="button full"
            onClick={() => {
              setStarted(true);
              move(0);
            }}
          >
            {t("Start practice", "Mulai latihan")}
            <ArrowRight size={18} />
          </button>
          <small className="muted">
            {t(
              "Audio uses an installed Mandarin device voice; availability varies.",
              "Audio menggunakan suara Mandarin perangkat; ketersediaan berbeda.",
            )}
          </small>
        </section>
      ) : (
        <section className="exercise">
          <span className="eyebrow">
            {e.type.toUpperCase()} · {b(data.title)}
          </span>
          <h1>{b(e.prompt)}</h1>
          {e.hanzi && (
            <div className="exercise-hanzi">
              <span className="hanzi large">{e.hanzi}</span>
              <AudioButton text={e.hanzi} />
            </div>
          )}
          {user!.profile.pinyin && e.pinyin && e.type !== "pinyin" && (
            <p className="pinyin">{e.pinyin}</p>
          )}
          <ExerciseInput
            e={e}
            answer={answer}
            setAnswer={setAnswer}
            disabled={Boolean(feedback) || busy}
            label={label}
            vocab={vocab}
          />
          {!feedback && (
            <button className="text-link" onClick={() => setHint(!hint)}>
              {t("Need a hint?", "Butuh petunjuk?")}
            </button>
          )}
          {hint && <p className="notice">{b(e.hint)}</p>}
          <ErrorBox message={error} />
          {feedback ? (
            <div
              className={
                feedback.correct ? "feedback correct" : "feedback incorrect"
              }
              role="status"
            >
              <strong>
                {feedback.correct
                  ? t("That’s right!", "Benar!")
                  : t(
                      "A useful mistake. Try again.",
                      "Kesalahan yang berguna. Coba lagi.",
                    )}
              </strong>
              <p>{b(feedback.explanation)}</p>
              {!feedback.correct && (
                <p>
                  {t("Answer", "Jawaban")}:{" "}
                  {Array.isArray(feedback.answer)
                    ? feedback.answer.map(label).join(" · ")
                    : label(feedback.answer)}
                </p>
              )}
              <div className="row">
                {!feedback.correct && (
                  <button
                    className="button ghost"
                    onClick={() => {
                      setFeedback(null);
                      setAnswer("");
                      setError("");
                    }}
                  >
                    <RotateCcw size={17} />
                    {t("Retry", "Ulangi")}
                  </button>
                )}
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void next()}
                >
                  {index === data.exercises.length - 1
                    ? t("Finish lesson", "Selesaikan pelajaran")
                    : t("Continue", "Lanjut")}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <button
              className="button full"
              disabled={
                busy ||
                !answer ||
                (Array.isArray(answer) && answer.length === 0)
              }
              onClick={() => void check()}
            >
              {busy
                ? t("Checking…", "Memeriksa…")
                : t("Check answer", "Periksa jawaban")}
              <Check size={18} />
            </button>
          )}
        </section>
      )}
    </main>
  );
}
function ExerciseInput({
  e,
  answer,
  setAnswer,
  disabled,
  label,
  vocab,
}: {
  e: Exercise;
  answer: string | string[];
  setAnswer: (v: string | string[]) => void;
  disabled: boolean;
  label: (v: string) => string;
  vocab: Lesson["vocabulary"][number]["vocabulary"][];
}) {
  const { t } = useApp();
  const ordered = [...e.options].sort(
    (a, b) =>
      ((a.order * 7 + e.order * 3) % 11) - ((b.order * 7 + e.order * 3) % 11),
  );
  if (e.type === "blank")
    return (
      <label>
        {t("Your answer in Hanzi", "Jawaban dalam Hanzi")}
        <input
          autoFocus
          value={typeof answer === "string" ? answer : ""}
          onChange={(ev) => setAnswer(ev.target.value)}
          disabled={disabled}
          maxLength={1000}
        />
      </label>
    );
  if (e.type === "ordering") {
    const indices = Array.isArray(answer)
      ? answer.map((v) => Number(v.split(":")[0]))
      : [];
    const selected = Array.isArray(answer) ? answer : [];
    return (
      <div>
        <div className="sentence-builder" aria-label="Your sentence">
          {selected.map((token, i) => (
            <button
              key={i}
              disabled={disabled}
              onClick={() =>
                setAnswer(selected.filter((_, j) => j !== i).map((v) => v))
              }
            >
              {token.split(":").slice(1).join(":")}
            </button>
          ))}
          {selected.length === 0 && (
            <span>{t("Tap words in order", "Ketuk kata sesuai urutan")}</span>
          )}
        </div>
        <div className="token-list">
          {ordered.map((o) => (
            <button
              key={o.id}
              className="token"
              disabled={disabled || indices.includes(o.order)}
              onClick={() => setAnswer([...selected, `${o.order}:${o.text}`])}
            >
              {o.text}
            </button>
          ))}
        </div>
        <button
          className="text-link"
          disabled={disabled}
          onClick={() => setAnswer([])}
        >
          {t("Clear sentence", "Hapus kalimat")}
        </button>
      </div>
    );
  }
  if (e.type === "matching") {
    const values = Array.isArray(answer) ? answer : [];
    return (
      <div className="matching">
        {e.options.map((o, i) => (
          <label key={o.id}>
            <span className="hanzi">
              {o.hanzi ?? vocab.find((v) => v.id === o.text)?.hanzi ?? o.text}
            </span>
            <select
              disabled={disabled}
              value={values[i] ?? ""}
              onChange={(ev) => {
                const next = e.options.map((_, j) => values[j] ?? "");
                next[i] = ev.target.value;
                setAnswer(next);
              }}
            >
              <option value="">{t("Choose meaning", "Pilih arti")}</option>
              {ordered.map((choice) => (
                <option key={choice.id} value={choice.text}>
                  {label(choice.text)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    );
  }
  return (
    <div
      className="answer-options"
      role="radiogroup"
      aria-label={t("Answer options", "Pilihan jawaban")}
    >
      {ordered.map((o, i) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={answer === o.text}
          disabled={disabled}
          className={
            answer === o.text ? "answer-option selected" : "answer-option"
          }
          onClick={() => setAnswer(o.text)}
        >
          <span className="option-letter">{String.fromCharCode(65 + i)}</span>
          <span
            className={
              ["character", "dialogue"].includes(e.type) ? "hanzi" : ""
            }
          >
            {e.type === "choice" ? label(o.text) : o.text}
          </span>
          {answer === o.text && <Check size={18} />}
        </button>
      ))}
    </div>
  );
}
