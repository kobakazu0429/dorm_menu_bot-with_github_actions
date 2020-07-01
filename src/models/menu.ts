import {
  Column,
  CreatedAt,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript";

@Table({ modelName: "menus" })
export class Menu extends Model<Menu> {
  @Column public year!: number;
  @Column public month!: number;
  @Column public date!: number;
  @Column public morning!: string;
  @Column public lunch!: string;
  @Column public dinner!: string;

  @CreatedAt @Column public readonly createdAt!: Date;
  @UpdatedAt @Column public readonly updatedAt!: Date;
}
