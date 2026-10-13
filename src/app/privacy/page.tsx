import Link from "next/link";
export default function Page() {
  return (
    <main id="main" className="legal">
      <Link href="/">← HanyuFlow</Link>
      <h1>Privacy / Privasi</h1>
      <p>
        This local app stores your account, preferences, learning attempts,
        review history, and saved writing in its database. Passwords are bcrypt
        hashed.
      </p>
      <p>
        Microphone access is opt-in. Recordings remain in your browser unless
        you explicitly request transcription. When configured, transcription
        sends audio to the selected provider; audio is not retained by this app.
        AI chat sends your messages and recent context to the configured
        provider and stores the returned conversation.
      </p>
      <p>
        Public leaderboards are opt-in. Export or delete your data in settings.
        This is an implementation disclosure, not reviewed legal advice. Before
        a public launch, set retention policies, provider contracts, and a
        jurisdiction-appropriate privacy notice.
      </p>
      <p>
        Rekaman disimpan di browser kecuali kamu memilih transkripsi. Percakapan
        AI dikirim ke penyedia yang dikonfigurasi. Ekspor dan hapus data melalui
        pengaturan.
      </p>
    </main>
  );
}
