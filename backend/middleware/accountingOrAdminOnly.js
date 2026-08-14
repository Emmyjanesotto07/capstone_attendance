export default function accountingOrAdminOnly(req, res, next) {
  const allowedRoles = ["admin", "accounting"];

  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Accounting or admin access required." });
  }

  next();
}
