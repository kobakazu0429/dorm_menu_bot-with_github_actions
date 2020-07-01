/* eslint-disable @typescript-eslint/no-explicit-any */
// require("pdfjs-dist/lib/examples/node/domstubs");
import * as fs from "fs";

import pdf_table_extractor = require("../vendor/pdf-table-extractor");
import PDFJS = require("pdfjs-dist");
PDFJS.workerSrc = "../vendor/pdf.worker.js";
PDFJS.cMapUrl = "../vendor/web/cmaps";
PDFJS.cMapPacked = true;
PDFJS.disableFontFace = true;

enum ColumnName {
  date,
  week,
  morning,
  lunch,
  dinner,
}

type Keys = keyof typeof ColumnName;
type IMenu = { [key in Keys]: string[] };

const parsePDF2Json = async (pdfUrlOrFileName: string) => {
  const baseOption = {
    nativeImageDecoderSupport: "none",
    disableNativeImageDecoder: true,
    disableFontFace: true,
  };

  const option = pdfUrlOrFileName.startsWith("http")
    ? { ...baseOption, url: pdfUrlOrFileName }
    : {
        ...baseOption,
        data: new Uint8Array(fs.readFileSync(pdfUrlOrFileName)),
      };

  const pdfRead = await PDFJS.getDocument(option);

  const pdfParsed = await pdf_table_extractor(pdfRead, PDFJS);

  const allTables = pdfParsed.pageTables.map(
    (page_tables: any) => page_tables.tables
  );

  const allData = {};

  for (let i = 0, len = allTables.length; i < len; i++) {
    const cleanedMenuTable = cleanData(allTables[i]);
    const parsedMenu = parseData(cleanedMenuTable);
    const savableDBFormat = mapping(parsedMenu);

    Object.assign(allData, savableDBFormat);
  }

  return allData;
};

const cleanData = (data: any) => {
  const pattern1 = new RegExp(/^(Ａ|Ｂ)定食\d+./, "g");
  const pattern2 = new RegExp(/栄養価エネルギー/, "g");
  const pattern3 = new RegExp(/\d{3,4}./, "g");

  const cleanedData: IMenu = {
    date: [],
    week: [],
    morning: [],
    lunch: [],
    dinner: [],
  };

  for (let i = 0, j = 0, len = data.length; i < len; i++) {
    const _index = data[i].join("");

    if (!pattern1.test(_index)) {
      if (!pattern2.test(_index)) {
        if (!pattern3.test(_index)) {
          if (_index) {
            if (j > 6) continue;

            cleanedData[ColumnName[j]] = data[i];
            j++;
          }
        }
      }
    }
  }
  return cleanedData;
};

const parseData = (data: IMenu) => {
  for (const key of Object.keys(data)) {
    const record: IMenu[Keys] = data[key];
    const parsed: string[] = record.map((v) => {
      return (
        v
          .replace(/^日$/g, "")
          .replace(/(朝\n食)/g, "")
          .replace(/(昼\n食)/g, "")
          .replace(/(夕\n食)/g, "")
          // eslint-disable-next-line no-irregular-whitespace
          .replace(/(副　　　　菜)/g, "")
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

    parsed.forEach((v, i, thisArray) => {
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

const mapping = (data: IMenu) => {
  const allData: any = {};
  for (let i = 0; i < 7; i++) {
    if (!data.date[i] || data.date[i] === "無し") {
      continue;
    }

    const dailyData: any = {};
    dailyData.week = data.week[i];
    dailyData.morning = data.morning[i];
    dailyData.lunch = data.lunch[i];
    dailyData.dinner = data.dinner[i];

    allData[data.date[i]] = dailyData;
  }
  return allData;
};

export default parsePDF2Json;
