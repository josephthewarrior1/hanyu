import sharp from "sharp";
import { readFileSync } from "node:fs";
const source = readFileSync("public/icon.svg");
for (const size of [192, 512])
  await sharp(source)
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
