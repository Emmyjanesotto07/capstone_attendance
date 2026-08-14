import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Message = sequelize.define(
  "Message",
  {
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachmentName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attachmentMimeType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attachmentKind: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attachmentPath: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isSeen: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    timestamps: true
  }
);

export default Message;
