import {
  Column,
  CreatedAt,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript";

@Table({ modelName: "is_saved_menu" })
export class IsSavedMenu extends Model<IsSavedMenu> {
  public static async isSavedTargetMonth(options: {
    year: number;
    month: number;
  }) {
    const where = {
      year: options.year,
      month: options.month,
    };
    const result = await this.findOne({ where });

    if (result === null) return false;

    return result.isSaved;
  }

  @Column public year!: number;
  @Column public month!: number;
  @Column public isSaved!: boolean;

  @CreatedAt @Column public readonly createdAt!: Date;
  @UpdatedAt @Column public readonly updatedAt!: Date;
}
