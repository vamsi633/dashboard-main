"use client";
import React from "react";

export default function WaterDropLoader() {
  return (
    <div className="loader-overlay" role="status" aria-label="Loading">
      <svg
        className="plant"
        viewBox="0 0 360 300"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {/* soft shadow halo (moved down to stay under the pot) */}
        <ellipse
          cx="180"
          cy="170"
          rx="130"
          ry="80"
          fill="#000"
          opacity="0.05"
        />

        {/* LEAVES (nudged down) */}
        <g transform="translate(180,160)">
          {" "}
          {/* ↑ was 138 */}
          <path
            className="leaf leaf-sway-a"
            d="M-10,0 C-32,-90 -12,-140 24,-170 C-44,-142 -76,-88 -40,-8 Z"
            fill="#A8E06E"
            stroke="#97D25E"
            strokeWidth="3"
          />
          <path
            className="leaf leaf-sway-b"
            d="M0,0 C12,-95 30,-150 64,-170 C-6,-150 -26,-90 -4,-6 Z"
            fill="#A8E06E"
            stroke="#97D25E"
            strokeWidth="3"
          />
          <path
            className="leaf leaf-sway-c"
            d="M12,0 C44,-56 92,-78 128,-78 C74,-74 48,-38 16,0 Z"
            fill="#A8E06E"
            stroke="#97D25E"
            strokeWidth="3"
          />
          <path
            className="leaf leaf-sway-d"
            d="M-30,0 C-58,-46 -66,-70 -62,-88 C-54,-64 -36,-40 -16,0 Z"
            fill="#9EDB64"
            stroke="#8DCA54"
            strokeWidth="3"
          />
        </g>

        {/* POT (nudged down to match) */}
        <g transform="translate(180,158)">
          {" "}
          {/* ↑ was 136 */}
          <rect x="-100" y="0" width="200" height="36" fill="#D5BF9B" />
          <polygon points="-70,36 70,36 40,88 -40,88" fill="#CCB38E" />
          <polygon
            points="-100,0 -40,0 -80,36 -100,36"
            fill="#C9AE84"
            opacity=".95"
          />
          <polygon
            points="100,0 40,0 80,36 100,36"
            fill="#C9AE84"
            opacity=".95"
          />
        </g>
      </svg>

      <style jsx>{`
        .loader-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          z-index: 9999;
        }

        /* Responsive, with a touch of extra room and visible overflow just in case */
        .plant {
          width: clamp(180px, 24vh, 280px); /* a hair taller overall */
          height: auto;
          overflow: visible;
        }

        .leaf {
          transform-origin: 0% 100%;
        }

        .leaf-sway-a {
          animation: swayA 3.2s ease-in-out infinite;
        }
        .leaf-sway-b {
          animation: swayB 3.6s ease-in-out infinite;
        }
        .leaf-sway-c {
          animation: swayC 3s ease-in-out infinite;
        }
        .leaf-sway-d {
          animation: swayD 2.8s ease-in-out infinite;
        }

        @keyframes swayA {
          0% {
            transform: rotate(-2deg);
          }
          50% {
            transform: rotate(3deg);
          }
          100% {
            transform: rotate(-2deg);
          }
        }
        @keyframes swayB {
          0% {
            transform: rotate(2deg);
          }
          50% {
            transform: rotate(-3deg);
          }
          100% {
            transform: rotate(2deg);
          }
        }
        @keyframes swayC {
          0% {
            transform: rotate(1deg);
          }
          50% {
            transform: rotate(-2deg);
          }
          100% {
            transform: rotate(1deg);
          }
        }
        @keyframes swayD {
          0% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(2deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}
