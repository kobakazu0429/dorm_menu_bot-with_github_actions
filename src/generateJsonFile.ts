import * as path from "path";
import { promises as fs } from "fs";
import { parser } from "./parser";

export async function generateJsonFile(data: Buffer, outputFilename: string) {
  try {
    const result = await parser(data);
    const outputFilepath = path.resolve(
      __dirname,
      `../menu-json/${outputFilename}`
    );

    await fs.writeFile(outputFilepath, JSON.stringify(result, null, 2));
  } catch (error) {
    console.log("called", error);
  }
}
