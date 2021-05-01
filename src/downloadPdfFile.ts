import * as path from "path";
import * as fs from "fs";
import axios, { AxiosError } from "axios";
import { getTimeJST } from "./utils";

export async function download(
  options: { year?: number; month?: number } = {}
) {
  let { year, month } = options;
  const now = getTimeJST();

  if (!year || !month) {
    year = now.year;
    month = now.month;
  }

  const mm = month.toString().padStart(2, "0");

  const url = `https://www.kure-nct.ac.jp/life/dorm/pdf/menu.pdf`;

  const filename = `${year}${mm}`;
  const filePath = path.resolve(__dirname, `../pdf/${filename}.pdf`);

  return await axios({
    method: "get",
    url,
    responseType: "stream",
  })
    .then((res) => {
      res.data.pipe(fs.createWriteStream(filePath));
      return true;
    })
    .catch((e: AxiosError) => {
      const url = e.config.url;
      const statusCode = e.response && e.response.status;
      const statusText = e.response && e.response.statusText;
      const text = `${statusCode}: ${statusText}
-- ${url}`;
      console.log(text);
      return false;
    });
}
