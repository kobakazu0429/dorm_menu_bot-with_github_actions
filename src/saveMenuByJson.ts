import * as path from "path";
import { promises as fs } from "fs";
import { generateJsonFile } from "./generateJsonFile";
import { download } from "./downloadPdfFile";
import { getTimeJST } from "./utils";

async function searchExistFiles({
  around,
}: {
  around: Array<{ year: number; month: number }>;
}) {
  const files = (
    await fs.readdir(path.resolve(__dirname, "../menu-json"), {
      withFileTypes: true,
    })
  ).map((v) => v.name);

  const result = [...around].map(({ year, month }) => {
    const filename = `${year}${month.toString().padStart(2, "0")}.json`;
    return { year, month, isExist: files.includes(filename) };
  });

  return result;
}

async function getDownloadList() {
  const now = getTimeJST();
  const y = now.year();
  const m = now.month() + 1;

  let around: Array<{ year: number; month: number }>;

  if (m === 1 /* 1 is Jan. */) {
    around = [
      {
        year: y - 1,
        month: 12,
      },
      {
        year: y,
        month: 1,
      },
      {
        year: y,
        month: 2,
      },
    ];
  } else {
    around = [
      {
        year: y,
        month: m - 1,
      },
      {
        year: y,
        month: m,
      },
      {
        year: y,
        month: m + 1,
      },
    ];
  }

  return searchExistFiles({ around });
}

async function main() {
  const downlaodList = (await getDownloadList()).filter((v) => !v.isExist);
  console.log(downlaodList);

  for (let i = 0; i < downlaodList.length; i++) {
    const { year, month } = downlaodList[i];

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
