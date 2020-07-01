import * as path from "path";
import * as fs from "fs";
import axios, { AxiosError } from "axios";
import { getTimeJST } from "./utils";

export async function download(
  options: { year?: number; month?: number } = {}
) {
  let { year, month } = options;

  if (!year || !month) {
    const now = getTimeJST();
    year = now.get("year");
    month = now.get("month") + 1;
  }

  const mm = month.toString().padStart(2, "0");

  const url = `https://www.kure-nct.ac.jp/life/dorm/pdf/${mm}_menu.pdf`;

  const filename = `${year}${mm}`;
  const filePath = path.resolve(__dirname, `../pdf/${filename}.pdf`);

  const response = await axios({
    method: "get",
    url,
    responseType: "stream",
  }).catch((e: AxiosError) => {
    const url = e.config.url;
    const statusCode = e.response?.status;
    const statusText = e.response?.statusText;
    const text = `${statusCode}: ${statusText}
-- ${url}`;
    console.log(text);
  });

  if (response && response.data) {
    response.data.pipe(fs.createWriteStream(filePath));
  }
}
