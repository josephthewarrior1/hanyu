// Original minimal geometric stroke guides, released under CC0. Not handwriting recognition.
export type Point = [number, number];
export const strokeGuides: Record<
  string,
  { meaning: string; radical: string; paths: Point[][] }
> = {
  一: {
    meaning: "one / satu",
    radical: "一",
    paths: [
      [
        [50, 150],
        [250, 150],
      ],
    ],
  },
  二: {
    meaning: "two / dua",
    radical: "二",
    paths: [
      [
        [75, 100],
        [225, 100],
      ],
      [
        [45, 200],
        [255, 200],
      ],
    ],
  },
  三: {
    meaning: "three / tiga",
    radical: "一",
    paths: [
      [
        [65, 75],
        [235, 75],
      ],
      [
        [85, 145],
        [215, 145],
      ],
      [
        [45, 225],
        [255, 225],
      ],
    ],
  },
  十: {
    meaning: "ten / sepuluh",
    radical: "十",
    paths: [
      [
        [50, 130],
        [250, 130],
      ],
      [
        [150, 45],
        [150, 255],
      ],
    ],
  },
};
export function followsGuide(stroke: Point[], guide: Point[]) {
  if (stroke.length < 2) return false;
  const [a, b] = guide;
  const distance = (p: Point, q: Point) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  if (distance(stroke[0], a) > 35 || distance(stroke.at(-1)!, b) > 35)
    return false;
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    length = Math.hypot(dx, dy);
  return (
    stroke.reduce(
      (sum, p) =>
        sum +
        Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / length,
      0,
    ) /
      stroke.length <
    28
  );
}
