import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const AttendanceRecord = sequelize.define(
  "AttendanceRecord",
  {
    employeeBiometricId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    employeeName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attendanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    timeIn: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timeOut: {
      type: DataTypes.STRING,
      allowNull: true
    },
    amTimeIn: {
      type: DataTypes.STRING,
      allowNull: true
    },
    amTimeOut: {
      type: DataTypes.STRING,
      allowNull: true
    },
    noonTimeOut: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pmTimeIn: {
      type: DataTypes.STRING,
      allowNull: true
    },
    noonTimeIn: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pmTimeOut: {
      type: DataTypes.STRING,
      allowNull: true
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sourceFileName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    matchedUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    timestamps: true
  }
);

export default AttendanceRecord;
