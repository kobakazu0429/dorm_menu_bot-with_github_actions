import { promises as fs } from "fs";
import { parser } from "./parser";

export async function generateJsonFile(
  filepath: string,
  outputFilepath: string
) {
  parser(filepath, async (result) => {
    await fs.writeFile(outputFilepath, JSON.stringify(result, null, 2));
  });
}
