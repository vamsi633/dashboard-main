// components/WaterDropLoader.tsx
"use client";

import { motion } from "framer-motion";

export default function WaterDropLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F111A] via-[#121624] to-[#121624] flex items-center justify-center">
      <div className="relative">
        {/* Water drop container */}
        <div className="relative w-32 h-32">
          {/* Outer drop shape */}
          <motion.svg
            width="128"
            height="128"
            viewBox="0 0 128 128"
            className="absolute inset-0"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Drop shape path */}
            <path
              d="M64 16C64 16 32 48 32 80C32 97.6731 46.3269 112 64 112C81.6731 112 96 97.6731 96 80C96 48 64 16 64 16Z"
              fill="none"
              stroke="#9ba8f4"
              strokeWidth="2"
              className="drop-shadow-lg"
            />

            {/* Inner fill animation */}
            <motion.path
              d="M64 16C64 16 32 48 32 80C32 97.6731 46.3269 112 64 112C81.6731 112 96 97.6731 96 80C96 48 64 16 64 16Z"
              fill="url(#water-gradient)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 2, ease: "easeInOut" },
                opacity: { duration: 0.5 },
              }}
              style={{
                clipPath: "url(#water-fill)",
              }}
            />

            {/* Gradient definition */}
            <defs>
              <linearGradient
                id="water-gradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
              </linearGradient>

              {/* Animated clip path for water fill effect */}
              <clipPath id="water-fill">
                <motion.rect
                  x="32"
                  y="112"
                  width="64"
                  height="96"
                  initial={{ y: 112 }}
                  animate={{ y: 16 }}
                  transition={{
                    duration: 2,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                />
              </clipPath>
            </defs>
          </motion.svg>

          {/* Water ripple effect */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className="w-16 h-16 rounded-full bg-blue-400/20"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {/* Inner shimmer effect */}
          <motion.div
            className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/30 blur-sm" />
          </motion.div>
        </div>

        {/* Loading text */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-semibold text-white mb-2">
            Initializing Dashboard
          </h2>
          <motion.p
            className="text-gray-400 text-sm"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Preparing your sensor data...
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
