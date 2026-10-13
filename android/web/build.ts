import { build } from "esbuild";
import { mkdirSync, writeFileSync, readFileSync, copyFileSync } from "node:fs";
import { units, words } from "../../src/lib/content";
import {program,extraWords,androidLegacyLessons,androidGrammar} from "./program";
const lessonDrafts=androidLegacyLessons,grammar=androidGrammar;
const destination = "android/app/src/main/assets";
async function main() {
  mkdirSync(destination, { recursive: true });
  writeFileSync(
    destination + "/curriculum.json",
    JSON.stringify({
      version: "original-beginner-0.1",
      units,
      words:[...words,...extraWords],
      grammar,
      lessons: lessonDrafts,
    }),
  );
  writeFileSync(destination+"/program.json",JSON.stringify(program));
  writeFileSync(
    destination + "/style.css",
    readFileSync("src/app/globals.css", "utf8").replace(
      '@import "tailwindcss";',
      "",
    ) +
      "\n" +
      readFileSync("android/web/android.css", "utf8"),
  );
  writeFileSync(
    destination + "/index.html",
    '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; media-src \'self\'; connect-src \'self\'; object-src \'none\'; frame-src \'none\'"><title>HanyuFlow Android</title><link rel="stylesheet" href="style.css"></head><body><div id="root"></div><script src="app.js"></script></body></html>',
  );
  await build({
    entryPoints: ["android/web/App.tsx"],
    bundle: true,
    minify: true,
    outfile: destination + "/app.js",
    platform: "browser",
    target: ["chrome87"],
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  mkdirSync(destination + "/mascot", { recursive: true });
  copyFileSync("android/mascot/pinyin.png", destination + "/mascot/pinyin.png");
  const audio = JSON.parse(readFileSync(destination + "/audio/manifest.json", "utf8"));
  const utterances=JSON.parse(readFileSync("android/audio/utterances.json","utf8")).utterances;
  for(const u of utterances) if(!audio.clips.some((c:{key:string})=>c.key===u.key))throw new Error("Missing generated speech: "+u.id);
  for (const clip of audio.clips) if (readFileSync(destination + "/" + clip.file).length < 1000) throw new Error("Missing speech clip: " + clip.id);
  mkdirSync("android/app/src/main/res/mipmap-xxxhdpi", { recursive: true });
  copyFileSync(
    "public/icon-512.png",
    "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
  );
  console.log(
    `Bundled ${lessonDrafts.length} lessons / ${words.length+extraWords.length} words / ${program.courses.length} guided modules into Android assets; no backend URL or credentials included.`,
  );
}
void main();
