import Link from "next/link";
export default function Page() {
  return (
    <main id="main" className="legal">
      <Link href="/">← HanyuFlow</Link>
      <h1>Terms / Ketentuan</h1>
      <p>
        HanyuFlow is a local development learning application. Its original
        beginner curriculum is a draft awaiting human linguistic review. It does
        not provide official HSK accreditation or certified readiness scores.
      </p>
      <p>
        AI can make mistakes. Device text-to-speech and transcription are
        practice aids. Genuine pronunciation assessment, email, push delivery,
        and billing are unavailable in this version. No price or payment is
        offered.
      </p>
      <p>
        Source and content licensing is described in the repository. These
        provisional terms must receive legal review before public deployment.
      </p>
    </main>
  );
}
