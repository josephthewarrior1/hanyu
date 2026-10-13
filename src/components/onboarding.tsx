"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useApp } from "./context";
import { Brand, Loading, ErrorBox } from "./ui";
import { api } from "@/lib/client";
import type { Profile } from "@/lib/types";
export function Onboarding() {
  const router = useRouter();
  const { user, t, refresh } = useApp();
  const [form, setForm] = useState<Profile | null>(null),
    [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [answers, setAnswers] = useState<string[]>(["", "", ""]);
  useEffect(() => {
    if (user) {
      setForm(user.profile);
      setStep(user.profile.onboardingStep);
    }
  }, [user]);
  if (!form) return <Loading />;
  const titles = [
    t("Choose your language", "Pilih bahasa kamu"),
    t("Where are you starting?", "Mulai dari mana?"),
    t("What brings you here?", "Apa tujuanmu?"),
    t("Find your daily rhythm", "Pilih ritme harianmu"),
    t("Make time for yourself", "Luangkan waktu untuk diri sendiri"),
    t("A small starting point", "Tes awal singkat"),
  ];
  const patch = (v: Partial<Profile>) => setForm({ ...form, ...v });
  async function save(next: number, done = false) {
    setBusy(true);
    setError("");
    try {
      await api("profile", {
        locale: form!.locale,
        experience: form!.experience,
        goal: form!.goal,
        dailyMinutes: form!.dailyMinutes,
        reminderTime: form!.reminderTime,
        timezone: form!.timezone,
        onboardingStep: next,
        onboardingDone: done,
        ...(answers.every(Boolean) ? { placementAnswers: answers } : {}),
      });
      if (done) {
        await refresh();
        router.push("/dashboard");
        return;
      }
      await refresh();
      setStep(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const options = (
    field: keyof Profile,
    list: [string | number, string, string][],
  ) => (
    <div className="onboarding-options">
      {list.map(([value, label, desc]) => (
        <button
          key={value}
          className={
            form[field] === value ? "choice-card selected" : "choice-card"
          }
          onClick={() => patch({ [field]: value })}
        >
          <span>
            <strong>{label}</strong>
            <small>{desc}</small>
          </span>
          {form[field] === value && <Check size={20} />}
        </button>
      ))}
    </div>
  );
  return (
    <main id="main" className="onboarding">
      <LinkBrand />
      <section>
        <span className="eyebrow">
          {t(`STEP ${step + 1} OF 6`, `LANGKAH ${step + 1} DARI 6`)}
        </span>
        <div className="progress-track">
          <span style={{ width: `${((step + 1) / 6) * 100}%` }} />
        </div>
        <h1>{titles[step] ?? titles[5]}</h1>
        <p>
          {t(
            "Your choices are saved at every step. You can change them later.",
            "Pilihan tersimpan setiap langkah. Kamu dapat mengubahnya nanti.",
          )}
        </p>
        {step === 0 &&
          options("locale", [
            ["id", "Bahasa Indonesia", "Belajar dengan penjelasan Indonesia"],
            ["en", "English", "Learn with English explanations"],
          ])}
        {step === 1 &&
          options("experience", [
            [
              "beginner",
              t("A fresh start", "Mulai dari nol"),
              t("I am new to Mandarin.", "Saya baru belajar Mandarin."),
            ],
            [
              "some",
              t("A few familiar words", "Sudah tahu sedikit"),
              t("I know a few words.", "Saya tahu beberapa kata."),
            ],
            [
              "intermediate",
              t("Building confidence", "Meningkatkan percaya diri"),
              t(
                "I can have simple conversations.",
                "Saya bisa percakapan sederhana.",
              ),
            ],
          ])}
        {step === 2 &&
          options("goal", [
            ["travel", t("Travel", "Wisata"), "✈"],
            ["work", t("Work", "Kerja"), "◎"],
            ["school", t("School", "Sekolah"), "✎"],
            [
              "hsk",
              "HSK",
              t(
                "Original foundation; no official alignment",
                "Dasar asli; belum dipetakan resmi",
              ),
            ],
            ["friends", t("Friends", "Teman"), "☀"],
            ["curiosity", t("Curiosity", "Rasa ingin tahu"), "✦"],
          ])}
        {step === 3 &&
          options(
            "dailyMinutes",
            [5, 10, 15, 20, 30].map((v) => [
              v,
              `${v} ${t("minutes", "menit")}`,
              t(
                "A sustainable small habit",
                "Kebiasaan kecil yang berkelanjutan",
              ),
            ]),
          )}
        {step === 4 && (
          <div className="card">
            <label>
              {t("Preferred study time", "Waktu belajar pilihan")}
              <input
                type="time"
                value={form.reminderTime}
                onChange={(e) => patch({ reminderTime: e.target.value })}
              />
            </label>
            <label>
              {t("Timezone", "Zona waktu")}
              <input
                value={form.timezone}
                onChange={(e) => patch({ timezone: e.target.value })}
              />
            </label>
            <p className="muted">
              {t(
                "The time is saved as a preference. Background push delivery is not configured.",
                "Waktu disimpan sebagai preferensi. Pengiriman push latar belakang belum dikonfigurasi.",
              )}
            </p>
          </div>
        )}
        {step >= 5 && (
          <div className="card">
            <p>
              {t(
                "Optional, three scored questions. This only records a baseline; all beginner units remain open.",
                "Opsional, tiga pertanyaan dinilai. Ini mencatat kemampuan awal; semua unit pemula tetap terbuka.",
              )}
            </p>
            {[
              ["你好", ["hello", "thank you", "goodbye"]],
              ["我", ["nǐ", "wǒ", "tā"]],
              [
                "I drink water / Saya minum air",
                ["我喝水", "水喝我", "我是水"],
              ],
            ].map(([prompt, choices], i) => (
              <label key={String(prompt)}>
                {prompt as string}
                <select
                  value={answers[i]}
                  onChange={(e) =>
                    setAnswers(
                      answers.map((a, j) => (j === i ? e.target.value : a)),
                    )
                  }
                >
                  <option value="">
                    {t("Skip this question", "Lewati pertanyaan")}
                  </option>
                  {(choices as string[]).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
        <ErrorBox message={error} />
        <div className="onboarding-actions">
          <button
            className="button ghost"
            disabled={step === 0 || busy}
            onClick={() => void save(Math.max(0, step - 1))}
          >
            <ArrowLeft size={18} />
            {t("Back", "Kembali")}
          </button>
          <button
            className="button"
            disabled={busy}
            onClick={() => void save(Math.min(5, step + 1), step >= 5)}
          >
            {busy
              ? t("Saving…", "Menyimpan…")
              : step >= 5
                ? t("Start learning", "Mulai belajar")
                : t("Continue", "Lanjut")}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}
function LinkBrand() {
  return (
    <div className="onboarding-brand">
      <Brand />
    </div>
  );
}
