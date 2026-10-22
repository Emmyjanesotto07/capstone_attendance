import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define(
  "User",
  {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    CompleteName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    employeeBiometricId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    contactNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emergencyContact: {
      type: DataTypes.STRING,
      allowNull: true
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    position: {
      type: DataTypes.STRING,
      allowNull: true
    },
    employeeCategory: {
      type: DataTypes.ENUM("regular", "cos", "job_order"),
      allowNull: true
    },
    shiftSchedule: {
      type: DataTypes.STRING,
      allowNull: true
    },
    flexiTime: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    campus: {
      type: DataTypes.STRING,
      allowNull: false
    },  
    college: {
      type: DataTypes.STRING,
      allowNull: false
    },  
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "staff"
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    token: {
      type: DataTypes.STRING,
      allowNull: true
    },
    profilePicturePath: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isBanned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    banReason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastAdminMessage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    timestamps: false
  }
);

export default User;