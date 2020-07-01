import moment = require("moment-timezone");

export const getTimeJST = () => {
  return moment().utc().add(9, "h");
};
