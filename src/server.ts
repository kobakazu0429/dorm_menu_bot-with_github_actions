import { createServer } from "http";
import { scheduleJob } from "node-schedule";

import { app } from "./app";
import sequelize from "./sequelize";
import savedMenu2DB from "./savedMenu2DB";

const port = process.env.PORT || 3000;

(async () => {
  await sequelize.sync();

  createServer(app).listen(port, async () => {
    console.info(`You can see here: http://localhost:${port}`);

    scheduleJob(
      {
        second: 0,
        minute: 0,
        hour: 0,
      },
      async () => {
        await savedMenu2DB();
      }
    );
  });
})();
