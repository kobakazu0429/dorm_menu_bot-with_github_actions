import * as path from "path";
import { promises as fs } from "fs";
import * as Twitter from "twitter";
import { getTimeJST } from "./utils";
import { Menus, Menu } from "./parser";

function postTwitter(tweet: string) {
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
      { status: tweet },
      (error, tweet, _response) => {
        if (error) console.log(error);
        console.log(tweet);
        resolve();
      }
    );
  });
}

async function searchExistFiles({
  around,
}: {
  around: Array<{ year: number; month: number }>;
}) {
  const _dir = path.resolve(__dirname, "../menu-json");
  const files = (
    await fs.readdir(_dir, {
      withFileTypes: true,
    })
  ).map((v) => v.name);

  const result = [...around]
    .map(({ year, month }) => {
      const filename = `${year}${month.toString().padStart(2, "0")}.json`;
      return {
        year,
        month,
        isExist: files.includes(filename),
        path: path.join(_dir, filename),
      };
    })
    .filter((v) => v.isExist);

  return result;
}

async function getFileList({ year, month }: { year: number; month: number }) {
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

  return searchExistFiles({ around });
}

async function getMenu({
  year,
  month,
  date,
}: {
  year: number;
  month: number;
  date: number;
}) {
  const result = await getFileList({ year, month });

  const json: Menus[] = [];

  for (let i = 0; i < result.length; i++) {
    json.push(JSON.parse(await fs.readFile(result[i].path, "utf8")));
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
    11: { key: "lunch", value: "お昼" },
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
