"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FilePlus2, Upload, Download, Check } from "lucide-react";
import { useApp, useData } from "./context";
import { ErrorBox, Loading } from "./ui";
import { api } from "@/lib/client";
import type { Bi } from "@/lib/types";
type AdminExercise = {
  type: string;
  prompt: Bi;
  hanzi: string | null;
  pinyin: string | null;
  answer: string | string[];
  alternatives: string[];
  hint: Bi;
  explanation: Bi;
  options: { text: string; order: number }[];
};
type Version = {
  id: string;
  version: number;
  status: string;
  title: Bi;
  objective: Bi;
  threshold: number;
  estimatedMinutes: number;
  exercises: AdminExercise[];
  vocabulary: { vocabularyId: string }[];
  grammar: { grammarId: string }[];
};
type AdminLesson = {
  id: string;
  unitId: string;
  order: number;
  versions: Version[];
};
type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
};
const tabs = [
  "overview",
  "users",
  "curriculum",
  "units",
  "lessons",
  "exercises",
  "vocabulary",
  "grammar",
  "dialogues",
  "media",
  "ai",
  "analytics",
  "audit",
];
const template = {
  id: "my-first-lesson",
  unitId: "greetings",
  order: 4,
  title: { en: "A new hello", id: "Sapaan baru" },
  objective: {
    en: "Recognize a simple greeting.",
    id: "Kenali sapaan sederhana.",
  },
  threshold: 70,
  estimatedMinutes: 3,
  vocabulary: ["greetings-1"],
  grammar: ["greetings"],
  exercises: [
    {
      type: "character",
      prompt: {
        en: "Choose the Hanzi for hello.",
        id: "Pilih Hanzi untuk halo.",
      },
      hanzi: null,
      pinyin: null,
      answer: "你好",
      alternatives: [],
      options: ["再见", "你好", "谢谢"],
      hint: {
        en: "A greeting to begin a conversation.",
        id: "Sapaan untuk memulai percakapan.",
      },
      explanation: {
        en: "你好 (nǐ hǎo) means hello.",
        id: "你好 (nǐ hǎo) berarti halo.",
      },
    },
  ],
};
const editorTemplates: Record<string, unknown> = {
  lessons: template,
  units: {
    id: "new-theme",
    levelId: "beginner",
    order: 11,
    icon: "新",
    title: { en: "A new theme", id: "Tema baru" },
    description: {
      en: "Your original learning theme.",
      id: "Tema belajar asli kamu.",
    },
  },
  vocabulary: {
    id: "new-word",
    hanzi: "好",
    pinyin: "hǎo",
    sample: "你好！",
    samplePinyin: "nǐ hǎo",
    sampleTranslation: { en: "Hello!", id: "Halo!" },
    translations: { en: "good", id: "baik" },
    tags: ["greetings"],
  },
  grammar: {
    id: "new-pattern",
    title: { en: "A greeting", id: "Sapaan" },
    pattern: "你好",
    explanation: { en: "A simple greeting.", id: "Sapaan sederhana." },
    commonErrors: {
      en: "Keep both characters.",
      id: "Gunakan kedua karakter.",
    },
    examples: [
      {
        hanzi: "你好！",
        pinyin: "nǐ hǎo",
        translation: { en: "Hello!", id: "Halo!" },
      },
    ],
  },
};
function draft(l: AdminLesson, v: Version) {
  return {
    id: l.id,
    unitId: l.unitId,
    order: l.order,
    title: v.title,
    objective: v.objective,
    estimatedMinutes: v.estimatedMinutes,
    threshold: v.threshold,
    vocabulary: v.vocabulary.map((w) => w.vocabularyId),
    grammar: v.grammar.map((g) => g.grammarId),
    exercises: v.exercises.map((e) => ({
      type: e.type,
      prompt: e.prompt,
      hanzi: e.hanzi,
      pinyin: e.pinyin,
      answer: e.answer,
      alternatives: e.alternatives,
      hint: e.hint,
      explanation: e.explanation,
      options: e.options.sort((a, b) => a.order - b.order).map((o) => o.text),
    })),
  };
}
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export function Admin({ tab = "overview" }: { tab?: string }) {
  const router = useRouter();
  const { user, t, b } = useApp();
  const section = tabs.includes(tab) ? tab : "overview";
  const {
    data,
    error: loadError,
    reload,
  } = useData<unknown>("admin/" + section);
  const [json, setJson] = useState(
      JSON.stringify(editorTemplates[section] ?? template, null, 2),
    ),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(
    () =>
      setJson(JSON.stringify(editorTemplates[section] ?? template, null, 2)),
    [section],
  );
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const input = JSON.parse(json);
      const response = await api<{ version?: number }>(
        "admin/" + section,
        input,
      );
      setMessage(
        t(
          section === "lessons"
            ? `Draft version ${response.version} saved. Publish it below to make it available.`
            : "Content saved.",
          section === "lessons"
            ? `Draf versi ${response.version} tersimpan. Terbitkan di bawah agar tersedia.`
            : "Konten tersimpan.",
        ),
      );
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function publish(versionId: string) {
    setError("");
    try {
      await api("admin/publish", { versionId });
      setMessage(
        t(
          "Published. Existing student attempts remain pinned to their prior version.",
          "Terbit. Jawaban siswa yang sudah dimulai tetap menggunakan versi sebelumnya.",
        ),
      );
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove(versionId: string) {
    setError("");
    try {
      await api("admin/delete-draft", { versionId });
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!user) return <Loading />;
  const lessons = Array.isArray(data) ? (data as AdminLesson[]) : [];
  const editSection = Boolean(editorTemplates[section]);
  return (
    <div id="main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            ORIGINAL CONTENT · VERSIONED PUBLISHING
          </span>
          <h1>{t("Content studio", "Studio konten")}</h1>
          <p>
            {t(
              "Create drafts. Validate. Publish immutable lesson versions.",
              "Buat draf. Validasi. Terbitkan versi pelajaran yang tetap.",
            )}
          </p>
        </div>
        <span className="tag">{user.role}</span>
      </div>
      <nav className="admin-nav" aria-label="Admin sections">
        {tabs
          .filter((s) => s !== "users" || user.role === "ADMIN")
          .map((s) => (
            <Link
              key={s}
              className={section === s ? "active" : ""}
              href={s === "overview" ? "/admin" : "/admin/" + s}
            >
              {s}
            </Link>
          ))}
      </nav>
      <ErrorBox message={loadError || error} />
      {message && (
        <div className="notice" role="status">
          <Check size={18} />
          {message}
        </div>
      )}
      {data === null && !loadError && <Loading />}
      {(section === "overview" || section === "analytics") &&
        data !== null &&
        typeof data === "object" &&
        !Array.isArray(data) && (
          <div className="stats-grid">
            {Object.entries(data as Record<string, number>).map(
              ([key, value]) => (
                <article className="card" key={key}>
                  <span>{key}</span>
                  <strong>{value}</strong>
                </article>
              ),
            )}
          </div>
        )}
      {section === "users" && Array.isArray(data) && (
        <UserTable
          users={data as AdminUser[]}
          reload={reload}
          setError={setError}
        />
      )}
      <div className="admin-toolbar">
        <button
          className="button ghost"
          disabled={data === null}
          onClick={() => download(`hanyuflow-${section}.json`, data)}
        >
          <Download size={16} />
          {t("Export JSON", "Ekspor JSON")}
        </button>
        {section === "lessons" && (
          <button
            className="button ghost"
            onClick={() => setJson(JSON.stringify(template, null, 2))}
          >
            <FilePlus2 size={16} />
            {t("New lesson template", "Template pelajaran baru")}
          </button>
        )}
      </div>
      {editSection && (
        <section className="card" style={{ marginTop: 24 }}>
          <h2>
            {section === "lessons"
              ? t(
                  "Validated lesson / exercise builder",
                  "Pembuat pelajaran / latihan tervalidasi",
                )
              : t("Validated content editor", "Editor konten tervalidasi")}
          </h2>
          <p>
            {t(
              "Use the JSON editor or import one JSON object. All writes are validated by Zod and role checks on the server. CSV and rich drag-and-drop editing are not implemented.",
              "Gunakan editor JSON atau impor satu objek JSON. Semua perubahan divalidasi Zod dan peran pada server. CSV dan editor drag-and-drop belum tersedia.",
            )}
          </p>
          <label>
            {t("Import JSON draft", "Impor draf JSON")}
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 256000) {
                    setError("Maximum JSON import size is 256 KB.");
                    return;
                  }
                  setJson(await file.text());
                }
              }}
            />
          </label>
          <textarea
            className="json-editor"
            aria-label="Content JSON editor"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            spellCheck={false}
          />
          <button
            className="button"
            style={{ marginTop: 18 }}
            disabled={busy}
            onClick={() => void save()}
          >
            <Upload size={16} />
            {busy
              ? t("Saving…", "Menyimpan…")
              : section === "lessons"
                ? t("Save new draft version", "Simpan versi draf baru")
                : t("Save content", "Simpan konten")}
          </button>
        </section>
      )}
      {(section === "lessons" || section === "exercises") &&
        Array.isArray(data) && (
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Lesson</th>
                  <th>Versions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <strong>{b(l.versions[0]?.title)}</strong>
                      <small style={{ display: "block" }}>{l.id}</small>
                    </td>
                    <td>
                      {l.versions.map((v) => (
                        <div key={v.id}>
                          <span className="tag">
                            v{v.version} · {v.status} · {v.exercises.length}{" "}
                            exercises
                          </span>
                          {v.status === "DRAFT" && (
                            <div className="row" style={{ marginTop: 8 }}>
                              <button
                                className="button"
                                onClick={() => void publish(v.id)}
                              >
                                Publish
                              </button>
                              <button
                                className="button ghost"
                                onClick={() => void remove(v.id)}
                              >
                                Delete draft
                              </button>
                            </div>
                          )}
                          <details>
                            <summary>Preview content & answers</summary>
                            <pre>{JSON.stringify(draft(l, v), null, 2)}</pre>
                          </details>
                        </div>
                      ))}
                    </td>
                    <td>
                      <button
                        className="button ghost"
                        onClick={() => {
                          if (section === "exercises") {
                            router.push("/admin/lessons");
                            return;
                          }
                          setJson(
                            JSON.stringify(draft(l, l.versions[0]), null, 2),
                          );
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit as new version
                      </button>
                      <Link className="text-link" href={"/lesson/" + l.id}>
                        Student view →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {[
        "curriculum",
        "units",
        "vocabulary",
        "grammar",
        "dialogues",
        "media",
        "ai",
        "audit",
      ].includes(section) &&
        data !== null && (
          <section className="card" style={{ marginTop: 20 }}>
            <h2>{t("Stored content", "Konten tersimpan")}</h2>
            {["dialogues", "media", "ai"].includes(section) && (
              <div className="notice">
                {t(
                  "Read-only in this version. Dialogue lines are included in seeded lessons; media uploads, scenario prompt editing and achievement editing are not available.",
                  "Hanya baca pada versi ini. Dialog ada dalam materi awal; unggah media, ubah prompt skenario, dan ubah pencapaian belum tersedia.",
                )}
              </div>
            )}
            <pre className="source-view">{JSON.stringify(data, null, 2)}</pre>
          </section>
        )}
    </div>
  );
}
function UserTable({
  users,
  reload,
  setError,
}: {
  users: AdminUser[];
  reload: () => Promise<void>;
  setError: (s: string) => void;
}) {
  const [changes, setChanges] = useState<
    Record<string, { role: string; plan: string }>
  >({});
  async function save(user: AdminUser) {
    try {
      await api("admin/users", {
        id: user.id,
        ...(changes[user.id] ?? { role: user.role, plan: user.plan }),
      });
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="admin-table">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Entitlement (no billing)</th>
            <th>Save</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <strong>{u.name}</strong>
                <small style={{ display: "block" }}>{u.email}</small>
              </td>
              <td>
                <select
                  aria-label={"Role for " + u.email}
                  value={changes[u.id]?.role ?? u.role}
                  onChange={(e) =>
                    setChanges({
                      ...changes,
                      [u.id]: {
                        role: e.target.value,
                        plan: changes[u.id]?.plan ?? u.plan,
                      },
                    })
                  }
                >
                  {["STUDENT", "EDITOR", "ADMIN"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  aria-label={"Plan for " + u.email}
                  value={changes[u.id]?.plan ?? u.plan}
                  onChange={(e) =>
                    setChanges({
                      ...changes,
                      [u.id]: {
                        role: changes[u.id]?.role ?? u.role,
                        plan: e.target.value,
                      },
                    })
                  }
                >
                  <option>FREE</option>
                  <option>PRO</option>
                </select>
              </td>
              <td>
                <button className="button ghost" onClick={() => void save(u)}>
                  Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
