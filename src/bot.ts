import * as path from "path";
import { promises as fs } from "fs";
import * as Twitter from "twitter";
import { getTimeJST, aroundMonth, searchExistFiles } from "./utils";
import { Menus, Menu } from "./parser";

function postTwitter(tweetBody: string) {
  const twitterOption = {
    consumer_key: process.env.CK || "",
    consumer_secret: process.env.CS || "",
    access_token_key: process.env.AK || "",
    access_token_secret: process.env.AS || "",
  };

  const client = new Twitter(twitterOption);

  return new Promise((resolve: (v: void) => void) => {
    client.post(
      "statuses/update",
      { status: tweetBody },
      (error, tweet, _response) => {
        if (error) console.log(error);
        console.log(tweet);
        resolve();
      }
    );
  });
}

export async function getMenu({
  year,
  month,
  date,
}: {
  year: number;
  month: number;
  date: number;
}) {
  const around = aroundMonth({ year, month });

  const filenames = around.map(
    ({ year, month }) => `${year}${month.toString().padStart(2, "0")}.json`
  );
  const dirpath = path.resolve(__dirname, "../menu-json");
  const fileList = await searchExistFiles(dirpath, filenames);

  const jsonFileList = fileList
    .map((v, i) => ({
      isExist: v,
      year: around[i].year,
      month: around[i].month,
      path: path.join(dirpath, filenames[i]),
    }))
    .filter((v) => v.isExist);

  const json: Menus[] = [];

  for (let i = 0; i < jsonFileList.length; i++) {
    json.push(JSON.parse(await fs.readFile(jsonFileList[i].path, "utf8")));
  }

  const menu = json.flat()[0][`${month}月${date}日`];

  return new Promise((resolve: (menu: Menu) => void) => {
    return resolve(menu);
  });
}

interface MenuType {
  key: "morning" | "lunch" | "dinner";
  value: string;
}

function hourToType(hour: number): MenuType | undefined {
  const data = {
    7: { key: "morning", value: "朝" },
    14: { key: "lunch", value: "お昼" },
    17: { key: "dinner", value: "夜" },
  };

  return data[hour];
}

async function main() {
  const { year, month, date, hour } = getTimeJST();

  const type = hourToType(hour);
  if (!type) return;

  const menu = await getMenu({ year, month, date });

  const text = [
    `【${year}/${month}/${date}（${menu["week"]}）】`,
    `今日の${type.value}のメニューはこちらです`,
    `- - - - - - - - - - - - - - - -`,
    `${menu[type.key]}`,
  ].join("\n");

  await postTwitter(text);
}

main();
