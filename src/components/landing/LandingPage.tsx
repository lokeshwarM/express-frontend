"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import Hero from "./Hero";
import { features, steps, trustItems } from "./data";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

function PreviewCard({
  title,
  accent,
  className = "",
  children,
}: {
  title: string;
  accent: "emerald" | "violet" | "blue";
  className?: string;
  children: React.ReactNode;
}) {
  const borders = {
    emerald: "border-emerald-500/20",
    violet: "border-violet-500/20",
    blue: "border-blue-500/20",
  };
  return (
    <div className={`rounded-xl border ${borders[accent]} bg-white/[0.02] p-5 ${className}`}>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">{title}</p>
      {children}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <Navbar />
      <Hero />

      <section id="features" className="relative py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <motion.div {...fadeUp} className="mb-16 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-violet-400">Features</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Everything you need to feel supported</h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              A complete emotional wellness platform built for real human connection.
            </p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="glass-card group rounded-2xl p-6 transition-all duration-300"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-2xl transition group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative border-t border-white/5 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <motion.div {...fadeUp} className="mb-16 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-blue-400">How It Works</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Three steps to connection</h2>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((item, i) => (
              <motion.div
                key={item.step}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative rounded-2xl border border-white/8 bg-white/[0.02] p-8 backdrop-blur"
              >
                <span className="text-4xl font-bold text-violet-500/40">{item.step}</span>
                <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="listeners" className="relative border-t border-white/5 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-violet-400">Platform Preview</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Your support hub</h2>
            <p className="mx-auto mt-4 max-w-lg text-zinc-400">
              Visual preview only — mock dashboard widgets showcasing the Express experience.
            </p>
          </motion.div>
          <motion.div
            {...fadeUp}
            className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-1 shadow-2xl shadow-violet-500/5"
          >
            <div className="rounded-xl bg-[#0a0a12] p-6 md:p-8">
              <div className="mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-4 text-xs text-zinc-500">Express Dashboard</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <PreviewCard title="Active Session" accent="emerald">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-lg">🎙</div>
                    <div>
                      <p className="text-sm font-medium text-white">Voice session</p>
                      <p className="text-xs text-emerald-400">Live · 12:34</p>
                    </div>
                  </div>
                </PreviewCard>
                <PreviewCard title="Wallet Balance" accent="violet">
                  <p className="text-2xl font-bold text-white">₹ 1,250</p>
                  <p className="mt-1 text-xs text-zinc-500">+₹200 this week</p>
                </PreviewCard>
                <PreviewCard title="Available Listeners" accent="blue">
                  <p className="text-2xl font-bold text-white">12</p>
                  <p className="mt-1 text-xs text-emerald-400">● 8 online now</p>
                </PreviewCard>
                <PreviewCard title="AI Insight Panel" accent="violet" className="md:col-span-2">
                  <div className="space-y-2">
                    <div className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
                      Session tone: supportive, calm
                    </div>
                    <div className="rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-400">
                      Suggested focus: active listening, validation
                    </div>
                  </div>
                </PreviewCard>
                <PreviewCard title="Session Analytics" accent="blue">
                  <div className="flex h-16 items-end gap-1">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, j) => (
                      <div
                        key={j}
                        className="flex-1 rounded-t bg-blue-500/40"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">7-day activity</p>
                </PreviewCard>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative border-t border-white/5 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <motion.div {...fadeUp} className="mb-16 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">Trust & Safety</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Built for emotional safety</h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Private conversations, intelligent monitoring, and moderation systems you can trust.
            </p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 text-center"
              >
                <div className="mb-4 text-3xl">{item.icon}</div>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/5 py-24 md:py-32">
        <motion.div {...fadeUp} className="mx-auto max-w-3xl px-5 text-center lg:px-8">
          <h2 className="text-3xl font-bold md:text-5xl">Start your conversation today.</h2>
          <p className="mt-4 text-zinc-400">Join thousands finding support through real human connection.</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-xl bg-white px-8 py-4 text-sm font-semibold text-black transition hover:bg-zinc-200 sm:w-auto"
            >
              Create Account
            </Link>
            <Link
              href="/signup"
              className="w-full rounded-xl border border-violet-500/40 bg-violet-500/10 px-8 py-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20 sm:w-auto"
            >
              Become a Listener
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 md:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold">
              E
            </span>
            <span className="font-semibold text-white">Express</span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="#" className="transition hover:text-white">GitHub</a>
            <a href="#" className="transition hover:text-white">LinkedIn</a>
          </div>
          <p className="text-sm text-zinc-600">© {new Date().getFullYear()} Express. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
