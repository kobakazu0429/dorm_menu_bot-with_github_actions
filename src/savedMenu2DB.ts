import parsePDF2Json from "./parser";
import {
  getTimeJST,
  isLinkAlived,
  infomationForCLI,
  errorForCLI,
} from "./utils";
import { Menu } from "./models/Menu";
import { IsSavedMenu } from "./models/IsSavedMenu";

const savedMenu2DB = async () => {
  const now = getTimeJST();
  const year = now.get("year");
  const month = now.get("month") + 1;

  const isSavedMenu = await IsSavedMenu.isSavedTargetMonth({ year, month });

  if (isSavedMenu) {
    infomationForCLI(`${year}/${month} is Already Saved !`);
    return;
  }

  const PDFPath = `https://www.kure-nct.ac.jp/life/dorm/pdf/${month
    .toString()
    .padStart(2, "0")}_menu.pdf`;

  if (!(await isLinkAlived(PDFPath))) {
    errorForCLI("Unexisted Menu File Now");
    return;
  }

  const parsedMenuData = await parsePDF2Json(PDFPath);

  for (const date of Object.keys(parsedMenuData)) {
    const { morning, lunch, dinner } = parsedMenuData[date];
    const [menu_month, menu_date] = date.split(/月|日/);

    await Menu.create({
      year,
      month: menu_month,
      date: menu_date,
      morning,
      lunch,
      dinner,
    });
  }

  await IsSavedMenu.create({ year, month, isSaved: true });

  infomationForCLI(`${year}/${month} is Saved Now !`);

  return;
};

export default savedMenu2DB;
