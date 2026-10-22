import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { DataTypes } from "sequelize";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import accountingRoutes from "./routes/accountingRoutes.js";
import sequelize from "./config/database.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configuredFrontendOrigin = String(process.env.FRONTEND_ORIGIN || "").trim();
const configuredLanIp = String(process.env.LAN_IP || "").trim();

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);

if (configuredFrontendOrigin) {
  allowedOrigins.add(configuredFrontendOrigin);
}

if (configuredLanIp) {
  allowedOrigins.add(`http://${configuredLanIp}:5173`);
}

const isPrivateLanHost = (host) => {
  return (
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
};

const corsOriginHandler = (origin, callback) => {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (allowedOrigins.has(origin)) {
    callback(null, true);
    return;
  }

  try {
    const url = new URL(origin);
    const isAllowedPort = url.port === "5173" || url.port === "4173";

    if (isAllowedPort && isPrivateLanHost(url.hostname)) {
      callback(null, true);
      return;
    }
  } catch {
  }

  callback(new Error("Not allowed by CORS"));
};

const app = express();

/* ENABLE CORS */
app.use(cors({
  origin: corsOriginHandler,
  credentials: true,
  methods: ["GET","POST","PUT","DELETE"],
  allowedHeaders: ["Content-Type","Authorization"]
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/accounting", accountingRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large." });
    }

    return res.status(400).json({ message: err.message || "Upload error." });
  }

  if (err) {
    return res.status(400).json({ message: err.message || "Request failed." });
  }

  next();
});

const PORT = process.env.PORT || 3001;

const ensureSalaryRecordColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = "SalaryRecords";

  let columns;

  try {
    columns = await queryInterface.describeTable(tableName);
  } catch {
    return;
  }

  const missingColumns = [
    {
      name: "employeeCategory",
      definition: {
        type: DataTypes.ENUM("regular", "cos", "job_order"),
        allowNull: false,
        defaultValue: "regular"
      }
    },
    {
      name: "salaryGrade",
      definition: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      name: "salaryGradeAmount",
      definition: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      name: "workingDays",
      definition: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      name: "presentDays",
      definition: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      name: "absentDays",
      definition: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      name: "holidayDays",
      definition: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      name: "dailyRate",
      definition: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      name: "pagibigDeduction",
      definition: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      name: "gsisDeduction",
      definition: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      name: "autoGovernmentDeductions",
      definition: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }
  ];

  for (const column of missingColumns) {
    if (!columns[column.name]) {
      await queryInterface.addColumn(tableName, column.name, column.definition);
    }
  }
};

const ensureSalaryProfileColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = "SalaryProfiles";

  let columns;

  try {
    columns = await queryInterface.describeTable(tableName);
  } catch {
    return;
  }

  const missingColumns = [
    {
      name: "defaultPagibigDeduction",
      definition: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      name: "defaultGsisDeduction",
      definition: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      name: "autoGovernmentDeductions",
      definition: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }
  ];

  for (const column of missingColumns) {
    if (!columns[column.name]) {
      await queryInterface.addColumn(tableName, column.name, column.definition);
    }
  }
};

const ensureUserEmploymentColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = "Users";
  const columns = await queryInterface.describeTable(tableName);
  const employmentColumns = [
    ["contactNumber", { type: DataTypes.STRING, allowNull: true }],
    ["emergencyContact", { type: DataTypes.STRING, allowNull: true }],
    ["department", { type: DataTypes.STRING, allowNull: true }],
    ["position", { type: DataTypes.STRING, allowNull: true }],
    ["employeeCategory", { type: DataTypes.ENUM("regular", "cos", "job_order"), allowNull: true }],
    ["shiftSchedule", { type: DataTypes.STRING, allowNull: true }],
    ["flexiTime", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }]
  ];

  for (const [name, definition] of employmentColumns) {
    if (!columns[name]) {
      await queryInterface.addColumn(tableName, name, definition);
    }
  }
};

const startServer = async () => {
  try {
    await sequelize.authenticate();

    const syncMode = String(process.env.DB_SYNC_MODE || "safe").toLowerCase();

    if (syncMode === "alter") {
      await sequelize.sync({ alter: true });
    } else if (syncMode === "force") {
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync();
    }

    await ensureSalaryRecordColumns();
    await ensureSalaryProfileColumns();
    await ensureUserEmploymentColumns();

    app.listen(PORT, () => {
      console.log("Server running on port", PORT);
    });
  } catch (err) {
    console.error("Database startup error:", err.message);
    process.exit(1);
  }
};

startServer();