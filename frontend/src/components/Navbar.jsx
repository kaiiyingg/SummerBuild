import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedPillLogo from "./AnimatedPillLogo";

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="navbar">
      <Link to="/" className="logo flex items-center gap-3">
          <AnimatedPillLogo />
          <span>Pilly</span>
      </Link>

      <div className="nav-links">
        <Link to="/">Home</Link>

        <div className="dropdown">
          <button onClick={() => setOpen(!open)}>
            Services ▾
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                className="dropdown-menu"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Link to="/queue">Live Queue</Link>
                <Link to="/assistant">AI Assistant</Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;