import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const StaffNotification = sequelize.define(
  "StaffNotification",
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    deduplicationKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    tableName: "StaffNotifications",
    timestamps: true
  }
);

export default StaffNotification;