import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Login from "./pages/Login";
import Queue from "./pages/Queue";
import Assistant from "./pages/Assistant";
import PharmacistDashboard from "./pages/PharmacistDashboard";
import PatientPacking from "./pages/PatientPacking";

function WithHeader({ children }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Unauthenticated — no header */}
        <Route path="/" element={<Login />} />

        {/* Authenticated — all wrapped with the global Header */}
        <Route path="/pharmacist/dashboard" element={
          <WithHeader><PharmacistDashboard /></WithHeader>
        } />
        <Route path="/pharmacist/pack/:patientId" element={
          <WithHeader><PatientPacking /></WithHeader>
        } />
        <Route path="/queue" element={
          <WithHeader><Queue /></WithHeader>
        } />
        <Route path="/assistant" element={
          <WithHeader><Assistant /></WithHeader>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
