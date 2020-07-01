import { config } from "dotenv";

config();

export const DB_CONFIG = {
  USER: process.env.DB_USER || "",
  HOST: process.env.DB_HOST || "",
  DATABASE: process.env.DB_DATABASE || "",
  PASSWORD: process.env.DB_PASSWORD || "",
  DB_PORT: Number(process.env.DB_PORT) || 0,
};
