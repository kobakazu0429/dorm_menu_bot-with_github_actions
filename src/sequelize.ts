import { Sequelize } from "sequelize-typescript";

import { DB_CONFIG } from "./env";

import { Menu } from "./models/Menu";
import { IsSavedMenu } from "./models/IsSavedMenu";

const sequelize = new Sequelize({
  dialect: "mysql",
  host: DB_CONFIG.HOST,
  database: DB_CONFIG.DATABASE,
  username: DB_CONFIG.USER,
  password: DB_CONFIG.PASSWORD,
  port: DB_CONFIG.DB_PORT,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  logging: true,
});

sequelize.addModels([Menu, IsSavedMenu]);

export default sequelize;
