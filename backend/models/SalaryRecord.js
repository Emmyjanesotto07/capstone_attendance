import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const SalaryRecord = sequelize.define(
  "SalaryRecord",
  {
    employeeName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    employeeBiometricId: {
      type: DataTypes.STRING,
      allowNull: true
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
    workingDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    presentDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    absentDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    holidayDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    dailyRate: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    campus: {
      type: DataTypes.STRING,
      allowNull: false
    },
    payPeriodStart: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    payPeriodEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    basicSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    allowance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    overtimeHours: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0
    },
    overtimeRate: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    overtimePay: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    taxDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    sssDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    gsisDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    philhealthDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    pagibigDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    otherDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    autoGovernmentDeductions: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    grossSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    totalDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    netSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("pending", "paid"),
      allowNull: false,
      defaultValue: "pending"
    },
    processedBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    timestamps: true
  }
);

export default SalaryRecord;
