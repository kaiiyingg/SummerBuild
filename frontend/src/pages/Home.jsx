import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FaRobot, FaClock} from "react-icons/fa";

function PharmacyBackground() {
  const items = [
    { icon: "✚", x: "8%", y: "20%", size: "text-6xl", delay: 0 },
    { icon: "◇", x: "82%", y: "18%", size: "text-5xl", delay: 1 },
    { icon: "●", x: "70%", y: "70%", size: "text-4xl", delay: 2 },
    { icon: "✚", x: "18%", y: "75%", size: "text-5xl", delay: 1.5 },
    { icon: "◇", x: "50%", y: "35%", size: "text-4xl", delay: 2.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.22),transparent_35%)]" />

      <motion.div
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:70px_70px]"
        animate={{ backgroundPosition: ["0px 0px", "70px 70px"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        className="absolute top-24 right-20 w-[420px] h-[420px] rounded-full bg-cyan-400/20 blur-2xl"
        animate={{ y: [0, 40, 0], scale: [1, 1.25, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute bottom-10 left-20 w-[460px] h-[460px] rounded-full bg-teal-400/20 blur-2xl"
        animate={{ x: [0, 60, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {items.map((item, index) => (
        <motion.div
          key={index}
          className={`absolute ${item.size} text-cyan-200/20 font-black`}
          style={{ left: item.x, top: item.y }}
          animate={{
            y: [0, -35, 0],
            rotate: [0, 12, -12, 0],
            opacity: [0.12, 0.3, 0.12],
          }}
          transition={{
            duration: 6 + index,
            repeat: Infinity,
            delay: item.delay,
            ease: "easeInOut",
          }}
        >
          {item.icon}
        </motion.div>
      ))}

      <svg className="absolute bottom-16 left-0 w-full h-50 opacity-30">
        <motion.path
          d="M0 80 L120 80 L150 40 L180 120 L220 80 L360 80 L390 50 L420 110 L460 80 L620 80 L650 45 L680 115 L720 80 L900 80 L930 55 L960 105 L1000 80 L1180 80 L1210 40 L1240 120 L1280 80 L1450 80 L1480 45 L1510 110 L1550 80 L1800 80"
          fill="none"
          stroke="rgba(103,232,249,0.8)"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}

function Home() {
  const fadeUp = {
    hidden: { opacity: 0, y: 70 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <main className="bg-slate-950 text-white overflow-hidden">
      <section className="relative min-h-screen flex items-start px-16 md:px-32">
        <PharmacyBackground />

        <div className="relative z-10 max-w-5xl pt-26">
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-cyan-300 font-bold tracking-[0.3em] uppercase"
          >
            Future of Hospital Care
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 text-6xl md:text-8xl font-black leading-tight"
          >
            Skip the confusion.  
            <span className="text-cyan-300"> See care in real time.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-xl text-slate-300 max-w-2xl"
          >
            Live queue tracking, AI-powered guidance, and a smoother hospital journey from arrival to consultation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-10 flex gap-5"
          >
            <Link className="rounded-full bg-cyan-400 px-8 py-4 text-slate-950 font-bold hover:scale-110 transition" to="/queue">
              View Queue
            </Link>

            <Link className="rounded-full bg-white/10 border border-white/20 px-8 py-4 font-bold backdrop-blur-xl hover:bg-white/20 transition" to="/assistant">
              Ask AI
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="px-10 md:px-24 py-28">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="text-5xl font-black text-center"
        >
          One platform. Two superpowers.
        </motion.h2>

        <div className="mt-16 grid md:grid-cols-2 gap-8">
          {[
            {
              icon: <FaClock />,
                title: "Live Queue",
                text: "Track department waiting times instantly.",
                features: [
                    "Real-time queue updates",
                    "Estimated waiting times",
                    "Department occupancy tracking"
                ]
            },
            {
              icon: <FaRobot />,
                title: "AI Assistant",
                text: "Get answers before reaching the counter.",
                features: [
                    "24/7 AI support",
                    "Hospital navigation help",
                    "Appointment guidance"
                ]
            },
          ].map((item, index) => (
            <motion.div
                key={item.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: false, amount: 0.3 }}
                transition={{ delay: index * 0.15, duration: 0.7 }}
                whileHover={{ y: -15, scale: 1.04 }}
                className="rounded-3xl bg-white/10 border border-white/10 p-8 backdrop-blur-xl shadow-2xl"
                >
                <div className="text-5xl text-cyan-300 mb-6">{item.icon}</div>
                <h3 className="text-2xl font-bold">{item.title}</h3>
                <p className="mt-4 text-slate-300">{item.text}</p>

                <ul className="mt-6 space-y-3 text-slate-300">
                    {item.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                        <span className="text-cyan-300">✓</span>
                        <span>{feature}</span>
                    </li>
                    ))}
                </ul>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Home;