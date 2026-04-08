import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Sales from "./components/Sales";
import Expenses from "./components/Expenses";
import Inventory from "./components/Inventory";
import Schedule from "./components/Schedule";
import Reports from "./components/Reports";
import Layout from "./components/Layout";
import Login from "./components/Login";

function App() {
  const [branch, setBranch] = useState(() => {
    const saved = localStorage.getItem("branch");
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
    localStorage.removeItem("branch");
    navigate("/login");
  };

  if (!branch) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout branch={branch} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard branch={branch} />} />
        <Route path="/sales" element={<Sales branch={branch} />} />
        <Route path="/expenses" element={<Expenses branch={branch} />} />
        <Route path="/inventory" element={<Inventory branch={branch} />} />
        <Route path="/schedule" element={<Schedule branch={branch} />} />
        <Route path="/reports" element={<Reports branch={branch} />} />
      </Routes>
    </Layout>
  );
}

export default App;
