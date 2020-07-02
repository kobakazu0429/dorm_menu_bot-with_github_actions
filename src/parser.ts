/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from "path";
import * as PDFJS from "pdfjs-dist/es5/build/pdf.js";
import { pdf_table_extractor } from "./pdf-table-extractor";

PDFJS.GlobalWorkerOptions.workerSrc = path.resolve(
  __dirname,
  "../node_modules/pdfjs-dist/es5/build/pdf.worker.js"
);

enum ColumnName {
  date,
  week,
  morning,
  lunch,
  dinner,
}

type Keys = keyof typeof ColumnName;
type ArrayMenu = { [key in Keys]: string[] };
type Menus = {
  [key in string]: {
    week: string;
    morning: string;
    lunch: string;
    dinner: string;
  };
};

export async function parser(data: BufferSource) {
  const option = {
    data,
    nativeImageDecoderSupport: "none",
    disableNativeImageDecoder: true,
    disableFontFace: true,
  };

  const pdfDoc = await PDFJS.getDocument(option).promise;

  const parsedTable = await pdf_table_extractor(pdfDoc);

  const tables = parsedTable.pageTables.map(
    (page_tables) => page_tables.tables
  );

  const menus = mainProcessor((tables as any) as string[][]);
  return menus;
}

const mainProcessor = (tables: string[][]): Menus => {
  let menus: Menus = {};

  for (let i = 0, len = tables.length; i < len; i++) {
    const filteredMenu = filterMenu(tables[i]);
    const normalizedMenu = normalizeMenu(filteredMenu);
    const objectedMenu = menuArrayToObject(normalizedMenu);

    menus = { ...menus, ...objectedMenu };
  }
  return menus;
};

const filterMenu = (data: any) => {
  const pattern1 = new RegExp(/^(Ａ|Ｂ)定食\d+./, "g");
  const pattern2 = new RegExp(/栄養価エネルギー/, "g");
  const pattern3 = new RegExp(/\d{3,4}./, "g");

  const filteringMenu: ArrayMenu = {
    date: [],
    week: [],
    morning: [],
    lunch: [],
    dinner: [],
  };

  for (let i = 0, j = 0, len = data.length; i < len; i++) {
    const index = data[i].join("");

    if (pattern1.test(index) || pattern2.test(index) || pattern3.test(index))
      continue;

    if (index) {
      if (j > 6) continue;

      filteringMenu[ColumnName[j]] = data[i];
      j++;
    }
  }
  return filteringMenu;
};

const normalizeMenu = (data: ArrayMenu) => {
  for (const key of Object.keys(data)) {
    const record: ArrayMenu[Keys] = data[key];
    const normalized = record.map((v) => {
      return (
        v
          .replace(/^日$/g, "")
          .replace(/(朝\n食)/g, "")
          .replace(/(昼\n食)/g, "")
          .replace(/(夕\n食)/g, "")
          // eslint-disable-next-line no-irregular-whitespace
          .replace(/(副　　　　菜)/g, "")
          // eslint-disable-next-line no-irregular-whitespace
          .replace(/　+/g, "")
          .replace(/Ａ/g, "")
          .replace(/Ｂ/g, "")
          .replace(/(\(|（)/g, "")
          .replace(/(\)|）)/g, "")
          .replace(/曜日/g, "")
          .replace(/汁物/g, "")
          .replace(/^\n?ご飯\n/g, "")
          .replace(/\nご飯/g, "\n")
          .replace(/^ご飯・/g, "\n")
          .replace(/納豆/g, "")
          .replace(/海苔/g, "")
          .replace(/漬物/g, "")
          .replace(/牛乳/g, "")
          .replace(/パン/g, "")
          .replace(/ジャム/g, "")
          .replace(/\nサラダ\n/g, "\n")
          .replace(/デザート/g, "")
          .replace(/ふりかけ/g, "")
          .replace(/コーヒー/g, "")
          .replace(/紅茶/g, "")
          .replace(/マーガリン/g, "")
          .replace(/共通メニュー/g, "")
          .replace(/・/g, "")
          .replace(/(\n&)+/g, "&")
          .replace(/(\n)+/g, "\n")
          .replace(/(\n)+$/g, "")
          .replace(/^(\n)+/g, "")
      );
    });

    const newArray: string[] = [];
    let count = 0;

    normalized.forEach((v, i, thisArray) => {
      if (count === 3) {
        if (thisArray[i++] === "") {
          newArray.push("無し");
        } else {
          newArray.push(v);
        }
        count = 0;
      } else {
        if (v === "") {
          count++;
        } else {
          newArray.push(v);
          count = 0;
        }
      }
    });

    data[key] = newArray;
  }

  return data;
};

const A_WEEK_HAS_DAYS = 7;

const menuArrayToObject = (data: ArrayMenu) => {
  const remapped: any = {};
  for (let i = 0; i < A_WEEK_HAS_DAYS; i++) {
    const date = data.date[i];
    if (!date || date === "無し") continue;

    remapped[date] = {
      week: data.week[i],
      morning: data.morning[i],
      lunch: data.lunch[i],
      dinner: data.dinner[i],
    };
  }
  return remapped;
};
