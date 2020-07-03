import * as path from "path";
import { promises as fs } from "fs";
import { getMenu } from "../bot";

describe("bot", () => {
  test("local pdf file", async (done) => {
    const year = 2019;
    const month = 9;
    const date = 24;

    const expectData = JSON.parse(
      await fs.readFile(
        path.resolve(__dirname, "../../fixtures/201909-out.json"),
        "utf8"
      )
    )[`${month}月${date}日`];

    const result = await getMenu({ year, month, date });

    expect(result).toStrictEqual(expectData);
    done();
  });
});
