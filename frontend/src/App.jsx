import { BrowserRouter, Routes, Route, useParams, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Queue from "./pages/Queue";
import Assistant from "./pages/Assistant";
import PharmacistDashboard from "./pages/PharmacistDashboard";

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

// Placeholder destination for a patient packing screen (built later).
function PackPlaceholder() {
  const { patientId } = useParams();
  return (
    <div style={{ padding: "48px", fontFamily: "'Open Sans', sans-serif" }}>
      <h1 style={{ color: "#40e0d0" }}>Packing — {patientId}</h1>
      <p>This screen is coming soon.</p>
      <Link to="/pharmacist/dashboard" style={{ color: "#2cc3b4", fontWeight: 700 }}>
        ← Back to Dashboard
      </Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/pharmacist/dashboard" element={<PharmacistDashboard />} />
        <Route path="/pharmacist/pack/:patientId" element={<PackPlaceholder />} />
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
