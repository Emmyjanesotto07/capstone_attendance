import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const SalaryProfile = sequelize.define(
  "SalaryProfile",
  {
    employeeBiometricId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    employeeName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    employeeCategory: {
      type: DataTypes.ENUM("regular", "cos", "job_order"),
      allowNull: false,
      defaultValue: "regular"
    },
    salaryGrade: {
      type: DataTypes.STRING,
      allowNull: true
    },
    salaryGradeAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    dailyRate: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    defaultAllowance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    defaultTaxDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    defaultSssDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    defaultGsisDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    defaultPhilhealthDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    defaultPagibigDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    defaultOtherDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    autoGovernmentDeductions: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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

export default SalaryProfile;
