import { BrowserRouter, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Login from "./pages/Login";
import Queue from "./pages/Queue";
import Assistant from "./pages/Assistant";
import PharmacistDashboard from "./pages/PharmacistDashboard";
import PatientPacking from "./pages/PatientPacking";
import PatientApp from "./pages/PatientApp";

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
        <Route path="/" element={<Login />} />
        <Route path="/patient/app" element={<PatientApp />} />
        <Route
          path="/pharmacist/dashboard"
          element={
            <WithHeader>
              <PharmacistDashboard />
            </WithHeader>
          }
        />
        <Route
          path="/pharmacist/pack/:patientId"
          element={
            <WithHeader>
              <PatientPacking />
            </WithHeader>
          }
        />
        <Route
          path="/queue"
          element={
            <WithHeader>
              <Queue />
            </WithHeader>
          }
        />
        <Route
          path="/assistant"
          element={
            <WithHeader>
              <Assistant />
            </WithHeader>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
