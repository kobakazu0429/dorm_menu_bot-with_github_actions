import { Router } from "express";
import { WhereOptions } from "sequelize/types";
import { IsSavedMenu } from "../models/IsSavedMenu";

export const is_saved_menu = Router();

is_saved_menu.get("", async (req, res, next) => {
  try {
    const { year, month } = req.query;

    if (year || month) {
      const where: WhereOptions = {};

      if (year) where.year = Number(year);
      if (month) where.month = Number(month);

      const result = await IsSavedMenu.findAll({ where });
      res.json(result);
    } else {
      res.json(await IsSavedMenu.findAll());
    }
  } catch (e) {
    next(e);
  }
});

// is_saved_menu.post("/", async (req, res, next) => {
//   try {
//     const menu = await IsSavedMenu.create(req.body);
//     res.status(201).json(menu);
//   } catch (e) {
//     next(e);
//   }
// });
