"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import {
  Download,
  Settings as SettingsIcon,
  LogOut,
  Check,
  Bell,
} from "lucide-react";
import { useApp } from "./context";
import { ErrorBox, Loading } from "./ui";
import { api } from "@/lib/client";
import type { Profile } from "@/lib/types";
export function ProfilePage() {
  const { user, t } = useApp();
  if (!user) return <Loading />;
  return (
    <div id="main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR MANDARIN JOURNEY</span>
          <h1>{t("A little more you", "Tentang perjalananmu")}</h1>
        </div>
        <Link href="/settings" className="button ghost">
          <SettingsIcon size={18} />
          {t("Edit profile", "Ubah profil")}
        </Link>
      </div>
      <section className="card profile-card">
        <div className="avatar">{user.name[0].toUpperCase()}</div>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="tag">
            {user.role} · {user.plan}
          </span>
        </div>
      </section>
      <section className="card">
        <h2>{t("Your learning rhythm", "Ritme belajarmu")}</h2>
        <p>
          {user.profile.dailyMinutes} {t("minutes per day", "menit per hari")} ·{" "}
          {user.profile.goal} · {user.profile.timezone}
        </p>
        <p>
          {t("Experience", "Pengalaman")}: {user.profile.experience}
        </p>
        <p>
          {t("Placement baseline", "Hasil tes awal")}:{" "}
          {user.profile.placementScore === null
            ? t("Not taken", "Belum diambil")
            : `${user.profile.placementScore} / 3`}
        </p>
        <div className="row">
          <Link className="button" href="/progress">
            {t("View progress", "Lihat progres")}
          </Link>
          <Link className="button ghost" href="/achievements">
            {t("Milestones", "Pencapaian")}
          </Link>
        </div>
      </section>
      <section className="card">
        <h2>{t("Your account", "Akun kamu")}</h2>
        <p>
          {t(
            "Email verification is unconfigured. No verified badge is claimed.",
            "Verifikasi email belum dikonfigurasi. Tidak ada klaim akun terverifikasi.",
          )}
        </p>
        <Link className="text-link" href="/api/export">
          <Download size={18} />
          {t("Export my data", "Ekspor data saya")}
        </Link>
        <div>
          <button
            className="button ghost"
            onClick={() => {
              localStorage.removeItem("hf-offline-words");
              void signOut({ callbackUrl: "/login" });
            }}
          >
            <LogOut size={18} />
            {t("Log out", "Keluar")}
          </button>
        </div>
      </section>
    </div>
  );
}
export function Settings() {
  const { user, t, refresh } = useApp();
  const [form, setForm] = useState<Profile | null>(null),
    [name, setName] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notifications, setNotifications] = useState({
      enabled: false,
      quietStart: "22:00",
      quietEnd: "07:00",
    });
  useEffect(() => {
    if (user) {
      setForm(user.profile);
      setName(user.name);
      setNotifications(user.notifications);
    }
  }, [user]);
  if (!form || !user) return <Loading />;
  const change = (v: Partial<Profile>) => setForm({ ...form, ...v });
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("profile", {
        name,
        locale: form!.locale,
        experience: form!.experience,
        goal: form!.goal,
        dailyMinutes: form!.dailyMinutes,
        reminderTime: form!.reminderTime,
        timezone: form!.timezone,
        pinyin: form!.pinyin,
        audio: form!.audio,
        publicLeaderboard: form!.publicLeaderboard,
        theme: form!.theme,
        notifications,
      });
      await refresh();
      setMessage(t("Preferences saved.", "Preferensi tersimpan."));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function permission() {
    try {
      if (!("Notification" in window))
        throw new Error(
          t(
            "This browser does not support notifications.",
            "Browser ini belum mendukung notifikasi.",
          ),
        );
      const result = await Notification.requestPermission();
      if (result !== "granted")
        throw new Error(
          t(
            "Notification permission was not granted.",
            "Izin notifikasi tidak diberikan.",
          ),
        );
      new Notification("HanyuFlow", {
        body: t(
          "A little Mandarin, at your own pace.",
          "Sedikit Mandarin, sesuai ritmemu.",
        ),
      });
      setNotifications({ ...notifications, enabled: true });
      setMessage(
        t(
          "Browser permission granted. Save settings to enable reminders while the app is open.",
          "Izin diberikan. Simpan pengaturan untuk pengingat selama aplikasi terbuka.",
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function password(data: FormData) {
    setError("");
    try {
      await api("password", {
        current: String(data.get("current")),
        password: String(data.get("password")),
      });
      setMessage(t("Password changed.", "Kata sandi diubah."));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove(data: FormData) {
    setError("");
    if (
      !confirm(
        t(
          "Permanently delete your account and learning data?",
          "Hapus akun dan data belajar secara permanen?",
        ),
      )
    )
      return;
    try {
      await api("delete-account", {
        password: String(data.get("deletePassword")),
        confirmation: String(data.get("confirmation")),
      });
      localStorage.removeItem("hf-offline-words");
      await signOut({ callbackUrl: "/" });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div id="main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE IT YOURS</span>
          <h1>{t("Your preferences", "Preferensi kamu")}</h1>
          <p>
            {t(
              "A rhythm that fits your life.",
              "Ritme yang sesuai dengan hidupmu.",
            )}
          </p>
        </div>
      </div>
      <ErrorBox message={error} />
      {message && (
        <div className="notice" role="status">
          <Check size={18} />
          {message}
        </div>
      )}
      <div className="settings-grid">
        <section className="card">
          <h2>{t("Learning & profile", "Belajar dan profil")}</h2>
          <label>
            {t("Name", "Nama")}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </label>
          <label>
            {t("Interface language", "Bahasa antarmuka")}
            <select
              value={form.locale}
              onChange={(e) =>
                change({ locale: e.target.value as "id" | "en" })
              }
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            {t("Experience", "Pengalaman")}
            <select
              value={form.experience}
              onChange={(e) => change({ experience: e.target.value })}
            >
              <option value="beginner">Beginner / Pemula</option>
              <option value="some">Some words / Sedikit kata</option>
              <option value="intermediate">Intermediate / Menengah</option>
            </select>
          </label>
          <label>
            {t("Goal", "Tujuan")}
            <select
              value={form.goal}
              onChange={(e) => change({ goal: e.target.value })}
            >
              {["travel", "work", "school", "hsk", "friends", "curiosity"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </label>
          <label>
            {t("Daily minutes", "Menit harian")}
            <select
              value={form.dailyMinutes}
              onChange={(e) => change({ dailyMinutes: Number(e.target.value) })}
            >
              {[5, 10, 15, 20, 30].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            {t("Timezone", "Zona waktu")}
            <input
              value={form.timezone}
              onChange={(e) => change({ timezone: e.target.value })}
            />
          </label>
          <label>
            {t("Theme", "Tema")}
            <select
              value={form.theme}
              onChange={(e) => change({ theme: e.target.value })}
            >
              <option value="light">Light / Terang</option>
              <option value="dark">Dark / Gelap</option>
              <option value="system">System / Sistem</option>
            </select>
          </label>
          {[
            ["pinyin", t("Show pinyin", "Tampilkan pinyin")],
            ["audio", t("Enable device audio", "Aktifkan audio perangkat")],
            [
              "publicLeaderboard",
              t("Join public leaderboard", "Ikut papan peringkat publik"),
            ],
          ].map(([key, label]) => (
            <label className="toggle-label" key={key}>
              {label}
              <input
                type="checkbox"
                checked={Boolean(form[key as keyof Profile])}
                onChange={(e) => change({ [key]: e.target.checked })}
              />
            </label>
          ))}
          <p className="muted">
            {t(
              "Simplified Chinese is supported. Traditional character data is not available yet.",
              "Hanzi sederhana tersedia. Data karakter tradisional belum tersedia.",
            )}
          </p>
          <button
            className="button full"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy
              ? t("Saving…", "Menyimpan…")
              : t("Save preferences", "Simpan preferensi")}
          </button>
        </section>
        <div>
          <section className="card">
            <h2>{t("Study reminders", "Pengingat belajar")}</h2>
            <label>
              {t("Preferred time", "Waktu pilihan")}
              <input
                type="time"
                value={form.reminderTime}
                onChange={(e) => change({ reminderTime: e.target.value })}
              />
            </label>
            <label>
              {t("Quiet hours start", "Mulai jam tenang")}
              <input
                type="time"
                value={notifications.quietStart}
                onChange={(e) =>
                  setNotifications({
                    ...notifications,
                    quietStart: e.target.value,
                  })
                }
              />
            </label>
            <label>
              {t("Quiet hours end", "Akhir jam tenang")}
              <input
                type="time"
                value={notifications.quietEnd}
                onChange={(e) =>
                  setNotifications({
                    ...notifications,
                    quietEnd: e.target.value,
                  })
                }
              />
            </label>
            <label className="toggle-label">
              {t(
                "Reminder while app is open",
                "Pengingat saat aplikasi terbuka",
              )}
              <input
                type="checkbox"
                checked={notifications.enabled}
                onChange={(e) =>
                  setNotifications({
                    ...notifications,
                    enabled: e.target.checked,
                  })
                }
              />
            </label>
            <button className="button ghost" onClick={() => void permission()}>
              <Bell size={18} />
              {t(
                "Enable & test browser notification",
                "Aktifkan dan uji notifikasi",
              )}
            </button>
            <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
              {t(
                "Uses your study timezone. Background push and email delivery are unconfigured. Save preferences after changing this section.",
                "Menggunakan zona waktu belajar. Push latar belakang dan email belum dikonfigurasi. Simpan preferensi setelah mengubah bagian ini.",
              )}
            </p>
          </section>
          <section className="card">
            <h2>{t("Change password", "Ubah kata sandi")}</h2>
            <form action={password}>
              <label>
                {t("Current password", "Kata sandi sekarang")}
                <input
                  name="current"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
              <label>
                {t("New password", "Kata sandi baru")}
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={128}
                  required
                  autoComplete="new-password"
                />
              </label>
              <button className="button ghost">
                {t("Change password", "Ubah kata sandi")}
              </button>
            </form>
          </section>
          <section className="card">
            <h2>{t("Your data", "Data kamu")}</h2>
            <Link className="text-link" href="/api/export">
              <Download size={18} />
              {t("Download JSON export", "Unduh ekspor JSON")}
            </Link>
            <p className="muted">
              {t(
                "AI, email, billing, and genuine pronunciation scoring need separate integrations. No subscription purchase is offered.",
                "AI, email, pembayaran, dan penilaian pelafalan asli memerlukan integrasi terpisah. Tidak ada pembelian langganan.",
              )}
            </p>
            <InstallButton />
          </section>
          <section className="card danger-zone">
            <h2>{t("Delete account", "Hapus akun")}</h2>
            <p>
              {t(
                "Deletes your saved learning history permanently.",
                "Menghapus riwayat belajar secara permanen.",
              )}
            </p>
            <form action={remove}>
              <label>
                {t("Password", "Kata sandi")}
                <input
                  name="deletePassword"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
              <label>
                {t("Type DELETE to confirm", "Ketik DELETE untuk konfirmasi")}
                <input name="confirmation" required pattern="DELETE" />
              </label>
              <button className="button">
                {t("Delete my account", "Hapus akun saya")}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
function InstallButton() {
  const { t } = useApp();
  const [event, setEvent] = useState<InstallEvent | null>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    const listener = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);
  return (
    <>
      <button
        className="button ghost"
        onClick={async () => {
          if (event) {
            await event.prompt();
            const result = await event.userChoice;
            setMessage(result.outcome);
            setEvent(null);
          } else
            setMessage(
              t(
                "Use the browser menu → Install app / Add to Home Screen, if supported.",
                "Gunakan menu browser → Instal aplikasi / Tambahkan ke layar utama, jika didukung.",
              ),
            );
        }}
      >
        {t("Install HanyuFlow", "Instal HanyuFlow")}
      </button>
      <p className="muted" role="status">
        {message}
      </p>
    </>
  );
}
export function Reminder() {
  const { user } = useApp();
  useEffect(() => {
    if (
      !user?.notifications.enabled ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    const timer = setInterval(() => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: user.profile.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now);
      const { quietStart, quietEnd } = user.notifications;
      const quiet =
        quietStart > quietEnd
          ? parts >= quietStart || parts < quietEnd
          : parts >= quietStart && parts < quietEnd;
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: user.profile.timezone,
      }).format(now);
      const key = `hf-reminder-${user.id}`;
      if (
        !quiet &&
        parts === user.profile.reminderTime &&
        localStorage.getItem(key) !== day
      ) {
        new Notification("HanyuFlow", {
          body:
            user.profile.locale === "id"
              ? "Waktunya satu langkah kecil. Buka pelajaran atau review."
              : "Time for one small step. Open a lesson or review.",
        });
        localStorage.setItem(key, day);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [user]);
  return null;
}
