import * as moment from "moment-timezone";

const dayList = ["日", "月", "火", "水", "木", "金", "土"];

export function getTimeJST() {
  const now = moment().utc().add(9, "h");
  const year = now.get("year");
  const month = now.get("month") + 1;
  const mm = month.toString().padStart(2, "0");
  const date = now.get("date");
  const day = now.get("day");
  const dayJp = dayList[day];

  return {
    year,
    month,
    mm,
    date,
    day,
    dayJp,
  };
}
