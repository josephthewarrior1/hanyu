"use client";
import { useApp } from "./context";
import { ErrorBox, Loading, Empty } from "./ui";
import { Onboarding } from "./onboarding";
import { Dashboard, Learn, LessonPlayer } from "./learning-screens";
import {
  Vocabulary,
  GrammarLibrary,
  Reviews,
  Progress,
  Achievements,
  Leaderboard,
} from "./library-screens";
import { ProfilePage, Settings, Reminder } from "./settings";
import { Speaking } from "./speaking";
import { Hanzi } from "./hanzi";
import { Admin } from "./admin";
export function Screens({ slug }: { slug: string[] }) {
  const { user, error } = useApp();
  if (!user)
    return (
      <>
        <ErrorBox message={error} />
        <Loading />
      </>
    );
  const [route, id] = slug;
  const screen =
    route === "onboarding" ? (
      <Onboarding />
    ) : route === "dashboard" ? (
      <Dashboard />
    ) : route === "learn" ? (
      <Learn unitId={id} />
    ) : route === "lesson" && id ? (
      <LessonPlayer id={id} />
    ) : route === "review" ? (
      <Reviews />
    ) : route === "vocabulary" ? (
      <Vocabulary id={id} />
    ) : route === "grammar" ? (
      <GrammarLibrary id={id} />
    ) : route === "speaking" ? (
      <Speaking scenario={id} />
    ) : route === "hanzi" ? (
      <Hanzi />
    ) : route === "progress" ? (
      <Progress />
    ) : route === "achievements" ? (
      <Achievements />
    ) : route === "leaderboard" ? (
      <Leaderboard />
    ) : route === "profile" ? (
      <ProfilePage />
    ) : route === "settings" ? (
      <Settings />
    ) : route === "admin" ? (
      <Admin tab={id} />
    ) : (
      <Empty
        title="Page not found / Halaman tidak ditemukan"
        text="Return to your learning path."
        href="/dashboard"
        label="Dashboard"
      />
    );
  return (
    <>
      <Reminder />
      {screen}
    </>
  );
}
