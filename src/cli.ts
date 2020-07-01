import * as meow from "meow";
import sequelize from "./sequelize";
import parsePDF2Json from "./parser";
import savedMenu2DB from "./savedMenu2DB";

import {
  getTimeJST,
  isLinkAlived,
  infomationForCLI,
  errorForCLI,
} from "./utils";

const cli = meow(
  `
    Usage
      $ [options]

    Options
      --print, -p
      --save, -s
`,
  {
    autoHelp: true,
    booleanDefault: false,
    flags: {
      print: {
        type: "boolean",
        alias: "p",
      },
      save: {
        type: "boolean",
        alias: "s",
      },
    },
  }
);

interface Result {
  year: number;
  month: number;
  date: number;
  morning: string;
  lunch: string;
  dinner: string;
}

async function run(options: { print?: boolean; save?: boolean }) {
  const { print, save } = options;

  if (print) {
    const now = getTimeJST();
    const year = now.get("year");
    const month = now.get("month") + 1;

    const PDFPath = `https://www.kure-nct.ac.jp/life/dorm/pdf/${month
      .toString()
      .padStart(2, "0")}_menu.pdf`;

    infomationForCLI(PDFPath);

    if (!(await isLinkAlived(PDFPath))) {
      errorForCLI("Unexisted Menu File Now");
      return;
    }

    const parsedMenuData = await parsePDF2Json(PDFPath);

    const result: Result[] = [];
    for (const date of Object.keys(parsedMenuData)) {
      const { morning, lunch, dinner } = parsedMenuData[date];
      const [menu_month, menu_date] = date.split(/月|日/);

      result.push({
        year,
        month: Number(menu_month),
        date: Number(menu_date),
        morning,
        lunch,
        dinner,
      });
    }
    console.log(result);
  }

  if (save) {
    (async () => {
      await sequelize.sync();
      await savedMenu2DB();
    })();
  }
}

run(cli.flags);
