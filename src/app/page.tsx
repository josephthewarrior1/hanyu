import Link from "next/link";
import { ArrowRight, BookOpen, Mic, Layers, Check } from "lucide-react";
import { Brand } from "@/components/ui";
export default function Landing() {
  return (
    <div className="landing">
      <header>
        <Link href="/">
          <Brand />
        </Link>
        <nav>
          <Link href="/login">Masuk / Log in</Link>
          <Link className="button small" href="/register">
            Mulai belajar <ArrowRight size={16} />
          </Link>
        </nav>
      </header>
      <main id="main">
        <section className="landing-hero">
          <div>
            <span className="eyebrow">YOUR NEXT CHAPTER STARTS WITH 你好</span>
            <h1>
              A little Mandarin.
              <br />
              <em>A whole new world.</em>
            </h1>
            <p>
              Belajar Mandarin dengan ritme kamu sendiri. Pelajaran singkat,
              latihan nyata, dan setiap kemajuan tersimpan.
            </p>
            <div className="row">
              <Link className="button" href="/register">
                Mulai perjalananmu <ArrowRight size={18} />
              </Link>
              <Link className="text-link" href="/login">
                I already have an account
              </Link>
            </div>
            <small>Indonesian & English · Original beginner curriculum</small>
          </div>
          <div
            className="hero-art"
            aria-label="Original Mandarin character illustration"
          >
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <span className="hero-hanzi">你好</span>
            <span className="hero-pinyin">nǐ hǎo</span>
            <div className="art-chip">Hello, new possibilities.</div>
            <span className="spark">✦</span>
          </div>
        </section>
        <section className="landing-features">
          {[
            [
              BookOpen,
              "Learn by doing",
              "30 short lessons. Clear explanations. Your progress, saved.",
            ],
            [
              Layers,
              "Make words stick",
              "Review at the right time with a transparent spaced-repetition schedule.",
            ],
            [
              Mic,
              "Find your voice",
              "Record, listen, and practice. External AI is optional and clearly labeled.",
            ],
          ].map(([Icon, title, text]) => {
            const Component = Icon as typeof BookOpen;
            return (
              <article key={title as string}>
                <Component />
                <h2>{title as string}</h2>
                <p>{text as string}</p>
              </article>
            );
          })}
        </section>
        <section className="landing-note">
          <Check size={20} />
          <p>
            This is a working local learning app with an original draft
            curriculum. Linguistic review is pending; it is not an accredited
            HSK course.
          </p>
        </section>
      </main>
      <footer>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <span>HanyuFlow · Speak Mandarin with confidence.</span>
      </footer>
    </div>
  );
}
