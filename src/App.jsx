import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import OwnerDashboard from "./components/OwnerDashboard";
import Sales from "./components/Sales";
import Expenses from "./components/Expenses";
import Inventory from "./components/Inventory";
import Schedule from "./components/Schedule";
import Reports from "./components/Reports";
import AuditLog from "./components/AuditLog";
import BudgetSettings from "./components/BudgetSettings";
import Layout from "./components/Layout";
import Login from "./components/Login";
import StaffSelect from "./components/StaffSelect";

function App() {
  const [branch, setBranch] = useState(() => {
    const saved = localStorage.getItem("branch");
    return saved ? JSON.parse(saved) : null;
  });
  const [currentStaff, setCurrentStaff] = useState(() => {
    const saved = localStorage.getItem("currentStaff");
    return saved ? JSON.parse(saved) : null;
  });
  const navigate = useNavigate();

  const handleLogin = (branchData) => {
    setBranch(branchData);
    localStorage.setItem("branch", JSON.stringify(branchData));
    navigate("/");
  };

  const handleLogout = () => {
    setBranch(null);
    setCurrentStaff(null);
    localStorage.removeItem("branch");
    localStorage.removeItem("currentStaff");
    navigate("/login");
  };

  const handleStaffSelect = (staffData) => {
    setCurrentStaff(staffData);
    localStorage.setItem("currentStaff", JSON.stringify(staffData));
  };

  const handleSwitchStaff = () => {
    setCurrentStaff(null);
    localStorage.removeItem("currentStaff");
  };

  if (!branch) {
    return <Login onLogin={handleLogin} />;
  }

  if (!currentStaff) {
    return <StaffSelect branch={branch} onSelect={handleStaffSelect} />;
  }

  return (
    <Layout
      branch={branch}
      staff={currentStaff}
      onLogout={handleLogout}
      onSwitchStaff={handleSwitchStaff}
    >
      <Routes>
        <Route
          path="/"
          element={
            currentStaff.role === "owner" ? (
              <OwnerDashboard staff={currentStaff} />
            ) : (
              <Dashboard branch={branch} staff={currentStaff} />
            )
          }
        />
        <Route
          path="/sales"
          element={<Sales branch={branch} staff={currentStaff} />}
        />
        <Route
          path="/expenses"
          element={<Expenses branch={branch} staff={currentStaff} />}
        />
        <Route
          path="/inventory"
          element={<Inventory branch={branch} staff={currentStaff} />}
        />
        <Route
          path="/schedule"
          element={<Schedule branch={branch} staff={currentStaff} />}
        />
        <Route
          path="/reports"
          element={<Reports branch={branch} staff={currentStaff} />}
        />
        <Route
          path="/audit-log"
          element={<AuditLog branch={branch} staff={currentStaff} />}
        />
        <Route
          path="/budget"
          element={<BudgetSettings branch={branch} staff={currentStaff} />}
        />
      </Routes>
    </Layout>
  );
}

export default App;
