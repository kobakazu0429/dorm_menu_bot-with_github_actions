import * as path from "path";
import { promises as fs } from "fs";
import { parser } from "../parser";

describe("parser", () => {
  test("local pdf file", async (done) => {
    const expectData = await fs.readFile(
      path.resolve(__dirname, "../../fixtures/201909-out.json"),
      "utf8"
    );
    const data = await fs.readFile(
      path.resolve(__dirname, "../../fixtures/201909.pdf")
    );

    const result = await parser(data);

    expect(result).toStrictEqual(JSON.parse(expectData));
    done();
  });
});
