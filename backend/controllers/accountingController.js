import { Op } from "sequelize";
import AccountingEntry from "../models/AccountingEntry.js";
import SalaryRecord from "../models/SalaryRecord.js";
import SalaryProfile from "../models/SalaryProfile.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import User from "../models/User.js";

const VALID_CAMPUSES = [
  "tourism",
  "mayor's office",
  "hrmo",
  "sb",
  "vice mayor office",
  "mpdo",
  "mswdo",
  "meo",
  "mao",
  "budget",
  "malasakit",
  "gad",
  "bac",
  "treasurer",
  "accounting",
  "masso",
  "gso",
  "mcr"
];
const VALID_TYPES = ["income", "expense"];
const VALID_SALARY_STATUSES = ["pending", "paid"];
const VALID_EMPLOYEE_CATEGORIES = ["regular", "cos", "job_order"];

const normalizeCampusValue = (value) => {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

  if (normalized === "mayors office") {
    return "mayor's office";
  }

  return normalized;
};

const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseCount = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor(parsed));
};

const roundMoney = (value) => Number((Number(value || 0)).toFixed(2));

const computeSssEmployeeShare = (grossSalary) => {
  const gross = Math.max(0, Number(grossSalary || 0));
  const employeeShare = gross * 0.045;
  return roundMoney(Math.min(1350, Math.max(180, employeeShare)));
};

const computeGsisEmployeeShare = (grossSalary) => {
  const gross = Math.max(0, Number(grossSalary || 0));
  return roundMoney(gross * 0.09);
};

const computePhilhealthEmployeeShare = (grossSalary) => {
  const gross = Math.max(0, Number(grossSalary || 0));
  const contributionBase = Math.min(100000, Math.max(10000, gross));
  return roundMoney(contributionBase * 0.025);
};

const computePagibigEmployeeShare = (grossSalary) => {
  const gross = Math.max(0, Number(grossSalary || 0));
  return roundMoney(Math.min(100, gross * 0.02));
};

const computeMonthlyWithholdingTax = (taxableIncome) => {
  const taxable = Math.max(0, Number(taxableIncome || 0));

  if (taxable <= 20833) {
    return 0;
  }

  if (taxable <= 33333) {
    return roundMoney((taxable - 20833) * 0.15);
  }

  if (taxable <= 66667) {
    return roundMoney(1875 + (taxable - 33333) * 0.2);
  }

  if (taxable <= 166667) {
    return roundMoney(8541.8 + (taxable - 66667) * 0.25);
  }

  if (taxable <= 666667) {
    return roundMoney(33541.8 + (taxable - 166667) * 0.3);
  }

  return roundMoney(183541.8 + (taxable - 666667) * 0.35);
};

const buildMonthRange = (monthRaw, yearRaw) => {
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  const hasValidMonth = Number.isInteger(month) && month >= 1 && month <= 12;
  const hasValidYear = Number.isInteger(year) && year >= 1900 && year <= 9999;

  if (!hasValidMonth || !hasValidYear) {
    return null;
  }

  const monthText = String(month).padStart(2, "0");
  const current = `${year}-${monthText}`;
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const nextYear = nextMonthDate.getUTCFullYear();
  const nextMonth = String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0");

  return {
    start: `${current}-01`,
    endExclusive: `${nextYear}-${nextMonth}-01`
  };
};

const getRequesterScope = async (requesterId) => {
  const requester = await User.findByPk(requesterId, {
    attributes: ["id", "role", "campus"]
  });

  if (!requester) {
    return { requester: null, role: "", campus: "" };
  }

  return {
    requester,
    role: String(requester.role || "").trim().toLowerCase(),
    campus: String(requester.campus || "").trim().toLowerCase()
  };
};

const buildCampusFilter = (scope, requestedCampus) => {

  const normalized = normalizeCampusValue(requestedCampus);

  if (!normalized) {
    return null;
  }

  return VALID_CAMPUSES.includes(normalized) ? normalized : "__invalid__";
};

const resolveCampusForWrite = (scope, bodyCampus) => {
  const campus = normalizeCampusValue(bodyCampus);

  if (!VALID_CAMPUSES.includes(campus)) {
    return null;
  }

  return campus;
};

const computeAttendanceCounts = async ({ employeeBiometricId, payPeriodStart, payPeriodEnd }) => {
  if (!employeeBiometricId || !payPeriodStart || !payPeriodEnd) {
    return {
      workingDays: 0,
      presentDays: 0,
      absentDays: 0,
      holidayDays: 0
    };
  }

  const startDate = new Date(`${payPeriodStart}T00:00:00.000Z`);
  const endDate = new Date(`${payPeriodEnd}T00:00:00.000Z`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return {
      workingDays: 0,
      presentDays: 0,
      absentDays: 0,
      holidayDays: 0
    };
  }

  const records = await AttendanceRecord.findAll({
    where: {
      employeeBiometricId,
      attendanceDate: {
        [Op.gte]: payPeriodStart,
        [Op.lte]: payPeriodEnd
      }
    },
    attributes: ["attendanceDate"]
  });

  const presentDates = new Set(records.map((record) => String(record.attendanceDate)));
  const presentDays = presentDates.size;

  let workingDays = 0;

  for (let cursor = new Date(startDate); cursor <= endDate; cursor = new Date(cursor.getTime() + 24 * 3600 * 1000)) {
    const day = cursor.getUTCDay();

    if (day !== 0 && day !== 6) {
      workingDays += 1;
    }
  }

  const absentDays = Math.max(0, workingDays - presentDays);

  return {
    workingDays,
    presentDays,
    absentDays,
    holidayDays: 0
  };
};

const computeSalaryBreakdown = (payload, fallback = {}) => {
  const employeeCategory = String(payload?.employeeCategory ?? fallback.employeeCategory ?? "regular").trim().toLowerCase();
  const salaryGrade = String(payload?.salaryGrade ?? fallback.salaryGrade ?? "").trim().toUpperCase();
  const salaryGradeAmount = Math.max(0, parseNumber(payload?.salaryGradeAmount ?? fallback.salaryGradeAmount) || 0);
  const workingDays = parseCount(payload?.workingDays ?? fallback.workingDays);
  const presentDays = parseCount(payload?.presentDays ?? fallback.presentDays);
  const absentDays = parseCount(payload?.absentDays ?? fallback.absentDays);
  const holidayDays = parseCount(payload?.holidayDays ?? fallback.holidayDays);
  const dailyRate = Math.max(0, parseNumber(payload?.dailyRate ?? fallback.dailyRate) || 0);
  const allowance = Math.max(0, parseNumber(payload?.allowance ?? fallback.allowance) || 0);
  const overtimeHours = Math.max(0, parseNumber(payload?.overtimeHours ?? fallback.overtimeHours) || 0);
  const overtimeRate = Math.max(0, parseNumber(payload?.overtimeRate ?? fallback.overtimeRate) || 0);
  const autoGovernmentDeductions = payload?.autoGovernmentDeductions !== undefined
    ? Boolean(payload.autoGovernmentDeductions)
    : fallback.autoGovernmentDeductions !== undefined
      ? Boolean(fallback.autoGovernmentDeductions)
      : true;

  let taxDeduction = Math.max(0, parseNumber(payload?.taxDeduction ?? fallback.taxDeduction) || 0);
  let sssDeduction = Math.max(0, parseNumber(payload?.sssDeduction ?? fallback.sssDeduction) || 0);
  let gsisDeduction = Math.max(0, parseNumber(payload?.gsisDeduction ?? fallback.gsisDeduction) || 0);
  let philhealthDeduction = Math.max(0, parseNumber(payload?.philhealthDeduction ?? fallback.philhealthDeduction) || 0);
  let pagibigDeduction = Math.max(0, parseNumber(payload?.pagibigDeduction ?? fallback.pagibigDeduction) || 0);
  const otherDeduction = Math.max(0, parseNumber(payload?.otherDeduction ?? fallback.otherDeduction) || 0);

  if (!VALID_EMPLOYEE_CATEGORIES.includes(employeeCategory)) {
    return { error: "Employee category must be regular, cos, or job_order." };
  }

  let basicSalary = 0;

  if (employeeCategory === "regular") {
    if (salaryGradeAmount <= 0) {
      return { error: "Regular employee requires salary grade amount greater than 0." };
    }

    basicSalary = salaryGradeAmount;
  }

  if (employeeCategory === "cos") {
    if (salaryGradeAmount <= 0) {
      return { error: "COS employee requires salary grade amount greater than 0." };
    }

    if (workingDays <= 0) {
      return { error: "COS employee requires working days greater than 0." };
    }

    const payableDays = Math.max(0, workingDays - absentDays - holidayDays);
    basicSalary = Number(((salaryGradeAmount / workingDays) * payableDays).toFixed(2));
  }

  if (employeeCategory === "job_order") {
    if (dailyRate <= 0) {
      return { error: "Job order employee requires daily rate greater than 0." };
    }

    basicSalary = Number((dailyRate * presentDays).toFixed(2));
  }

  const overtimePay = Number((overtimeHours * overtimeRate).toFixed(2));
  const grossSalary = Number((basicSalary + allowance + overtimePay).toFixed(2));

  if (autoGovernmentDeductions) {
    if (employeeCategory === "regular") {
      gsisDeduction = computeGsisEmployeeShare(grossSalary);
      sssDeduction = 0;
    } else {
      sssDeduction = computeSssEmployeeShare(grossSalary);
      gsisDeduction = 0;
    }
    philhealthDeduction = computePhilhealthEmployeeShare(grossSalary);
    pagibigDeduction = computePagibigEmployeeShare(grossSalary);
    const taxableIncome = Math.max(0, grossSalary - sssDeduction - gsisDeduction - philhealthDeduction - pagibigDeduction);
    taxDeduction = computeMonthlyWithholdingTax(taxableIncome);
  }

  const totalDeduction = Number((taxDeduction + sssDeduction + gsisDeduction + philhealthDeduction + pagibigDeduction + otherDeduction).toFixed(2));
  const netSalary = Number((grossSalary - totalDeduction).toFixed(2));

  return {
    computation: {
      employeeCategory,
      salaryGrade: salaryGrade || null,
      salaryGradeAmount: Number(salaryGradeAmount.toFixed(2)),
      workingDays,
      presentDays,
      absentDays,
      holidayDays,
      dailyRate: Number(dailyRate.toFixed(2)),
    autoGovernmentDeductions,
    basicSalary: Number(basicSalary.toFixed(2)),
    allowance: Number(allowance.toFixed(2)),
    overtimeHours: Number(overtimeHours.toFixed(2)),
    overtimeRate: Number(overtimeRate.toFixed(2)),
    overtimePay,
    taxDeduction: Number(taxDeduction.toFixed(2)),
    sssDeduction: Number(sssDeduction.toFixed(2)),
    gsisDeduction: Number(gsisDeduction.toFixed(2)),
    philhealthDeduction: Number(philhealthDeduction.toFixed(2)),
    pagibigDeduction: Number(pagibigDeduction.toFixed(2)),
    otherDeduction: Number(otherDeduction.toFixed(2)),
    grossSalary,
    totalDeduction,
    netSalary
    }
  };
};

export const getAccountingEntries = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const campusFilter = buildCampusFilter(scope, req.query.campus ?? req.query.department);

    if (campusFilter === "__invalid__") {
      return res.status(400).json({ message: "Invalid office filter." });
    }

    const monthRange = req.query.month && req.query.year
      ? buildMonthRange(req.query.month, req.query.year)
      : null;

    if ((req.query.month || req.query.year) && !monthRange) {
      return res.status(400).json({ message: "Invalid month/year filter." });
    }

    const where = {};

    if (campusFilter) {
      where.campus = campusFilter;
    }

    if (monthRange) {
      where.entryDate = {
        [Op.gte]: monthRange.start,
        [Op.lt]: monthRange.endExclusive
      };
    }

    const typeFilter = String(req.query.type || "").trim().toLowerCase();

    if (typeFilter) {
      if (!VALID_TYPES.includes(typeFilter)) {
        return res.status(400).json({ message: "Invalid type filter." });
      }

      where.type = typeFilter;
    }

    const searchFilter = String(req.query.search || "").trim();

    if (searchFilter) {
      where[Op.or] = [
        {
          category: {
            [Op.like]: `%${searchFilter}%`
          }
        },
        {
          description: {
            [Op.like]: `%${searchFilter}%`
          }
        }
      ];
    }

    const entries = await AccountingEntry.findAll({
      where,
      order: [["entryDate", "DESC"], ["id", "DESC"]]
    });

    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createAccountingEntry = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const type = String(req.body?.type || "").trim().toLowerCase();
    const category = String(req.body?.category || "").trim();
    const description = String(req.body?.description || "").trim();
    const amount = parseNumber(req.body?.amount);
    const entryDate = String(req.body?.entryDate || "").trim();

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: "Entry type must be income or expense." });
    }

    if (!category) {
      return res.status(400).json({ message: "Category is required." });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0." });
    }

    if (!entryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ message: "Entry date must be YYYY-MM-DD." });
    }

    const campus = normalizeCampusValue(req.body?.campus ?? req.body?.department ?? "");

    if (!VALID_CAMPUSES.includes(campus)) {
      return res.status(400).json({ message: "Office is required and must be valid." });
    }

    const created = await AccountingEntry.create({
      type,
      category,
      description: description || null,
      amount,
      entryDate,
      campus,
      createdBy: req.user.id
    });

    res.status(201).json({ entry: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateAccountingEntry = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const entry = await AccountingEntry.findByPk(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: "Accounting entry not found." });
    }

    const type = String(req.body?.type || entry.type).trim().toLowerCase();
    const category = String(req.body?.category || entry.category).trim();
    const description = String(req.body?.description ?? entry.description ?? "").trim();
    const amount = parseNumber(req.body?.amount ?? entry.amount);
    const entryDate = String(req.body?.entryDate || entry.entryDate).trim();

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: "Entry type must be income or expense." });
    }

    if (!category) {
      return res.status(400).json({ message: "Category is required." });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0." });
    }

    if (!entryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ message: "Entry date must be YYYY-MM-DD." });
    }

    const campus = normalizeCampusValue(req.body?.campus ?? req.body?.department ?? entry.campus);

    if (!VALID_CAMPUSES.includes(campus)) {
      return res.status(400).json({ message: "Office must be a valid option." });
    }

    entry.type = type;
    entry.category = category;
    entry.description = description || null;
    entry.amount = amount;
    entry.entryDate = entryDate;
    entry.campus = campus;
    await entry.save();

    res.json({ entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteAccountingEntry = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const entry = await AccountingEntry.findByPk(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: "Accounting entry not found." });
    }

    await entry.destroy();
    res.json({ message: "Entry deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAccountingSummary = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const monthRange = buildMonthRange(req.query.month, req.query.year);

    if (!monthRange) {
      return res.status(400).json({ message: "Valid month and year are required for summary." });
    }

    const campusFilter = buildCampusFilter(scope, req.query.campus ?? req.query.department);

    if (campusFilter === "__invalid__") {
      return res.status(400).json({ message: "Invalid office filter." });
    }

    const where = {
      entryDate: {
        [Op.gte]: monthRange.start,
        [Op.lt]: monthRange.endExclusive
      }
    };

    if (campusFilter) {
      where.campus = campusFilter;
    }

    const entries = await AccountingEntry.findAll({ where });

    const totals = entries.reduce(
      (accumulator, entry) => {
        const amount = parseNumber(entry.amount) || 0;

        if (entry.type === "income") {
          accumulator.income += amount;
        } else {
          accumulator.expense += amount;
        }

        return accumulator;
      },
      { income: 0, expense: 0 }
    );

    const income = Number(totals.income.toFixed(2));
    const expense = Number(totals.expense.toFixed(2));
    const balance = Number((income - expense).toFixed(2));

    res.json({
      month: Number(req.query.month),
      year: Number(req.query.year),
      campus: campusFilter || "all",
      income,
      expense,
      balance,
      entryCount: entries.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const previewSalaryComputation = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const result = computeSalaryBreakdown(req.body || {});

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    const computation = result.computation;

    res.json({ computation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSalaryProfiles = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const campusFilter = buildCampusFilter(scope, req.query.campus ?? req.query.department);

    if (campusFilter === "__invalid__") {
      return res.status(400).json({ message: "Invalid office filter." });
    }

    const where = {};

    if (campusFilter) {
      where.campus = campusFilter;
    }

    const profiles = await SalaryProfile.findAll({
      where,
      order: [["employeeName", "ASC"], ["id", "DESC"]]
    });

    res.json({ profiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createSalaryProfile = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const employeeBiometricId = String(req.body?.employeeBiometricId || "").trim();
    const employeeName = String(req.body?.employeeName || "").trim();
    const employeeCategory = String(req.body?.employeeCategory || "").trim().toLowerCase();
    const salaryGrade = String(req.body?.salaryGrade || "").trim().toUpperCase();
    const salaryGradeAmount = Math.max(0, parseNumber(req.body?.salaryGradeAmount) || 0);
    const dailyRate = Math.max(0, parseNumber(req.body?.dailyRate) || 0);
    const defaultAllowance = Math.max(0, parseNumber(req.body?.defaultAllowance) || 0);
    const defaultTaxDeduction = Math.max(0, parseNumber(req.body?.defaultTaxDeduction) || 0);
    const defaultSssDeduction = Math.max(0, parseNumber(req.body?.defaultSssDeduction) || 0);
    const defaultGsisDeduction = Math.max(0, parseNumber(req.body?.defaultGsisDeduction) || 0);
    const defaultPhilhealthDeduction = Math.max(0, parseNumber(req.body?.defaultPhilhealthDeduction) || 0);
    const defaultPagibigDeduction = Math.max(0, parseNumber(req.body?.defaultPagibigDeduction) || 0);
    const defaultOtherDeduction = Math.max(0, parseNumber(req.body?.defaultOtherDeduction) || 0);
    const autoGovernmentDeductions = req.body?.autoGovernmentDeductions !== undefined
      ? Boolean(req.body.autoGovernmentDeductions)
      : true;

    if (!employeeBiometricId) {
      return res.status(400).json({ message: "Employee biometric ID is required." });
    }

    if (!employeeName) {
      return res.status(400).json({ message: "Employee name is required." });
    }

    if (!VALID_EMPLOYEE_CATEGORIES.includes(employeeCategory)) {
      return res.status(400).json({ message: "Employee category must be regular, cos, or job_order." });
    }

    if (["regular", "cos"].includes(employeeCategory) && salaryGradeAmount <= 0) {
      return res.status(400).json({ message: "Salary grade amount must be greater than 0 for regular/COS." });
    }

    if (employeeCategory === "job_order" && dailyRate <= 0) {
      return res.status(400).json({ message: "Daily rate must be greater than 0 for job order." });
    }

    const campus = resolveCampusForWrite(scope, req.body?.campus ?? req.body?.department);

    if (!campus) {
      return res.status(400).json({ message: "Office is required and must be valid." });
    }

    const existing = await SalaryProfile.findOne({ where: { employeeBiometricId } });

    if (existing) {
      return res.status(400).json({ message: "Salary profile already exists for this biometric ID." });
    }

    const profile = await SalaryProfile.create({
      employeeBiometricId,
      employeeName,
      employeeCategory,
      salaryGrade: salaryGrade || null,
      salaryGradeAmount,
      dailyRate,
      defaultAllowance,
      defaultTaxDeduction,
      defaultSssDeduction,
      defaultGsisDeduction,
      defaultPhilhealthDeduction,
      defaultPagibigDeduction,
      defaultOtherDeduction,
      autoGovernmentDeductions,
      campus,
      createdBy: req.user.id
    });

    res.status(201).json({ profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateSalaryProfile = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const profile = await SalaryProfile.findByPk(req.params.id);

    if (!profile) {
      return res.status(404).json({ message: "Salary profile not found." });
    }

    const employeeName = String(req.body?.employeeName || profile.employeeName).trim();
    const employeeCategory = String(req.body?.employeeCategory || profile.employeeCategory).trim().toLowerCase();
    const salaryGrade = String(req.body?.salaryGrade ?? profile.salaryGrade ?? "").trim().toUpperCase();
    const salaryGradeAmount = Math.max(0, parseNumber(req.body?.salaryGradeAmount ?? profile.salaryGradeAmount) || 0);
    const dailyRate = Math.max(0, parseNumber(req.body?.dailyRate ?? profile.dailyRate) || 0);
    const defaultAllowance = Math.max(0, parseNumber(req.body?.defaultAllowance ?? profile.defaultAllowance) || 0);
    const defaultTaxDeduction = Math.max(0, parseNumber(req.body?.defaultTaxDeduction ?? profile.defaultTaxDeduction) || 0);
    const defaultSssDeduction = Math.max(0, parseNumber(req.body?.defaultSssDeduction ?? profile.defaultSssDeduction) || 0);
    const defaultGsisDeduction = Math.max(0, parseNumber(req.body?.defaultGsisDeduction ?? profile.defaultGsisDeduction) || 0);
    const defaultPhilhealthDeduction = Math.max(0, parseNumber(req.body?.defaultPhilhealthDeduction ?? profile.defaultPhilhealthDeduction) || 0);
    const defaultPagibigDeduction = Math.max(0, parseNumber(req.body?.defaultPagibigDeduction ?? profile.defaultPagibigDeduction) || 0);
    const defaultOtherDeduction = Math.max(0, parseNumber(req.body?.defaultOtherDeduction ?? profile.defaultOtherDeduction) || 0);
    const autoGovernmentDeductions = req.body?.autoGovernmentDeductions !== undefined
      ? Boolean(req.body.autoGovernmentDeductions)
      : Boolean(profile.autoGovernmentDeductions);

    if (!employeeName) {
      return res.status(400).json({ message: "Employee name is required." });
    }

    if (!VALID_EMPLOYEE_CATEGORIES.includes(employeeCategory)) {
      return res.status(400).json({ message: "Employee category must be regular, cos, or job_order." });
    }

    if (["regular", "cos"].includes(employeeCategory) && salaryGradeAmount <= 0) {
      return res.status(400).json({ message: "Salary grade amount must be greater than 0 for regular/COS." });
    }

    if (employeeCategory === "job_order" && dailyRate <= 0) {
      return res.status(400).json({ message: "Daily rate must be greater than 0 for job order." });
    }

    const campus = resolveCampusForWrite(scope, req.body?.campus ?? req.body?.department ?? profile.campus);

    if (!campus) {
      return res.status(400).json({ message: "Office must be a valid option." });
    }

    profile.employeeName = employeeName;
    profile.employeeCategory = employeeCategory;
    profile.salaryGrade = salaryGrade || null;
    profile.salaryGradeAmount = salaryGradeAmount;
    profile.dailyRate = dailyRate;
    profile.defaultAllowance = defaultAllowance;
    profile.defaultTaxDeduction = defaultTaxDeduction;
    profile.defaultSssDeduction = defaultSssDeduction;
    profile.defaultGsisDeduction = defaultGsisDeduction;
    profile.defaultPhilhealthDeduction = defaultPhilhealthDeduction;
    profile.defaultPagibigDeduction = defaultPagibigDeduction;
    profile.defaultOtherDeduction = defaultOtherDeduction;
    profile.autoGovernmentDeductions = autoGovernmentDeductions;
    profile.campus = campus;
    await profile.save();

    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteSalaryProfile = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const profile = await SalaryProfile.findByPk(req.params.id);

    if (!profile) {
      return res.status(404).json({ message: "Salary profile not found." });
    }

    await profile.destroy();
    res.json({ message: "Salary profile deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const autofillSalaryFromAttendance = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const employeeBiometricId = String(req.body?.employeeBiometricId || "").trim();
    const payPeriodStart = String(req.body?.payPeriodStart || "").trim();
    const payPeriodEnd = String(req.body?.payPeriodEnd || "").trim();

    if (!employeeBiometricId) {
      return res.status(400).json({ message: "Employee biometric ID is required." });
    }

    if (!payPeriodStart.match(/^\d{4}-\d{2}-\d{2}$/) || !payPeriodEnd.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ message: "Pay period dates must be YYYY-MM-DD." });
    }

    const profile = await SalaryProfile.findOne({ where: { employeeBiometricId } });

    if (!profile) {
      return res.status(404).json({ message: "Salary profile not found for this employee." });
    }

    const attendanceCounts = await computeAttendanceCounts({
      employeeBiometricId,
      payPeriodStart,
      payPeriodEnd
    });

    const suggested = {
      employeeName: profile.employeeName,
      employeeBiometricId: profile.employeeBiometricId,
      employeeCategory: profile.employeeCategory,
      salaryGrade: profile.salaryGrade,
      salaryGradeAmount: Number(profile.salaryGradeAmount || 0),
      dailyRate: Number(profile.dailyRate || 0),
      allowance: Number(profile.defaultAllowance || 0),
      taxDeduction: Number(profile.defaultTaxDeduction || 0),
      sssDeduction: Number(profile.defaultSssDeduction || 0),
      gsisDeduction: Number(profile.defaultGsisDeduction || 0),
      philhealthDeduction: Number(profile.defaultPhilhealthDeduction || 0),
      pagibigDeduction: Number(profile.defaultPagibigDeduction || 0),
      otherDeduction: Number(profile.defaultOtherDeduction || 0),
      autoGovernmentDeductions: Boolean(profile.autoGovernmentDeductions),
      campus: profile.campus,
      payPeriodStart,
      payPeriodEnd,
      ...attendanceCounts
    };

    const result = computeSalaryBreakdown(suggested);

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    res.json({
      profile,
      attendance: attendanceCounts,
      computation: result.computation,
      suggested
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSalaryRecords = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const campusFilter = buildCampusFilter(scope, req.query.campus ?? req.query.department);

    if (campusFilter === "__invalid__") {
      return res.status(400).json({ message: "Invalid office filter." });
    }

    const where = {};

    if (campusFilter) {
      where.campus = campusFilter;
    }

    const monthRange = req.query.month && req.query.year
      ? buildMonthRange(req.query.month, req.query.year)
      : null;

    if ((req.query.month || req.query.year) && !monthRange) {
      return res.status(400).json({ message: "Invalid month/year filter." });
    }

    if (monthRange) {
      where.payPeriodEnd = {
        [Op.gte]: monthRange.start,
        [Op.lt]: monthRange.endExclusive
      };
    }

    const searchFilter = String(req.query.search || "").trim();

    if (searchFilter) {
      where[Op.or] = [
        {
          employeeName: {
            [Op.like]: `%${searchFilter}%`
          }
        },
        {
          employeeBiometricId: {
            [Op.like]: `%${searchFilter}%`
          }
        }
      ];
    }

    const statusFilter = String(req.query.status || "").trim().toLowerCase();

    if (statusFilter) {
      if (!VALID_SALARY_STATUSES.includes(statusFilter)) {
        return res.status(400).json({ message: "Invalid salary status filter." });
      }

      where.status = statusFilter;
    }

    const records = await SalaryRecord.findAll({
      where,
      order: [["payPeriodEnd", "DESC"], ["id", "DESC"]]
    });

    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createSalaryRecord = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const employeeName = String(req.body?.employeeName || "").trim();
    const employeeBiometricId = String(req.body?.employeeBiometricId || "").trim();
    const payPeriodStart = String(req.body?.payPeriodStart || "").trim();
    const payPeriodEnd = String(req.body?.payPeriodEnd || "").trim();
    const status = String(req.body?.status || "pending").trim().toLowerCase();
    const employeeCategory = String(req.body?.employeeCategory || "").trim().toLowerCase();

    if (!employeeName) {
      return res.status(400).json({ message: "Employee name is required." });
    }

    if (!payPeriodStart.match(/^\d{4}-\d{2}-\d{2}$/) || !payPeriodEnd.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ message: "Pay period dates must be YYYY-MM-DD." });
    }

    if (!VALID_SALARY_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Salary status must be pending or paid." });
    }

    if (!VALID_EMPLOYEE_CATEGORIES.includes(employeeCategory)) {
      return res.status(400).json({ message: "Employee category must be regular, cos, or job_order." });
    }

    const bodyCampus = normalizeCampusValue(req.body?.campus || req.body?.department || "");
    const campus = bodyCampus;

    if (!VALID_CAMPUSES.includes(campus)) {
      return res.status(400).json({ message: "Office is required and must be valid." });
    }

    const result = computeSalaryBreakdown(req.body || {});

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    const computation = result.computation;

    const created = await SalaryRecord.create({
      employeeName,
      employeeBiometricId: employeeBiometricId || null,
      employeeCategory,
      campus,
      payPeriodStart,
      payPeriodEnd,
      ...computation,
      status,
      processedBy: req.user.id
    });

    res.status(201).json({ record: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateSalaryRecord = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const record = await SalaryRecord.findByPk(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "Salary record not found." });
    }

    const employeeName = String(req.body?.employeeName || record.employeeName).trim();
    const employeeBiometricId = String(req.body?.employeeBiometricId ?? record.employeeBiometricId ?? "").trim();
    const payPeriodStart = String(req.body?.payPeriodStart || record.payPeriodStart).trim();
    const payPeriodEnd = String(req.body?.payPeriodEnd || record.payPeriodEnd).trim();
    const status = String(req.body?.status || record.status).trim().toLowerCase();
    const employeeCategory = String(req.body?.employeeCategory || record.employeeCategory || "regular").trim().toLowerCase();

    if (!employeeName) {
      return res.status(400).json({ message: "Employee name is required." });
    }

    if (!payPeriodStart.match(/^\d{4}-\d{2}-\d{2}$/) || !payPeriodEnd.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ message: "Pay period dates must be YYYY-MM-DD." });
    }

    if (!VALID_SALARY_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Salary status must be pending or paid." });
    }

    if (!VALID_EMPLOYEE_CATEGORIES.includes(employeeCategory)) {
      return res.status(400).json({ message: "Employee category must be regular, cos, or job_order." });
    }

    const requestedCampus = normalizeCampusValue(req.body?.campus || req.body?.department || record.campus);
    const campus = requestedCampus;

    if (!VALID_CAMPUSES.includes(campus)) {
      return res.status(400).json({ message: "Office must be a valid option." });
    }

    const result = computeSalaryBreakdown(req.body || {}, {
      employeeCategory: record.employeeCategory,
      salaryGrade: record.salaryGrade,
      salaryGradeAmount: record.salaryGradeAmount,
      workingDays: record.workingDays,
      presentDays: record.presentDays,
      absentDays: record.absentDays,
      holidayDays: record.holidayDays,
      dailyRate: record.dailyRate,
      autoGovernmentDeductions: record.autoGovernmentDeductions,
      allowance: record.allowance,
      overtimeHours: record.overtimeHours,
      overtimeRate: record.overtimeRate,
      taxDeduction: record.taxDeduction,
      sssDeduction: record.sssDeduction,
      gsisDeduction: record.gsisDeduction,
      philhealthDeduction: record.philhealthDeduction,
      pagibigDeduction: record.pagibigDeduction,
      otherDeduction: record.otherDeduction
    });

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    const computation = result.computation;

    record.employeeName = employeeName;
    record.employeeBiometricId = employeeBiometricId || null;
    record.employeeCategory = employeeCategory;
    record.campus = campus;
    record.payPeriodStart = payPeriodStart;
    record.payPeriodEnd = payPeriodEnd;
    record.status = status;
    record.basicSalary = computation.basicSalary;
    record.allowance = computation.allowance;
    record.overtimeHours = computation.overtimeHours;
    record.overtimeRate = computation.overtimeRate;
    record.overtimePay = computation.overtimePay;
    record.taxDeduction = computation.taxDeduction;
    record.sssDeduction = computation.sssDeduction;
    record.gsisDeduction = computation.gsisDeduction;
    record.philhealthDeduction = computation.philhealthDeduction;
    record.pagibigDeduction = computation.pagibigDeduction;
    record.otherDeduction = computation.otherDeduction;
    record.autoGovernmentDeductions = computation.autoGovernmentDeductions;
    record.grossSalary = computation.grossSalary;
    record.totalDeduction = computation.totalDeduction;
    record.netSalary = computation.netSalary;
    await record.save();

    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteSalaryRecord = async (req, res) => {
  try {
    const scope = await getRequesterScope(req.user.id);

    if (!scope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const record = await SalaryRecord.findByPk(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "Salary record not found." });
    }

    await record.destroy();
    res.json({ message: "Salary record deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
