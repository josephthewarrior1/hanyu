export function normalize(text: string) {
  return text
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s。，！？,.!?、]/g, "");
}
export function grade(
  type: string,
  submitted: unknown,
  answer: unknown,
  alternatives: unknown = [],
) {
  if (type === "ordering" || type === "matching") {
    if (
      !Array.isArray(submitted) ||
      !submitted.every((v) => typeof v === "string") ||
      !Array.isArray(answer)
    )
      return false;
    return type === "ordering"
      ? normalize(submitted.join("")) === normalize(answer.join(""))
      : submitted.length === answer.length &&
          submitted.every((v, i) => v === answer[i]);
  }
  if (typeof submitted !== "string" || typeof answer !== "string") return false;
  return [answer, ...(Array.isArray(alternatives) ? alternatives : [])].some(
    (a) => typeof a === "string" && normalize(a) === normalize(submitted),
  );
}
export type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";
export type ReviewInput = {
  difficulty: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
};
// Explicit SM-2 inspired alternative, not FSRS: AGAIN 10m; HARD max(1d,1.2x);
// GOOD first 1d/then 3d/then ease multiplier; EASY first 4d/then 1.3x ease.
export function schedule(state: ReviewInput, rating: Rating, now = new Date()) {
  const difficulty = Math.max(
    1.3,
    Math.min(
      3.5,
      state.difficulty +
        { AGAIN: -0.2, HARD: -0.15, GOOD: 0, EASY: 0.15 }[rating],
    ),
  );
  const intervalDays =
    rating === "AGAIN"
      ? 10 / 1440
      : rating === "HARD"
        ? Math.max(1, state.intervalDays * 1.2)
        : rating === "EASY"
          ? Math.max(4, state.intervalDays * difficulty * 1.3)
          : state.repetitions === 0
            ? 1
            : state.repetitions === 1
              ? 3
              : Math.max(1, state.intervalDays * difficulty);
  return {
    difficulty,
    intervalDays: Math.min(365, intervalDays),
    repetitions: rating === "AGAIN" ? 0 : state.repetitions + 1,
    lapses: state.lapses + (rating === "AGAIN" ? 1 : 0),
    lastReview: now,
    due: new Date(now.getTime() + Math.min(365, intervalDays) * 86400000),
  };
}
export function localDay(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function updateStreak(
  state: { current: number; longest: number; lastDay: string | null },
  now: Date,
  timezone: string,
) {
  const day = localDay(now, timezone);
  if (state.lastDay === day) return state;
  const dayDifference = state.lastDay
    ? Math.round(
        (Date.parse(day + "T00:00:00Z") -
          Date.parse(state.lastDay + "T00:00:00Z")) /
          86400000,
      )
    : Infinity;
  const current = dayDifference === 1 ? state.current + 1 : 1;
  return { current, longest: Math.max(state.longest, current), lastDay: day };
}
export function displayedStreak(
  state: { current: number; lastDay: string | null } | null,
  now: Date,
  timezone: string,
) {
  if (!state?.lastDay) return 0;
  const age =
    (Date.parse(localDay(now, timezone) + "T00:00:00Z") -
      Date.parse(state.lastDay + "T00:00:00Z")) /
    86400000;
  return age <= 1 ? state.current : 0;
}
export function canEdit(role: string) {
  return role === "EDITOR" || role === "ADMIN";
}
export function canManageUsers(role: string) {
  return role === "ADMIN";
}
export const xpEvent = (userId: string, lessonId: string) =>
  `lesson:${userId}:${lessonId}`;
