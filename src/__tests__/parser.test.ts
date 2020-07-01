import * as path from "path";
import { promises as fs } from "fs";
import { parser } from "../parser";

describe("parser", () => {
  test("local pdf file", async (done) => {
    const expectData = await fs.readFile(
      path.resolve("./fixtures/201909-out.json"),
      "utf8"
    );

    parser("./fixtures/201909.pdf", (result) => {
      expect(result).toStrictEqual(JSON.parse(expectData));
      done();
    });
  });
});
