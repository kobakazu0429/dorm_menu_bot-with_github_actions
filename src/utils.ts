import { promises as fs } from "fs";
import * as moment from "moment-timezone";

export function getTimeJST() {
  const now = moment().utc().add(9, "h");
  const year = now.get("year");
  const month = now.get("month") + 1;
  const mm = month.toString().padStart(2, "0");
  const date = now.get("date");
  const day = now.get("day");
  const hour = now.get("hour");

  return {
    year,
    month,
    mm,
    date,
    day,
    hour,
  };
}

export function aroundMonth({ year, month }: { year: number; month: number }) {
  let around: Array<{ year: number; month: number }>;

  if (month === 1 /* 1 is Jan. */) {
    around = [
      {
        year: year - 1,
        month: 12,
      },
      {
        year,
        month: 1,
      },
      {
        year,
        month: 2,
      },
    ];
  } else {
    around = [
      {
        year,
        month: month - 1,
      },
      {
        year,
        month: month,
      },
      {
        year,
        month: month + 1,
      },
    ];
  }
  return around;
}

export async function searchExistFiles(dirpath: string, filenames: string[]) {
  const files = (
    await fs.readdir(dirpath, {
      withFileTypes: true,
    })
  ).map((v) => v.name);

  const result = [...filenames].map((filename) => {
    return files.includes(filename);
  });

  return result;
}
