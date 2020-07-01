import { Router } from "express";
import { WhereOptions } from "sequelize/types";
import { Menu } from "../models/Menu";

export const menus = Router();

menus.get("", async (req, res, next) => {
  try {
    const { year, month, date } = req.query;

    if (year || month || date) {
      const where: WhereOptions = {};

      if (year) where.year = Number(year);
      if (month) where.month = Number(month);
      if (date) where.date = Number(date);

      const result = await Menu.findAll({ where });
      res.json(result);
    } else {
      res.json(await Menu.findAll());
    }
  } catch (e) {
    next(e);
  }
});

// menus.post("/", async (req, res, next) => {
//   try {
//     const result = await Menu.create(req.body);
//     res.status(201).json(result);
//   } catch (e) {
//     next(e);
//   }
// });
