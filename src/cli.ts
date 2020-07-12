import * as path from "path";
import { promises as fs } from "fs";
import { generateJsonFile } from "./generateJsonFile";

const [, , yyyymm] = process.argv;

async function parse(date: string) {
  const pdfPath = path.resolve(
    path.join(__dirname, "../", "pdf", `${date}.pdf`)
  );
  const data = await fs.readFile(pdfPath);
  await generateJsonFile(data, `${date}.json`);
}

parse(yyyymm);
