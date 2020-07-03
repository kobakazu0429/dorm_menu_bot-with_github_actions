import * as path from "path";
import { promises as fs } from "fs";
import * as Twitter from "twitter";
import { getTimeJST } from "./utils";

interface Options {
  menu: string;
  typeJp: "朝" | "お昼" | "夜";
}

function postTwitter({ menu, typeJp }: Options) {
  const { year, month, date, dayJp } = getTimeJST();

  const text = [
    `【${year}/${month}/${date}（${dayJp}）】`,
    `今日の${typeJp}のメニューはこちらです`,
    `- - - - - - - - - - - - - - - -`,
    `${menu}`,
  ].join("\n");

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
      { status: text },
      (error, tweet, _response) => {
        if (error) console.log(error);
        console.log(tweet);
        resolve();
      }
    );
  });
}

type MenuType = "morning" | "lunch" | "dinner";

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
  type,
  year,
  month,
  date,
}: {
  type: MenuType;
  year: number;
  month: number;
  date: number;
}) {
  const result = await getFileList({ year, month });

  const json: any[] = [];

  for (let i = 0; i < result.length; i++) {
    json.push(JSON.parse(await fs.readFile(result[i].path, "utf8")));
  }

  const menu = json.flat()[0][`${month}月${date}日`];

  return new Promise((resolve: (menu: string) => void) => {
    return resolve(menu[type]);
  });
}

async function main() {
  const menuType = process.env.BOT_MENU_TYPE as MenuType | undefined;
  if (!menuType) return;

  const { year, month, date } = getTimeJST();
  const menu = await getMenu({ type: menuType, year, month, date });

  switch (menuType) {
    case "morning":
      postTwitter({ menu, typeJp: "朝" });
      break;
    case "lunch":
      postTwitter({ menu, typeJp: "お昼" });
      break;
    case "dinner":
      postTwitter({ menu, typeJp: "夜" });
      break;
  }
}

main();
