import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const AccountingEntry = sequelize.define(
  "AccountingEntry",
  {
    type: {
      type: DataTypes.ENUM("income", "expense"),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    entryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    campus: {
      type: DataTypes.STRING,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    timestamps: true
  }
);

export default AccountingEntry;
