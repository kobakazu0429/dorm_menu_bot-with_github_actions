import * as path from "path";
import { promises as fs } from "fs";
import parsePDF2Json from "../parser";

describe("parser", () => {
  test("local pdf file", async () => {
    const parsedData = await parsePDF2Json(
      path.resolve("./fixtures/201909.pdf")
    );

    const expectData = await fs.readFile(
      path.resolve("./fixtures/201909-out.json"),
      "utf8"
    );
    expect(parsedData).toStrictEqual(JSON.parse(expectData));
  });

  test("remote pdf file", async () => {
    const parsedData = await parsePDF2Json(
      "https://raw.githubusercontent.com/kobakazu0429/dorm_menu_api/master/fixtures/201909.pdf"
    );

    const expectData = await fs.readFile(
      path.resolve("./fixtures/201909-out.json"),
      "utf8"
    );
    expect(parsedData).toStrictEqual(JSON.parse(expectData));
  });
});
