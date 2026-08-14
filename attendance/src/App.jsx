import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import StaffDashboard from "./pages/StaffDashboard";
import Settings from "./pages/Settings";
import AttendanceRecords from "./pages/AttendanceRecords";
import AdminForecasting from "./pages/AdminForecasting";
import AccountingManagement from "./pages/AccountingManagement";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/admin/dashboard"
          element={(
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/staff/dashboard"
          element={(
            <ProtectedRoute allowedRoles={["staff", "hr", "accounting"]}>
              <StaffDashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/users"
          element={(
            <ProtectedRoute allowedRoles={["admin", "hr"]}>
              <AdminUsers />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/forecasting"
          element={(
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminForecasting />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/settings"
          element={(
            <ProtectedRoute allowedRoles={["admin", "staff", "hr", "accounting"]}>
              <Settings />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/attendance/records"
          element={(
            <ProtectedRoute allowedRoles={["admin", "hr"]}>
              <AttendanceRecords />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/accounting"
          element={(
            <ProtectedRoute allowedRoles={["admin", "accounting"]}>
              <AccountingManagement />
            </ProtectedRoute>
          )}
        />

      </Routes>

    </BrowserRouter>

  );

}