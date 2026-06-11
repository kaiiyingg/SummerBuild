import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Component } from "react";
import Header from "./components/Header";
import Login from "./pages/Login";
import Queue from "./pages/Queue";
import Assistant from "./pages/Assistant";
import PharmacistDashboard from "./pages/PharmacistDashboard";
import PatientPacking from "./pages/PatientPacking";
import PatientApp from "./pages/PatientApp";
import { LanguageProvider } from "./context/LanguageContext";

function WithHeader({ children }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Patient route failed:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
          <div className="mx-auto max-w-xl rounded-lg border border-red-100 bg-white p-5 shadow-sm">
            <h1 className="text-lg font-semibold text-red-700">
              Patient app could not load
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Refresh the page. If this stays visible, check the browser console
              for the patient route error.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/patient/app" element={<LanguageProvider><RouteErrorBoundary><PatientApp /></RouteErrorBoundary></LanguageProvider>} />
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
