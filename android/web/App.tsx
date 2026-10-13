import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
} from "react";
import { createRoot } from "react-dom/client";
import {program as learningProgram} from "./program";
import { illustration } from "./illustrations";
import {Academy,ProgramRunner,Mistakes,GuidedRecording,MasteryPanel,type ProgramState} from "./ProgramUI";
import {
  BookOpen,
  Layers,
  Mic,
  Library,
  UserRound,
  Volume2,
  ArrowRight,
  Check,
  X,
  Flame,
  Trophy,
  Settings,
  Star,
  Undo2,
  Trash2,
  Play,
  Square,
} from "lucide-react";
import type {
  units,
  words,
  grammar,
  lessonDrafts,
  Bilingual,
} from "../../src/lib/content";
import { strokeGuides, followsGuide, Point } from "../../src/lib/strokes";
type Curriculum = {
  version: string;
  units: typeof units;
  words: typeof words;
  grammar: typeof grammar;
  lessons: typeof lessonDrafts;
};
type Profile = {
  name: string;
  locale: "id" | "en";
  experience: string;
  goal: string;
  dailyMinutes: number;
  timezone: string;
  onboardingStep: number;
  onboardingDone: boolean;
  pinyin: boolean;
  theme: string;
  favorites: string[];
  placementScore?: number;
};
type Progress = {
  lesson_id: string;
  cursor: number;
  accuracy: number | null;
  completed_at: number | null;
  started_at: number;
};
type Review = {
  vocab_id: string;
  due: number;
  ease: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
};
export type DeviceState = {
  program: ProgramState;
  now: number;
  profile: Profile;
  progress: Progress[];
  reviews: Review[];
  points: number;
  streak: number;
  activity: { amount: number; kind: string; created_at: number }[];
  writing: {
    id: number;
    character: string;
    seconds: number;
    created_at: number;
  }[];
  sessions: { seconds: number }[];
  serverVerified: false;
};
type Cap = {
  ttsReady: boolean;
  mandarinVoice: boolean;
  microphoneGranted: boolean;
  backend: string;
  bundledAudio: boolean;
  audioClips: number;
};
type Attempt = {
  order: number;
  attemptNo: number;
  answer: string | string[];
  correct: boolean;
};
type LessonProgress = {
  cursor: number;
  accuracy: number | null;
  completedAt: number | null;
  attempts: Attempt[];
};
type Feedback = {
  correct: boolean;
  answer: string | string[];
  explanation: Bilingual;
};
type Completion = {
  accuracy: number;
  points: number;
  duplicate: boolean;
  words: number;
};
declare global {
  interface Window {
    HanyuNative?: { request: (method: string, data: string) => string };
    handleAndroidBack?: () => boolean;
  }
}
export function native<T>(method: string, data: unknown = {}): T {
  if (!window.HanyuNative)
    throw new Error("Install the Android APK to use device learning.");
  const response = JSON.parse(
    window.HanyuNative.request(method, JSON.stringify(data)),
  );
  if (response.error) throw new Error(response.error);
  return response.data as T;
}
const uid = () => native<string>("uuid");
const Context = createContext<{
  content: Curriculum;
  state: DeviceState;
  refresh: () => void;
  t: (en: string, id: string) => string;
  b: (v: Bilingual) => string;
  go: (route: string) => void;
  notice: (v: string) => void;
}>(null!);
export const useApp = () => useContext(Context);
export function Mascot({ mood = "wave", className = "" }: { mood?: string; className?: string }) {
  return <img src="mascot/pinyin.png" alt="Pinyin" className={`pinyin-mascot ${mood} ${className}`} width="140" height="150" />;
}
function Audio({ text, slow = false }: { text: string; slow?: boolean }) {
  const { notice, t } = useApp();
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const listen = (event: Event) => {
      const e = (event as CustomEvent).detail;
      if (e.type !== "audio") return;
      setPlaying(e.data.text === text && Math.abs(e.data.speed - (slow ? .65 : 1)) < .001 && e.data.status === "playing" && e.data.isPlaying);
      if (e.data.status === "error") notice(e.data.error);
    };
    window.addEventListener("hanyu-native", listen);
    return () => window.removeEventListener("hanyu-native", listen);
  }, [text, slow, notice]);
  return <button className={`icon-button audio-button ${playing ? "playing" : ""}`} data-audio-text={text} data-audio-speed={slow ? .65 : 1}
    aria-label={t(slow ? "Play slowly" : "Play Mandarin", slow ? "Putar perlahan" : "Putar Mandarin")} aria-pressed={playing}
    onClick={() => { try { native("speak", { text, slow }); } catch (e) { notice((e as Error).message); } }}>
    <Volume2 size={22} />{slow && <small>0.65x</small>}
  </button>;
}
function App() {
  const [content, setContent] = useState<Curriculum | null>(null),
    [state, setState] = useState<DeviceState | null>(null),
    [route, setRoute] = useState("dashboard"),
    [notice, setNotice] = useState(""),
    [fatal, setFatal] = useState("");
  const history = useRef<string[]>([]);
  const refresh = useCallback(() => {
    try {
      setState(native<DeviceState>("state"));
    } catch (e) {
      setFatal((e as Error).message);
    }
  }, []);
  useEffect(() => {
    fetch("curriculum.json")
      .then((r) => r.json())
      .then(setContent)
      .catch((e) => setFatal(e.message));
    refresh();
    const listen = (e: Event) => {
      const event = (e as CustomEvent).detail;
      if (event.type === "message") setNotice(event.data.message);
    };
    window.addEventListener("hanyu-native", listen);
    return () => window.removeEventListener("hanyu-native", listen);
  }, [refresh]);
  const go = useCallback(
    (next: string) => {
      if (next !== route) {
        native("audioStop");
        history.current.push(route);
        setRoute(next);
        window.scrollTo(0, 0);
      }
    },
    [route],
  );
  useEffect(() => {
    window.handleAndroidBack = () => {
      if (
        (route.startsWith("lesson/") || route.startsWith("program/")) &&
        !confirm(
          state?.profile.locale === "en"
            ? "Leave the lesson? Your saved answers remain on this device."
            : "Keluar dari pelajaran? Jawaban tersimpan di perangkat.",
        )
      )
        return true;
      if (history.current.length) {
        native("audioStop");
        setRoute(history.current.pop()!);
        window.scrollTo(0, 0);
        return true;
      }
      if (route !== "dashboard") {
        setRoute("dashboard");
        return true;
      }
      return false;
    };
    return () => {
      delete window.handleAndroidBack;
    };
  }, [route, state?.profile.locale]);
  useEffect(() => {
    if (state) {
      document.documentElement.lang = state.profile.locale;
      document.documentElement.dataset.theme =
        state.profile.theme === "system"
          ? matchMedia("(prefers-color-scheme:dark)").matches
            ? "dark"
            : "light"
          : state.profile.theme;
    }
  }, [state]);
  if (fatal)
    return (
      <main className="legal">
        <h1>HanyuFlow Android</h1>
        <p role="alert">{fatal}</p>
      </main>
    );
  if (!state || !content)
    return <div className="loading">HanyuFlow · Memuat…</div>;
  const t = (en: string, id: string) =>
      state.profile.locale === "en" ? en : id,
    b = (v: Bilingual) => v[state.profile.locale];
  const [page, id] = route.split("/");
  const nav = [
    ["learn", BookOpen, t("Learn", "Belajar")],
    ["review", Layers, t("Review", "Review")],
    ["speaking", Mic, t("Speak", "Bicara")],
    ["vocabulary", Library, t("Vocabulary", "Kosakata")],
    ["profile", UserRound, t("Profile", "Profil")],
  ] as const;
  return (
    <Context.Provider
      value={{ content, state, refresh, t, b, go, notice: setNotice }}
    >
      <div className={"android-app " + (page === "lesson" || page === "program" ? "is-lesson" : "")}>
        <header className="mobile-header">
          <button className="text-link" onClick={() => go("dashboard")}>
            <span className="brand">
              <img className="brand-pinyin" src="mascot/pinyin.png" alt="" width="32" height="36" />Hanyu<span>Flow</span>
            </span>
          </button>
          <span className="android-mode">
            {t("Offline ready", "Siap offline")}
          </span>
        </header>
        <main id="main" className="android-content">
          {!state.profile.onboardingDone ? (
            <Onboarding />
          ) : page === "dashboard" ? (
            <Dashboard />
          ) : page === "learn" ? (
            <Academy />
          ) : page === "legacy" ? (
            <Learn id={id} />
          ) : page === "program" ? (
            <ProgramRunner id={id} />
          ) : page === "mistakes" ? (
            <Mistakes />
          ) : page === "record" ? (
            <GuidedRecording phrase={decodeURIComponent(id)} />
          ) : page === "lesson" ? (
            <Lesson id={id} />
          ) : page === "review" ? (
            <Reviews />
          ) : page === "vocabulary" ? (
            <Vocabulary id={id} />
          ) : page === "grammar" ? (
            <Grammar />
          ) : page === "speaking" ? (
            <Speaking />
          ) : page === "hanzi" ? (
            <Writing />
          ) : page === "profile" ? (
            <ProfilePage />
          ) : page === "settings" ? (
            <SettingsPage />
          ) : page === "progress" ? (
            <><MasteryPanel/><ProgressPage /></>
          ) : (
            <Dashboard />
          )}
        </main>
        {state.profile.onboardingDone && !(route.startsWith("lesson/") || route.startsWith("program/")) && (
          <nav
            className="bottom-nav"
            aria-label={t("Main navigation", "Navigasi utama")}
          >
            {nav.map(([href, Icon, label]) => (
              <button
                key={href}
                onClick={() => go(href)}
                className={"text-link nav-item " + (page === href ? "active" : "")}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontSize: 10,
                  color: page === href ? "var(--blue)" : "var(--muted)",
                  padding: 0,
                  minWidth: 55,
                }}
              >
                <Icon size={24} strokeWidth={2.6} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        )}
        {notice && (
          <div className="native-error" role="status">
            <span>{notice}</span>
            <button aria-label="Dismiss message" onClick={() => setNotice("")}>
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </Context.Provider>
  );
}
function Onboarding() {
  const { state, refresh, t, b, notice } = useApp();
  const [profile, setProfile] = useState(state.profile),
    [answers, setAnswers] = useState(["", "", ""]);
  const step = profile.onboardingStep;
  function next(value: number, done = false) {
    try {
      native("profile", {
        ...profile,
        onboardingStep: value,
        onboardingDone: done,
        ...(answers.every(Boolean) ? { placementAnswers: answers } : {}),
      });
      refresh();
      setProfile({ ...profile, onboardingStep: value, onboardingDone: done });
    } catch (e) {
      notice((e as Error).message);
    }
  }
  const choices = (
    key: keyof Profile,
    list: [string | number, Bilingual][],
  ) => (
    <div className="onboarding-options">
      {list.map(([value, label]) => (
        <button
          key={value}
          className={
            "choice-card " + (profile[key] === value ? "selected" : "")
          }
          onClick={() => setProfile({ ...profile, [key]: value })}
        >
          <strong>{b(label)}</strong>
          {profile[key] === value && <Check />}
        </button>
      ))}
    </div>
  );
  return (
    <div className="onboarding">
      <Mascot className="onboarding-pinyin" />
      <span className="eyebrow">
        {t(`STEP ${step + 1} OF 6`, `LANGKAH ${step + 1} DARI 6`)}
      </span>
      <div className="progress-track">
        <span style={{ width: `${((step + 1) / 6) * 100}%` }} />
      </div>
      <h1>
        {
          [
            t("Make it yours", "Mulai perjalananmu"),
            t("Where are you starting?", "Mulai dari mana?"),
            t("Your learning goal", "Tujuan belajarmu"),
            t("Your daily rhythm", "Ritme harianmu"),
            t("Your study timezone", "Zona waktu belajarmu"),
            t("A small starting point", "Tes awal singkat"),
          ][step]
        }
      </h1>
      <p>
        {t(
          "Lessons and progress work offline on this phone. No server account is created.",
          "Pelajaran dan progres bekerja offline di ponsel ini. Akun server tidak dibuat.",
        )}
      </p>
      <button className="button full" onClick={() => next(step, true)}>
        {t("Start now", "Mulai langsung")}
        <ArrowRight size={18} />
      </button>
      <p className="subtitle" style={{ marginTop: 12 }}>
        {t(
          "Personalization below is optional. No login or AI setup is needed.",
          "Personalisasi di bawah opsional. Tidak perlu login atau menyiapkan AI.",
        )}
      </p>
      {step === 0 && (
        <>
          <label>
            {t("Your name", "Nama kamu")}
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              maxLength={60}
            />
          </label>
          {choices("locale", [
            ["id", { en: "Bahasa Indonesia", id: "Bahasa Indonesia" }],
            ["en", { en: "English", id: "English" }],
          ])}
        </>
      )}
      {step === 1 &&
        choices("experience", [
          ["beginner", { en: "A fresh start", id: "Mulai dari nol" }],
          ["some", { en: "A few familiar words", id: "Sudah tahu sedikit" }],
          [
            "intermediate",
            { en: "Building confidence", id: "Meningkatkan percaya diri" },
          ],
        ])}
      {step === 2 &&
        choices("goal", [
          ["travel", { en: "Travel", id: "Wisata" }],
          ["work", { en: "Work", id: "Kerja" }],
          ["school", { en: "School", id: "Sekolah" }],
          [
            "hsk",
            {
              en: "HSK foundations (not official)",
              id: "Dasar HSK (belum resmi)",
            },
          ],
          ["friends", { en: "Friends", id: "Teman" }],
          ["curiosity", { en: "Curiosity", id: "Rasa ingin tahu" }],
        ])}
      {step === 3 &&
        choices(
          "dailyMinutes",
          [5, 10, 15, 20, 30].map((value) => [
            value,
            { en: value + " minutes", id: value + " menit" },
          ]),
        )}
      {step === 4 && (
        <label>
          {t("Timezone", "Zona waktu")}
          <input
            value={profile.timezone}
            onChange={(e) =>
              setProfile({ ...profile, timezone: e.target.value })
            }
          />
          <small>
            {t(
              "A valid IANA timezone, such as Asia/Jakarta or UTC.",
              "Zona waktu IANA, misalnya Asia/Jakarta atau UTC.",
            )}
          </small>
        </label>
      )}
      {step === 5 && (
        <section className="card">
          <p>
            {t(
              "Optional scored baseline. All beginner units stay open.",
              "Tes awal opsional yang dinilai. Semua unit pemula tetap terbuka.",
            )}
          </p>
          {[
            ["你好", ["hello", "thank you", "goodbye"]],
            ["我", ["wǒ", "nǐ", "tā"]],
            ["I drink water / Saya minum air", ["我喝水", "水喝我", "我是水"]],
          ].map(([prompt, options], i) => (
            <label key={i}>
              {prompt as string}
              <select
                value={answers[i]}
                onChange={(e) =>
                  setAnswers(
                    answers.map((a, j) => (i === j ? e.target.value : a)),
                  )
                }
              >
                <option value="">{t("Skip", "Lewati")}</option>
                {(options as string[]).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
        </section>
      )}
      <div className="onboarding-actions">
        <button
          className="button ghost"
          disabled={step === 0}
          onClick={() => next(step - 1)}
        >
          {t("Back", "Kembali")}
        </button>
        <button
          className="button"
          onClick={() => next(Math.min(5, step + 1), step === 5)}
        >
          {step === 5
            ? t("Start learning", "Mulai belajar")
            : t("Continue", "Lanjut")}
          <ArrowRight size={17} />
        </button>
      </div>
      <div className="notice">
        {t(
          "Device practice points are local records, not server-verified XP. Cloud login and AI require a configured reachable HTTPS backend.",
          "Poin latihan perangkat adalah catatan lokal, bukan XP terverifikasi server. Login cloud dan AI memerlukan backend HTTPS yang dapat dijangkau.",
        )}
      </div>
    </div>
  );
}
function Dashboard() {
  const { state, content, t, go } = useApp();
  const done=state.progress.filter(p=>p.completed_at),due=state.reviews.filter(r=>r.due<=state.now).length;
  const next=state.progress.find(p=>!p.completed_at)?.lesson_id??content.lessons.find(l=>!done.some(p=>p.lesson_id===l.id))?.id;
  return <>
    <div className="learning-counters" aria-label={t("Your device progress", "Kemajuan perangkatmu")}>
      <span><Flame size={21}/><strong>{state.streak}</strong><small>{t("day streak","hari beruntun")}</small></span>
      <span><Star size={21}/><strong>{state.points}</strong><small>{t("practice points","poin latihan")}</small></span>
      <span><BookOpen size={21}/><strong>{done.length}/30</strong><small>{t("original practice","latihan lama")}</small></span>
    </div>
    <div className="hello-strip"><div><h1>{t(`Hello, ${state.profile.name.split(" ")[0]}.`,`Halo, ${state.profile.name.split(" ")[0]}.`)}</h1><p>{t("A little Mandarin, every day.","Sedikit Mandarin, setiap hari.")}</p></div>
      <button className="button" onClick={()=>{const active=state.program.runs.find(r=>r.status==="ACTIVE"),fresh=learningProgram.courses.find(c=>!state.program.runs.some(r=>r.course_id===c.id&&r.status==="DONE"));go(active?"program/"+active.course_id:fresh?"program/"+fresh.id:next?"lesson/"+next:"learn");}}>{t("Continue learning","Lanjut belajar")}<Play size={16}/></button></div>
    <section className="card"><h2>{t("Foundation and everyday action","Fondasi dan penggunaan sehari-hari")}</h2><p>{state.program.completedCourses}/10 {t("guided modules; existing practice stays below","modul terbimbing; latihan lama tetap di bawah")}</p><button className="button" onClick={()=>go("learn")}>{t("Open the guided path","Buka jalur terbimbing")}</button><button className="button ghost" onClick={()=>go("mistakes")}>{t("Practice mistakes","Latih kesalahan")}</button></section>
    <Roadmap compact/>
    <button className="review-shortcut" onClick={()=>go("review")}><Layers/><span><strong>{t("Grow your vocabulary","Rawat kosakatamu")}</strong><small>{due} {t("words ready to review","kata siap direview")}</small></span><ArrowRight/></button>
    <div className="row"><button className="button ghost" onClick={()=>go("learn")}>{t("All units","Semua unit")}</button><button className="button ghost" onClick={()=>go("hanzi")}>{t("Writing studio","Latihan menulis")}</button></div>
    <p className="subtitle">{t("Original curriculum draft · human review pending · local practice points","Draf kurikulum asli · menunggu tinjauan ahli · poin latihan lokal")}</p>
  </>;
}
function Roadmap({ compact=false,id }: { compact?: boolean;id?:string }) {
  const {content,state,b,t,go}=useApp();
  const list=id?content.units.filter(u=>u.id===id):compact?content.units.slice(0,3):content.units;
  const firstOpen=content.lessons.find(l=>!state.progress.some(p=>p.lesson_id===l.id&&p.completed_at))?.id;
  return <div className="playful-roadmap">{list.map(u=><article key={u.id} className="path-unit">
    <div className="path-unit-header"><div><small>{t("BEGINNER","PEMULA")} · UNIT {u.order}</small><h2><button className="text-link" onClick={()=>go("learn/"+u.id)}>{b(u.title)}</button></h2><p>{b(u.description)}</p></div><button className="unit-notes" aria-label={t("Open grammar","Buka tata bahasa")} onClick={()=>go("grammar")}><BookOpen size={28}/></button></div>
    <div className="path-field"><div className="path-pinyin"><Mascot/><span>{t("One step at a time!","Satu langkah dulu!")}</span></div>
      {content.lessons.filter(l=>l.unitId===u.id).map((l,i)=>{const p=state.progress.find(p=>p.lesson_id===l.id),completed=Boolean(p?.completed_at),active=l.id===firstOpen||Boolean(p&&!completed);return <div key={l.id} className={`path-step step-${i} ${active?"current":""}`}>
        {active&&<span className="path-start">{t(p?"RESUME":"START",p?"LANJUT":"MULAI")}</span>}
        <button className={`path-node ${completed?"complete":active?"current":"available"}`} aria-label={b(l.title)+(completed?t(" · completed"," · selesai"):"")} onClick={()=>go("lesson/"+l.id)}>{completed?<Check size={32}/>:i===1?<span className="node-hanzi">{content.words.find(w=>w.id===l.vocabulary[0])?.hanzi.slice(0,1)}</span>:<Star size={32} fill="currentColor"/>}</button>
        <strong>{b(l.title)}</strong><small>{l.estimatedMinutes} {t("min","menit")}{completed?" · "+p?.accuracy+"%":""}</small>
      </div>;})}
      <div className="path-finish"><Trophy size={25}/><span>{state.progress.filter(p=>p.completed_at&&content.lessons.find(l=>l.id===p.lesson_id)?.unitId===u.id).length}/3 {t("completed","selesai")}</span></div>
    </div>
  </article>)}</div>;
}
function Learn({ id }: { id?: string }) {
  const { t, go } = useApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ORIGINAL BEGINNER V0.1</span>
          <h1>{t("Your Mandarin path", "Jalur Mandarinmu")}</h1>
          <p>
            {t(
              "10 units. 30 playable lessons. Start anywhere.",
              "10 unit. 30 pelajaran. Mulai di mana saja.",
            )}
          </p>
        </div>
      </div>
      {id && (
        <button className="text-link" onClick={() => go("learn")}>
          ← {t("All units", "Semua unit")}
        </button>
      )}
      <Roadmap id={id} />
    </>
  );
}
function Lesson({ id }: { id: string }) {
  const { content, state, t, b, go, refresh, notice } = useApp();
  const lesson = content.lessons.find((l) => l.id === id)!;
  const [progress, setProgress] = useState<LessonProgress | null>(null),
    [index, setIndex] = useState(0),
    [started, setStarted] = useState(false),
    [answer, setAnswer] = useState<string | string[]>(""),
    [feedback, setFeedback] = useState<Feedback | null>(null),
    [result, setResult] = useState<Completion | null>(null),
    [hint, setHint] = useState(false);
  const pending = useRef<{ event: string; answer: string } | null>(null);
  useEffect(() => {
    try {
      const p = native<LessonProgress>("lesson", { id });
      setProgress(p);
      setIndex(Math.min(p.cursor, lesson.exercises.length - 1));
      setStarted(p.cursor > 0);
      if (p.completedAt) setResult(native<Completion>("complete", { id }));
    } catch (e) {
      notice((e as Error).message);
    }
  }, [id, lesson.exercises.length, notice]);
  if (!progress) return <div className="loading">Loading…</div>;
  const e = lesson.exercises[index],
    vocab = content.words.filter((w) => lesson.vocabulary.includes(w.id));
  const label = (v: string) =>
    content.words.find((w) => w.id === v)
      ? b(content.words.find((w) => w.id === v)!.translation)
      : v;
  function move(n: number) {
    native("audioStop");
    setIndex(n);
    setAnswer("");
    setFeedback(null);
    setHint(false);
    pending.current = null;
  }
  function check() {
    try {
      const a =
        e.type === "ordering" && Array.isArray(answer)
          ? answer.map((v) => v.split(":").slice(1).join(":"))
          : answer;
      const payload = JSON.stringify(a);
      if (!pending.current || pending.current.answer !== payload)
        pending.current = { event: uid(), answer: payload };
      setFeedback(
        native<Feedback>("attempt", {
          lessonId: id,
          order: index,
          answer: a,
          eventId: pending.current.event,
        }),
      );
      pending.current = null;
      setProgress(native<LessonProgress>("lesson", { id }));
    } catch (error) {
      notice((error as Error).message);
    }
  }
  function next() {
    if (index < lesson.exercises.length - 1) {
      move(index + 1);
      return;
    }
    try {
      setResult(native<Completion>("complete", { id }));
      refresh();
    } catch (error) {
      notice((error as Error).message);
      const wrong = lesson.exercises.findIndex(
        (_, i) =>
          !progress!.attempts.filter((a) => a.order === i).at(-1)?.correct,
      );
      if (wrong >= 0) move(wrong);
    }
  }
  if (result)
    return (
      <section className="completion">
        <div className="celebration"><Mascot mood="celebrate" />{Array.from({length:12},(_,i)=><i key={i} style={{"--i":i} as React.CSSProperties}/>)}</div>
        <span className="completion-medal">
          <Trophy size={44} />
        </span>
        <span className="eyebrow">ONE STEP FURTHER</span>
        <h1>
          {t("You made room for progress.", "Kamu berhasil melangkah maju.")}
        </h1>
        <p>{b(lesson.title)}</p>
        <div className="completion-stats">
          <div>
            <strong>{result.accuracy}%</strong>
            <small>{t("First-try accuracy", "Akurasi pertama")}</small>
          </div>
          <div>
            <strong>{result.points}</strong>
            <small>
              {t("Device practice points", "Poin latihan perangkat")}
            </small>
          </div>
          <div>
            <strong>{result.words}</strong>
            <small>{t("Review words", "Kata review")}</small>
          </div>
        </div>
        <p>
          {t(
            result.duplicate
              ? "Already recorded on this device; points were not awarded twice."
              : "Your answers and progress are saved on this device.",
            result.duplicate
              ? "Sudah tercatat; poin tidak diberikan dua kali."
              : "Jawaban dan progres tersimpan di perangkat ini.",
          )}
        </p>
        <div className="notice">
          {t(
            "Device-only result. Not server-verified XP.",
            "Hasil pada perangkat. Bukan XP terverifikasi server.",
          )}
        </div>
        <div className="row">
          <button className="button ghost" onClick={()=>go("program/"+id)}>{t("Repeat as practice","Ulangi sebagai latihan")}</button>
          <button className="button" onClick={() => go("dashboard")}>
            {t("Back to today", "Kembali ke hari ini")}
          </button>
          <button className="button ghost" onClick={() => go("review")}>
            {t("Review words", "Review kata")}
          </button>
        </div>
      </section>
    );
  const options = e.options
    .map((text, order) => ({ text, order }))
    .sort(
      (a, b) =>
        ((a.order * 7 + index * 3) % 11) - ((b.order * 7 + index * 3) % 11),
    );
  return (
    <section className="lesson-page">
      <header className="lesson-header">
        <button
          className="icon-button"
          aria-label="Close lesson"
          onClick={() => {
            if (
              confirm(
                t(
                  "Leave the lesson? Saved answers remain on this device.",
                  "Keluar? Jawaban tersimpan tetap ada di perangkat.",
                ),
              )
            )
              go("learn");
          }}
        >
          <X />
        </button>
        <div className="progress-track">
          <span
            style={{
              width: `${started ? (index / lesson.exercises.length) * 100 : 0}%`,
            }}
          />
        </div>
        <small>
          {started ? index + 1 : 0}/{lesson.exercises.length}
        </small>
      </header>
      {!started ? (
        <div className="lesson-intro">
          <div className="lesson-buddy"><Mascot/><div className="speech-bubble">{t("Ready? Let’s meet your words!","Siap? Yuk kenali kata baru!")}</div></div>
          <span className="eyebrow">DEVICE LESSON</span>
          <h1>{b(lesson.title)}</h1>
          <p>{b(lesson.objective)}</p>
          <h2>{t("Meet your words", "Kenali kata-katamu")}</h2>
          <div className="intro-words">
            {vocab.map((w) => (
              <article className="card intro-word" key={w.id}>
                <span className="word-illustration" aria-hidden="true">{illustration(w.id)}</span>
                <div className="section-heading">
                  <span className="hanzi medium">{w.hanzi}</span>
                  <Audio text={w.hanzi} />
                </div>
                <p className="pinyin">{w.pinyin}</p>
                <strong>{b(w.translation)}</strong>
                <p className="hanzi">{w.sample}</p>
                <p>{w.samplePinyin}</p>
                <p>{b(w.sampleTranslation)}</p>
                <Audio text={w.sample} slow />
              </article>
            ))}
          </div>
          {content.grammar
            .filter((g) => lesson.grammar.includes(g.id))
            .map((g) => (
              <div className="notice" key={g.id}>
                <div>
                  <strong>{g.pattern}</strong>
                  <p>{b(g.explanation)}</p>
                </div>
              </div>
            ))}
          <button
            className="button full"
            onClick={() => {
              setStarted(true);
              move(0);
            }}
          >
            {t("Start practice", "Mulai latihan")}
            <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <div className={"exercise exercise-" + e.type} key={index}>
          <span className="eyebrow">
            {e.type.toUpperCase()} · DEVICE PRACTICE
          </span>
          <h1>{b(e.prompt)}</h1>
          {e.hanzi && (
            <div className="exercise-hanzi">
              {e.type === "dialogue" && <Mascot className="prompt-pinyin" />}
              <div className="prompt-bubble"><Audio text={e.type === "dialogue" ? vocab[1].sample : e.hanzi} /><span className="hanzi large">{e.hanzi}</span></div>
            </div>
          )}
          {state.profile.pinyin && e.pinyin && e.type !== "pinyin" && (
            <p className="pinyin">{e.pinyin}</p>
          )}
          {e.type === "blank" ? (
            <label>
              {t("Your answer in Hanzi", "Jawaban dalam Hanzi")}
              <input
                value={typeof answer === "string" ? answer : ""}
                disabled={Boolean(feedback)}
                onChange={(ev) => setAnswer(ev.target.value)}
              />
            </label>
          ) : e.type === "ordering" ? (
            <>
              <div className="sentence-builder">
                {Array.isArray(answer) &&
                  answer.map((v, i) => (
                    <button
                      key={v}
                      disabled={Boolean(feedback)}
                      onClick={() =>
                        setAnswer(answer.filter((_, j) => j !== i))
                      }
                    >
                      {v.split(":").slice(1).join(":")}
                    </button>
                  ))}
                {!answer.length && (
                  <span>
                    {t("Tap words in order", "Ketuk kata sesuai urutan")}
                  </span>
                )}
              </div>
              <div className="token-list">
                {options.map((o) => (
                  <button
                    className="token"
                    key={o.order}
                    disabled={
                      Boolean(feedback) ||
                      (Array.isArray(answer) &&
                        answer.some((v) => Number(v.split(":")[0]) === o.order))
                    }
                    onClick={() =>
                      setAnswer([
                        ...(Array.isArray(answer) ? answer : []),
                        o.order + ":" + o.text,
                      ])
                    }
                  >
                    {o.text}
                  </button>
                ))}
              </div>
            </>
          ) : e.type === "matching" ? (
            <div className="matching">
              {e.options.map((id, i) => (
                <label key={id}>
                  <span className="hanzi">
                    {content.words.find((w) => w.id === id)?.hanzi}
                  </span>
                  <select
                    disabled={Boolean(feedback)}
                    value={Array.isArray(answer) ? (answer[i] ?? "") : ""}
                    onChange={(ev) => {
                      const next = e.options.map((_, j) =>
                        Array.isArray(answer) ? (answer[j] ?? "") : "",
                      );
                      next[i] = ev.target.value;
                      setAnswer(next);
                    }}
                  >
                    <option value="">
                      {t("Choose meaning", "Pilih arti")}
                    </option>
                    {options.map((o) => (
                      <option value={o.text} key={o.text}>
                        {label(o.text)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : (
            <div
              className={"answer-options " + (e.type === "choice" ? "illustrated-options" : e.type === "dialogue" ? "response-options" : "")}
              role="radiogroup"
              aria-label="Answer options"
            >
              {options.map((o, i) => (
                <button
                  role="radio"
                  aria-checked={answer === o.text}
                  disabled={Boolean(feedback)}
                  className={
                    "answer-option " + (answer === o.text ? "selected" : "")
                  }
                  key={o.text}
                  onClick={() => setAnswer(o.text)}
                >
                  {e.type === "choice" ? <span className="answer-illustration" aria-hidden="true">{illustration(o.text)}</span> : e.type === "dialogue" ? <span className="answer-dialogue-icon"><Mic size={21}/></span> : null}
                  <span className="option-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{e.type === "choice" ? label(o.text) : o.text}</span>
                </button>
              ))}
            </div>
          )}
          {!feedback && (
            <button className="text-link" onClick={() => setHint(!hint)}>
              {t("Need a hint?", "Butuh petunjuk?")}
            </button>
          )}
          {hint && <p className="notice">{b(e.hint)}</p>}
          {feedback ? (
            <div
              className={
                "feedback feedback-sheet " + (feedback.correct ? "correct" : "incorrect")
              }
              role="status"
            >
              <Mascot mood={feedback.correct ? "celebrate" : "encourage"} className="feedback-pinyin" />
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
                    }}
                  >
                    {t("Retry", "Ulangi")}
                  </button>
                )}
                <button className="button" onClick={next}>
                  {index === lesson.exercises.length - 1
                    ? t("Finish lesson", "Selesaikan pelajaran")
                    : t("Continue", "Lanjut")}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="button full check-button"
              disabled={!answer.length}
              onClick={check}
            >
              {t("Check answer", "Periksa jawaban")}
              <Check size={17} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
function Reviews() {
  const { content, state, refresh, t, b, notice,go } = useApp();
  const [revealed, setRevealed] = useState(false),
    [count, setCount] = useState(0);
  const card = state.reviews.find((r) => r.due <= state.now),
    word = content.words.find((w) => w.id === card?.vocab_id);
  function rate(rating: string) {
    try {
      native("review", {
        vocabularyId: card!.vocab_id,
        eventId: uid(),
        rating,
        expectedDue: card!.due,
      });
      setCount(count + 1);
      setRevealed(false);
      refresh();
    } catch (e) {
      notice((e as Error).message);
    }
  }
  return (
    <>
      <button className="button ghost" onClick={()=>go("mistakes")}>{t("Practice due mistakes","Latih kesalahan jatuh tempo")} ({state.program.mistakesDue})</button>
      <span className="eyebrow">A FRESH LOOK AT FAMILIAR WORDS</span>
      <h1>{t("Let your words take root", "Biarkan kata-katamu berakar")}</h1>
      <p>
        {count} {t("reviewed", "direview")} ·{" "}
        {state.reviews.filter((r) => r.due <= state.now).length}{" "}
        {t("due", "siap")}
      </p>
      {card && word ? (
        <section className="review-card">
          <span className="eyebrow">
            {t("WHAT DOES THIS MEAN?", "APA ARTINYA?")}
          </span>
          <h2 className="hanzi large">{word.hanzi}</h2>
          <Audio text={word.hanzi} />
          {revealed ? (
            <>
              <p className="pinyin">{word.pinyin}</p>
              <h3>{b(word.translation)}</h3>
              <p className="hanzi">{word.sample}</p>
              <p>{word.samplePinyin}</p>
              <p>{b(word.sampleTranslation)}</p>
              <div className="review-ratings">
                {[
                  ["AGAIN", t("Again", "Ulangi")],
                  ["HARD", t("Hard", "Sulit")],
                  ["GOOD", t("Good", "Baik")],
                  ["EASY", t("Easy", "Mudah")],
                ].map(([value, label]) => (
                  <button
                    className={"rating " + value.toLowerCase()}
                    key={value}
                    onClick={() => rate(value)}
                  >
                    {label}
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
        <div className="empty">
          <span className="empty-icon">芽</span>
          <h2>{t("Your review queue is clear", "Antrean review kosong")}</h2>
          <p>
            {t(
              "Finish a lesson, or return when another card is due.",
              "Selesaikan pelajaran, atau kembali saat kartu jatuh tempo.",
            )}
          </p>
        </div>
      )}
      <p className="subtitle">
        {t(
          "SM-2-inspired intervals are computed in Android and stored in SQLite. Device points remain separate from server XP.",
          "Interval terinspirasi SM-2 dihitung di Android dan disimpan di SQLite. Poin perangkat terpisah dari XP server.",
        )}
      </p>
    </>
  );
}
function Vocabulary({ id }: { id?: string }) {
  const { state, content, t, b, go, refresh, notice } = useApp();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("");
  const words = content.words.filter(
    (w) =>
      [w.hanzi, w.pinyin, w.translation.en, w.translation.id]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!filter ||
        (filter === "favorite" && state.profile.favorites.includes(w.id)) ||
        (filter === "difficult" &&
          state.reviews.some((r) => r.vocab_id === w.id && r.lapses > 0)) ||
        (filter === "mastered" &&
          state.reviews.some(
            (r) =>
              r.vocab_id === w.id &&
              r.repetitions >= 5 &&
              r.interval_days >= 21,
          ))),
  );
  const word = content.words.find((w) => w.id === id);
  function favorite(id: string) {
    try {
      const values = state.profile.favorites;
      native("profile", {
        favorites: values.includes(id)
          ? values.filter((v) => v !== id)
          : [...values, id],
      });
      refresh();
    } catch (e) {
      notice((e as Error).message);
    }
  }
  return (
    <>
      <span className="eyebrow">WORDS THAT STAY WITH YOU</span>
      <h1>
        {word ? word.hanzi : t("Your vocabulary library", "Pustaka kosakatamu")}
      </h1>
      {word ? (
        <>
          <button className="text-link" onClick={() => go("vocabulary")}>
            ← {t("All words", "Semua kata")}
          </button>
          <article className="card word-detail">
            <div className="section-heading">
              <span className="hanzi large">{word.hanzi}</span>
              <button
                className="icon-button"
                aria-label="Favorite word"
                onClick={() => favorite(word.id)}
              >
                <Star
                  fill={
                    state.profile.favorites.includes(word.id)
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            </div>
            <p className="pinyin">{word.pinyin}</p>
            <h2>{b(word.translation)}</h2>
            <div className="row">
              <Audio text={word.hanzi} />
              <Audio text={word.hanzi} slow />
            </div>
            <hr />
            <p className="hanzi medium">{word.sample}</p>
            <p>{word.samplePinyin}</p>
            <p>{b(word.sampleTranslation)}</p>
            <Audio text={word.sample} />
          </article>
        </>
      ) : (
        <>
          <div className="library-filters">
            <input
              aria-label={t("Search vocabulary", "Cari kosakata")}
              placeholder={t(
                "Hanzi, pinyin, English, Indonesian…",
                "Hanzi, pinyin, Inggris, Indonesia…",
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Vocabulary filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">{t("All words", "Semua kata")}</option>
              <option value="favorite">{t("Favorites", "Favorit")}</option>
              <option value="difficult">{t("Difficult", "Sulit")}</option>
              <option value="mastered">{t("Reviewed repeatedly", "Sudah diulang berkali-kali")}</option>
            </select>
          </div>
          <div className="vocabulary-grid">
            {words.map((w) => (
              <article className="card word-card" key={w.id}>
                <div className="section-heading">
                  <button
                    className="text-link hanzi medium"
                    onClick={() => go("vocabulary/" + w.id)}
                  >
                    {w.hanzi}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={"Favorite " + w.hanzi}
                    onClick={() => favorite(w.id)}
                  >
                    <Star
                      size={18}
                      fill={
                        state.profile.favorites.includes(w.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                </div>
                {state.profile.pinyin && <p className="pinyin">{w.pinyin}</p>}
                <strong>{b(w.translation)}</strong>
                <div className="word-card-foot">
                  <span>{w.topic}</span>
                  <Audio text={w.hanzi} />
                </div>
              </article>
            ))}
          </div>
          {!words.length && (
            <p>{t("No words found.", "Kata tidak ditemukan.")}</p>
          )}
        </>
      )}
    </>
  );
}
function Grammar() {
  const { content, state, t, b } = useApp();
  return (
    <>
      <span className="eyebrow">MAKE SENTENCES MAKE SENSE</span>
      <h1>{t("Grammar, made practical", "Tata bahasa yang praktis")}</h1>
      {content.grammar.map((g) => (
        <article className="card grammar-card" key={g.id}>
          <span className="tag">{b(g.title)}</span>
          <h2 className="hanzi">{g.pattern}</h2>
          <p>{b(g.explanation)}</p>
          {g.examples.map((e, i) => (
            <div className="grammar-example" key={i}>
              <strong className="hanzi">{e.hanzi}</strong>
              {state.profile.pinyin && <p className="pinyin">{e.pinyin}</p>}
              <p>{b(e.translation)}</p>
              <Audio text={e.hanzi} />
            </div>
          ))}
          <small>{b(g.commonErrors)}</small>
        </article>
      ))}
    </>
  );
}
function Speaking() {
  const { t, notice } = useApp();
  const [status, setStatus] = useState("empty"),
    [seconds, setSeconds] = useState(0),
    [cap, setCap] = useState<Cap>(() => native("capabilities"));
  useEffect(() => {
    const listener = (e: Event) => {
      const event = (e as CustomEvent).detail;
      if (event.type === "recording") setStatus(event.data.status);
      if (event.type === "capabilities") setCap(event.data);
    };
    window.addEventListener("hanyu-native", listener);
    return () => window.removeEventListener("hanyu-native", listener);
  }, []);
  useEffect(() => {
    if (status !== "recording") return;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);
  const action = (method: string, data = {}) => {
    try {
      native(method, data);
    } catch (e) {
      notice((e as Error).message);
    }
  };
  return (
    <>
      <span className="eyebrow">FIND YOUR VOICE</span>
      <h1>{t("Make Mandarin your own", "Buat Mandarin jadi milikmu")}</h1>
      <div className="notice">
        <div>
          <strong>
            {t(
              "AI & transcription: unconfigured in device mode",
              "AI dan transkripsi: belum dikonfigurasi di mode perangkat",
            )}
          </strong>
          <p>
            {t(
              "Use a reachable configured backend for server AI. No pronunciation score is invented.",
              "Gunakan backend yang dikonfigurasi untuk AI server. Tidak ada skor pelafalan buatan.",
            )}
          </p>
        </div>
      </div>
      <section className="card speaking-card">
        <div className="speaking-buddy"><Mascot/><div className="speech-bubble">{t("Listen, then try it yourself!","Dengar, lalu coba sendiri!")}</div></div>
        <h2>{t("Say a little hello", "Latih sapaan singkat")}</h2>
        <p className="hanzi medium speech-bubble">你好！我叫安娜。</p>
        <p className="pinyin">nǐ hǎo! wǒ jiào Ānnà.</p>
        <p>{t("Hello! My name is Anna.", "Halo! Nama saya Anna.")}</p>
        <div className="row">
          <Audio text="你好！我叫安娜。" />
          <Audio text="你好！我叫安娜。" slow />
        </div>
        <p className="subtitle" style={{ marginTop: 16 }}>
          {cap.bundledAudio
            ? t(`${cap.audioClips} AI-generated Mandarin clips are bundled and work offline.`, `${cap.audioClips} audio Mandarin buatan AI tersimpan dan bekerja offline.`)
            : t("Bundled audio unavailable. Reinstall the updated APK.", "Audio bawaan tidak tersedia. Instal ulang APK terbaru.")}

        </p>
      </section>
      <section className="recorder">
        <h3>
          {t("Private record & replay", "Rekam dan putar ulang secara lokal")}
        </h3>
        <p>
          {t(
            "Allow the microphone only when ready. Maximum 60 seconds. Audio stays in app-private cache and is never uploaded in device mode.",
            "Izinkan mikrofon saat siap. Maksimal 60 detik. Audio tetap di cache pribadi aplikasi dan tidak diunggah pada mode perangkat.",
          )}
        </p>
        <button
          className="button"
          onClick={() =>
            action(status === "recording" ? "recordStop" : "recordStart")
          }
        >
          {status === "recording" ? <Square size={17} /> : <Mic size={17} />}{" "}
          {status === "recording"
            ? t("Stop recording", "Hentikan rekaman")
            : t("Allow mic & record", "Izinkan mikrofon dan rekam")}
        </button>
        {status === "recording" && (
          <p role="status" style={{ marginTop: 16 }}>
            {seconds}s
          </p>
        )}
        {status === "ready" && (
          <div className="row" style={{ marginTop: 18 }}>
            <button
              className="button ghost"
              onClick={() => action("recordReplay")}
            >
              {t("Replay", "Putar ulang")}
            </button>
            <button
              className="button ghost"
              onClick={() => action("recordReplay", { slow: true })}
            >
              0.65×
            </button>
            <button
              className="button ghost"
              onClick={() => action("recordDelete")}
            >
              <Trash2 size={16} />
              {t("Delete recording", "Hapus rekaman")}
            </button>
          </div>
        )}
      </section>
      <p className="subtitle">
        {t(
          "Tone references: 1 high-level · 2 rising · 3 low/dipping · 4 falling · neutral light. Genuine syllable/tone assessment is unavailable.",
          "Referensi nada: 1 tinggi datar · 2 naik · 3 rendah/melengkung · 4 turun · netral ringan. Penilaian suku kata/nada belum tersedia.",
        )}
      </p>
    </>
  );
}
function Writing() {
  const { t, refresh, notice } = useApp();
  const [character, setCharacter] = useState("一"),
    [strokes, setStrokes] = useState<Point[][]>([]),
    [current, setCurrent] = useState<Point[]>([]),
    [trace, setTrace] = useState(true),
    [replay, setReplay] = useState<number | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null),
    active = useRef(false),
    started = useRef(0);
  const guide = strokeGuides[character];
  useEffect(() => {
    started.current = Date.now();
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 300, 300);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#e3eaf4";
    ctx.lineWidth = 1;
    for (const value of [75, 150, 225]) {
      ctx.beginPath();
      ctx.moveTo(value, 0);
      ctx.lineTo(value, 300);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, value);
      ctx.lineTo(300, value);
      ctx.stroke();
    }
    if (trace)
      guide.paths.forEach((path, i) => {
        ctx.strokeStyle = "#b5cbf5";
        ctx.lineWidth = 14;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(...path[0]);
        ctx.lineTo(...path[1]);
        ctx.stroke();
        ctx.fillStyle = "#2869f0";
        ctx.font = "14px Arial";
        ctx.fillText(String(i + 1), path[0][0] - 18, path[0][1] - 12);
      });
    ctx.setLineDash([]);
    ctx.strokeStyle = "#142033";
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    [
      ...(replay === null ? strokes : strokes.slice(0, replay)),
      current,
    ].forEach((path) => {
      if (!path.length) return;
      ctx.beginPath();
      ctx.moveTo(...path[0]);
      path.slice(1).forEach((p) => ctx.lineTo(...p));
      ctx.stroke();
    });
  }, [strokes, current, guide, trace, replay]);
  useEffect(() => {
    if (replay === null) return;
    const timer = setTimeout(
      () => setReplay(replay >= strokes.length ? null : replay + 1),
      350,
    );
    return () => clearTimeout(timer);
  }, [replay, strokes.length]);
  const point = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(300, ((e.clientX - r.left) / r.width) * 300)),
      Math.max(0, Math.min(300, ((e.clientY - r.top) / r.height) * 300)),
    ];
  };
  function save() {
    try {
      native("writing", {
        character,
        strokes,
        seconds: Math.min(
          1800,
          Math.floor((Date.now() - started.current) / 1000),
        ),
      });
      refresh();
      const matches =
        strokes.length === guide.paths.length &&
        strokes.every((s, i) => followsGuide(s, guide.paths[i]));
      notice(
        t(
          matches
            ? "Saved. Sequence follows this geometric guide."
            : "Saved. Compare stroke direction and sequence with the guide.",
          matches
            ? "Tersimpan. Urutan mengikuti panduan geometris ini."
            : "Tersimpan. Bandingkan arah dan urutan goresan dengan panduan.",
        ),
      );
    } catch (e) {
      notice((e as Error).message);
    }
  }
  return (
    <>
      <span className="eyebrow">SLOW DOWN. MAKE YOUR MARK.</span>
      <h1>{t("Your writing studio", "Ruang latihan menulismu")}</h1>
      <div className="writing-select">
        {Object.keys(strokeGuides).map((c) => (
          <button
            className={c === character ? "active" : ""}
            key={c}
            onClick={() => {
              setCharacter(c);
              setStrokes([]);
              started.current = Date.now();
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <section className="card">
        <canvas
          className="writing-canvas"
          ref={canvas}
          width={300}
          height={300}
          aria-label="Writing canvas"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            active.current = true;
            setCurrent([point(e)]);
          }}
          onPointerMove={(e) => {
            if (active.current) {
              const p = point(e);
              setCurrent((prev) => (prev.length < 2000 ? [...prev, p] : prev));
            }
          }}
          onPointerUp={(e) => {
            if (active.current) {
              const p = point(e);
              setStrokes((prev) =>
                prev.length < 50 ? [...prev, [...current, p]] : prev,
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
          <button className="button ghost" onClick={() => setStrokes([])}>
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
        <p className="hanzi medium">
          {character} · {guide.meaning}
        </p>
        <label className="toggle-label">
          {t("Trace guide", "Panduan jiplak")}
          <input
            type="checkbox"
            checked={trace}
            onChange={(e) => setTrace(e.target.checked)}
          />
        </label>
        <p>
          {t("Radical", "Radikal")}: {guide.radical}
        </p>
        {guide.paths.map((path, i) => (
          <p key={i}>
            {i + 1}.{" "}
            {path[0][1] === path[1][1]
              ? t("Left → right", "Kiri → kanan")
              : t("Top → bottom", "Atas → bawah")}
          </p>
        ))}
        <p className="subtitle">
          {t(
            "Four original CC0 geometric guides. This checks path sequence, not handwriting recognition.",
            "Empat panduan geometris CC0 asli. Ini memeriksa urutan jalur, bukan pengenalan tulisan.",
          )}
        </p>
        <button className="button" disabled={!strokes.length} onClick={save}>
          {t("Save practice", "Simpan latihan")}
        </button>
      </section>
    </>
  );
}
function ProfilePage() {
  const { state, t, go } = useApp();
  return (
    <>
      <span className="eyebrow">YOUR DEVICE JOURNEY</span>
      <h1>{state.profile.name}</h1>
      <div className="notice">
        <div>
          <strong>
            {t(
              "Device profile · no server account",
              "Profil perangkat · tanpa akun server",
            )}
          </strong>
          <p>
            {t(
              "Your SQLite progress works offline and is private to this installation. Login, cloud XP and CMS are available only through a configured reachable backend.",
              "Progres SQLite bekerja offline dan bersifat pribadi untuk instalasi ini. Login, XP cloud, dan CMS hanya tersedia melalui backend yang dapat dijangkau.",
            )}
          </p>
        </div>
      </div>
      <section className="card">
        <p>
          {state.profile.dailyMinutes} {t("minutes per day", "menit per hari")}{" "}
          · {state.profile.goal}
        </p>
        <p>{state.profile.timezone}</p>
        <p>
          {t("Placement baseline", "Tes awal")}:{" "}
          {state.profile.placementScore === undefined
            ? "—"
            : state.profile.placementScore + "/3"}
        </p>
        <div className="row">
          <button className="button" onClick={() => go("progress")}>
            {t("My progress", "Progres saya")}
          </button>
          <button className="button ghost" onClick={() => go("settings")}>
            <Settings size={17} />
            {t("Settings", "Pengaturan")}
          </button>
        </div>
      </section>
      <div className="row">
        <button className="button ghost" onClick={() => go("grammar")}>
          {t("Grammar", "Tata bahasa")}
        </button>
        <button className="button ghost" onClick={() => go("hanzi")}>
          {t("Writing studio", "Latihan menulis")}
        </button>
      </div>
    </>
  );
}
function ProgressPage() {
  const { state, t } = useApp();
  const completed = state.progress.filter((p) => p.completed_at);
  const accuracy = completed.length
    ? Math.round(
        completed.reduce((sum, p) => sum + (p.accuracy ?? 0), 0) /
          completed.length,
      )
    : null;
  return (
    <>
      <span className="eyebrow">YOUR OWN PACE</span>
      <h1>
        {t("Look how far you’ve come", "Lihat sejauh mana kamu melangkah")}
      </h1>
      <div className="stats-grid">
        {[
          [t("Practice points", "Poin latihan"), state.points],
          [
            t("First-try accuracy", "Akurasi pertama"),
            accuracy === null ? "—" : accuracy + "%",
          ],
          [t("Completed lessons", "Pelajaran selesai"), completed.length],
          [t("Writing sessions", "Sesi menulis"), state.writing.length],
          [
            t("Elapsed lesson minutes", "Menit pelajaran"),
            Math.floor(state.sessions.reduce((s, v) => s + v.seconds, 0) / 60),
          ],
          [
            t("Repeated review words", "Kata diulang berkali-kali"),
            state.reviews.filter(
              (r) => r.repetitions >= 5 && r.interval_days >= 21,
            ).length,
          ],
        ].map(([label, value]) => (
          <article className="card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <p>
        {t(
          "Original foundations progress, not an official HSK readiness score. Points and history are device-local.",
          "Progres fondasi asli, bukan skor kesiapan HSK resmi. Poin dan riwayat hanya pada perangkat.",
        )}
      </p>
    </>
  );
}
function SettingsPage() {
  const { state, t, refresh, notice } = useApp();
  const [profile, setProfile] = useState(state.profile),
    [backend, setBackend] = useState(() => native<Cap>("capabilities").backend);
  function save() {
    try {
      native("profile", profile);
      refresh();
      notice(t("Preferences saved.", "Preferensi tersimpan."));
    } catch (e) {
      notice((e as Error).message);
    }
  }
  function connect() {
    try {
      native("backend", { url: backend });
      notice(
        t(
          "Checking backend… Device practice remains available if it cannot connect.",
          "Memeriksa backend… Latihan perangkat tetap tersedia jika koneksi gagal.",
        ),
      );
    } catch (e) {
      notice((e as Error).message);
    }
  }
  return (
    <>
      <span className="eyebrow">MAKE IT YOURS</span>
      <h1>{t("Your preferences", "Preferensi kamu")}</h1>
      <section className="card">
        <label>
          {t("Name", "Nama")}
          <input
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            maxLength={60}
          />
        </label>
        <label>
          {t("Interface language", "Bahasa antarmuka")}
          <select
            value={profile.locale}
            onChange={(e) =>
              setProfile({ ...profile, locale: e.target.value as "id" | "en" })
            }
          >
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          {t("Daily minutes", "Menit harian")}
          <select
            value={profile.dailyMinutes}
            onChange={(e) =>
              setProfile({ ...profile, dailyMinutes: Number(e.target.value) })
            }
          >
            {[5, 10, 15, 20, 30].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          {t("Timezone", "Zona waktu")}
          <input
            value={profile.timezone}
            onChange={(e) =>
              setProfile({ ...profile, timezone: e.target.value })
            }
          />
        </label>
        <label>
          {t("Theme", "Tema")}
          <select
            value={profile.theme}
            onChange={(e) => setProfile({ ...profile, theme: e.target.value })}
          >
            <option value="light">Light / Terang</option>
            <option value="dark">Dark / Gelap</option>
            <option value="system">System / Sistem</option>
          </select>
        </label>
        <label className="toggle-label">
          {t("Show pinyin", "Tampilkan pinyin")}
          <input
            type="checkbox"
            checked={profile.pinyin}
            onChange={(e) =>
              setProfile({ ...profile, pinyin: e.target.checked })
            }
          />
        </label>
        <button className="button full" onClick={save}>
          {t("Save preferences", "Simpan preferensi")}
        </button>
      </section>
      <section className="card">
        <h2>{t("Optional online backend", "Backend online opsional")}</h2>
        <p>
          {t(
            "For server login, verified XP, AI and CMS, use a reachable HTTPS HanyuFlow server. This APK does not host or expose your laptop. 127.0.0.1 and localhost refer to this phone and are rejected.",
            "Untuk login server, XP terverifikasi, AI, dan CMS, gunakan server HanyuFlow HTTPS yang dapat dijangkau. APK ini tidak menghosting atau mengekspos laptop. 127.0.0.1 dan localhost berarti ponsel ini dan ditolak.",
          )}
        </p>
        <label>
          {t("Backend HTTPS origin", "Alamat HTTPS backend")}
          <input
            type="url"
            value={backend}
            onChange={(e) => setBackend(e.target.value)}
            placeholder="https://your-hanyuflow-server.example"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </label>
        <button
          className="button ghost"
          disabled={!backend.trim()}
          onClick={connect}
        >
          {t("Check & open backend", "Periksa dan buka backend")}
        </button>
        <p className="subtitle" style={{ marginTop: 16 }}>
          {t(
            "A capability check must succeed before opening online mode. Device points are never uploaded as server XP. No backend is configured by default.",
            "Pemeriksaan kemampuan harus berhasil sebelum membuka mode online. Poin perangkat tidak diunggah sebagai XP server. Backend tidak dikonfigurasi secara bawaan.",
          )}
        </p>
      </section>
      <section className="card">
        <h2>{t("Your device data", "Data perangkatmu")}</h2>
        <button
          className="button ghost"
          onClick={() => {
            try {
              native("export");
            } catch (e) {
              notice((e as Error).message);
            }
          }}
        >
          {t("Export device data", "Ekspor data perangkat")}
        </button>
        <p className="subtitle" style={{ marginTop: 16 }}>
          {t(
            "Use Android’s file picker to save your actual history. Uninstalling the app deletes its private SQLite data; export first.",
            "Gunakan pemilih berkas Android untuk menyimpan riwayat nyata. Menghapus aplikasi menghapus data SQLite pribadinya; ekspor terlebih dahulu.",
          )}
        </p>
        <button className="button ghost" onClick={() => native("deleteData")}>
          {t("Delete device data", "Hapus data perangkat")}
        </button>
      </section>
      <div className="notice">
        {t(
          "Background reminders, billing, cloud synchronization and genuine pronunciation assessment are unavailable in device mode. Original curriculum awaits linguistic review.",
          "Pengingat latar belakang, pembayaran, sinkronisasi cloud, dan penilaian pelafalan asli belum tersedia pada mode perangkat. Kurikulum asli menunggu tinjauan bahasa.",
        )}
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
