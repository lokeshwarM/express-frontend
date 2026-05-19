"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="landing-glow absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-violet-600/20 via-blue-600/10 to-transparent blur-3xl" />
        <div className="landing-blob absolute -left-32 top-40 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="landing-blob absolute -right-24 top-20 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" style={{ animationDelay: "-6s" }} />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 text-center lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-200"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          You are not alone
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl lg:text-7xl"
        >
          Talk Freely. <span className="gradient-text">Feel Heard.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 md:text-xl"
        >
          AI-assisted emotional support platform connecting people with listeners in
          real-time private conversations.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-4 text-sm text-zinc-500"
        >
          Talk freely in a safe, intelligent environment.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/signup"
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-8 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:opacity-90 sm:w-auto"
          >
            Start Talking
          </Link>
          <Link
            href="/login"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-center text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 sm:w-auto"
          >
            Login
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
