import * as moment from "moment-timezone";

export function getTimeJST() {
  const now = moment().utc().add(9, "h");
  const year = now.get("year");
  const month = now.get("month") + 1;
  const mm = month.toString().padStart(2, "0");
  const date = now.get("date");
  const day = now.get("day");
  const hour = now.get("hour");

  return {
    year,
    month,
    mm,
    date,
    day,
    hour,
  };
}
