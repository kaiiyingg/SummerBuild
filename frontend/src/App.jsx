import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Queue from "./pages/Queue";
import Assistant from "./pages/Assistant";
import PharmacistDashboard from "./pages/PharmacistDashboard";
import PatientPacking from "./pages/PatientPacking";

// Pages that share the app chrome (navbar). The login and dashboard pages are
// full-screen and intentionally render without the navbar.
function WithNavbar({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/pharmacist/dashboard" element={<PharmacistDashboard />} />
        <Route path="/pharmacist/pack/:patientId" element={<PatientPacking />} />
        <Route
          path="/queue"
          element={
            <WithNavbar>
              <Queue />
            </WithNavbar>
          }
        />
        <Route
          path="/assistant"
          element={
            <WithNavbar>
              <Assistant />
            </WithNavbar>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
