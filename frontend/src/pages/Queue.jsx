import { motion } from "framer-motion";

function Queue() {
  const departments = [
    { name: "Emergency", waiting: 18, time: "45 min" },
    { name: "General Clinic", waiting: 7, time: "20 min" },
    { name: "Pharmacy", waiting: 12, time: "30 min" },
  ];

  return (
    <main className="page">
      <h1>Live Queue Status</h1>

      <div className="card-grid">
        {departments.map((dept, index) => (
          <motion.div
            className="queue-card"
            key={dept.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.15 }}
            whileHover={{ scale: 1.05 }}
          >
            <h2>{dept.name}</h2>
            <p>{dept.waiting} people waiting</p>
            <strong>Estimated wait: {dept.time}</strong>
          </motion.div>
        ))}
      </div>
    </main>
  );
}

export default Queue;