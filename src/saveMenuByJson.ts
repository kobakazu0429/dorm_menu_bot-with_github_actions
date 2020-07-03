import * as path from "path";
import { promises as fs } from "fs";
import { generateJsonFile } from "./generateJsonFile";
import { download } from "./downloadPdfFile";
import { getTimeJST, aroundMonth, searchExistFiles } from "./utils";

async function main() {
  const { year, month } = getTimeJST();
  const around = aroundMonth({ year, month });
  const filenames = around.map(
    ({ year, month }) => `${year}${month.toString().padStart(2, "0")}.json`
  );
  const dirpath = path.resolve(__dirname, "../menu-json");
  const list = await searchExistFiles(dirpath, filenames);

  const downloadList = list
    .map((v, i) => ({
      isExist: v,
      year: around[i].year,
      month: around[i].month,
    }))
    .filter((v) => !v.isExist);

  for (let i = 0; i < downloadList.length; i++) {
    const { year, month } = downloadList[i];

    const downloaded = await download({ year, month });

    const mm = month.toString().padStart(2, "0");
    const pdfFile = path.resolve(__dirname, `../pdf/${year}${mm}.pdf`);
    const jsonFilename = `${year}${mm}.json`;

    if (downloaded) {
      const data = await fs.readFile(pdfFile);
      await generateJsonFile(data, jsonFilename).catch((e) => console.log(e));
    }
  }
}

main();
