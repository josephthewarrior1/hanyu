"use client";
import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/client";
import { Brand, ErrorBox } from "./ui";
export function AuthForm({ mode }: { mode: "login" | "register" | "forgot" }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [english, setEnglish] = useState(false);
  const t = (en: string, id: string) => (english ? en : id);
  async function submit(form: FormData) {
    setBusy(true);
    setError("");
    try {
      const email = String(form.get("email")),
        password = String(form.get("password"));
      if (mode === "forgot") {
        await api("forgot-password", { email });
        return;
      }
      if (mode === "register")
        await api("register", {
          email,
          password,
          name: String(form.get("name")),
        });
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error)
        throw new Error(
          t(
            "Email or password is incorrect, or the login limit was reached.",
            "Email atau kata sandi salah, atau batas percobaan masuk tercapai.",
          ),
        );
      window.location.href = mode === "register" ? "/onboarding" : "/dashboard";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="auth-page">
      <Link href="/">
        <Brand />
      </Link>
      <button className="language-toggle" onClick={() => setEnglish(!english)}>
        {english ? "Bahasa Indonesia" : "English"}
      </button>
      <section className="auth-card">
        <div className="auth-symbol">你好</div>
        <span className="eyebrow">ONE SMALL STEP</span>
        <h1>
          {mode === "register"
            ? t(
                "Your Mandarin journey starts here",
                "Perjalanan Mandarinmu mulai di sini",
              )
            : mode === "forgot"
              ? t("Reset your password", "Atur ulang kata sandi")
              : t("Welcome back", "Selamat datang kembali")}
        </h1>
        <p>
          {t(
            "Make room for a little progress today.",
            "Luangkan waktu untuk sedikit kemajuan hari ini.",
          )}
        </p>
        <form action={submit}>
          {mode === "register" && (
            <label>
              {t("Your name", "Nama kamu")}
              <input
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={60}
                required
              />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          {mode !== "forgot" && (
            <label>
              {t("Password", "Kata sandi")}
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                minLength={10}
                maxLength={128}
                required
              />
              {mode === "register" && (
                <small>
                  {t("At least 10 characters.", "Minimal 10 karakter.")}
                </small>
              )}
            </label>
          )}
          <ErrorBox message={error} />
          <button className="button full" disabled={busy}>
            {busy
              ? t("Please wait…", "Tunggu…")
              : mode === "register"
                ? t("Create account", "Buat akun")
                : mode === "forgot"
                  ? t("Request reset", "Minta pengaturan ulang")
                  : t("Log in", "Masuk")}
            <ArrowRight size={18} />
          </button>
        </form>
        {mode === "login" && (
          <Link href="/forgot-password">
            {t("Forgot password?", "Lupa kata sandi?")}
          </Link>
        )}
        <p className="auth-switch">
          {mode === "register"
            ? t("Already learning with us?", "Sudah punya akun?")
            : t("New to HanyuFlow?", "Baru di HanyuFlow?")}{" "}
          <Link href={mode === "register" ? "/login" : "/register"}>
            {mode === "register"
              ? t("Log in", "Masuk")
              : t("Create account", "Buat akun")}
          </Link>
        </p>
        {mode === "forgot" && (
          <div className="notice">
            {t(
              "Email delivery is unconfigured in this local installation. No email will be sent.",
              "Pengiriman email belum dikonfigurasi di instalasi lokal ini. Email belum dapat dikirim.",
            )}
          </div>
        )}
        <small>
          {t(
            "Email verification, Google login and billing are unconfigured.",
            "Verifikasi email, login Google, dan pembayaran belum dikonfigurasi.",
          )}
        </small>
      </section>
    </main>
  );
}
