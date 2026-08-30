import React from 'react';

interface PredictBoxOfficeButtonProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function PredictBoxOfficeButton({ onClick }: PredictBoxOfficeButtonProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="w-full group relative inline-flex items-center justify-center px-5 py-3 bg-linear-to-b from-[#1a0818] via-[#0f040f] to-[#050105] rounded-2xl border border-[#f5d77f]/30 shadow-[0_0_35px_rgba(245,215,127,0.2)] hover:shadow-[0_0_60px_rgba(245,215,127,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer overflow-hidden select-none"
    >
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Marquee Vector Typography */}
      <svg
        className="w-full  h-10 relative z-5 filter drop-shadow-[0_8px_4px_rgba(0,0,0,0.8)]"
        viewBox="0 0 1100 110"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gold Metallic Border Gradient */}
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff1a8" />
            <stop offset="30%" stopColor="#f3be48" />
            <stop offset="70%" stopColor="#b8860b" />
            <stop offset="100%" stopColor="#6e4f04" />
          </linearGradient>

          {/* Marquee Red Letter Fill Gradient */}
          <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#cb242e" />
            <stop offset="50%" stopColor="#9e111a" />
            <stop offset="100%" stopColor="#61080e" />
          </linearGradient>

          {/* Alternating Lightbulb Animations */}
          <style>{`
            @keyframes lightPulse1 {
              0%, 100% { 
                opacity: 1; 
                stroke: #ffffff; 
                filter: drop-shadow(0px 0px 4px #fff59d) drop-shadow(0px 0px 8px #ffb300); 
              }
              50% { 
                opacity: 0.15; 
                stroke: #ffd54f; 
                filter: none; 
              }
            }
            @keyframes lightPulse2 {
              0%, 100% { 
                opacity: 0.15; 
                stroke: #ffd54f; 
                filter: none; 
              }
              50% { 
                opacity: 1; 
                stroke: #ffffff; 
                filter: drop-shadow(0px 0px 4px #fff59d) drop-shadow(0px 0px 8px #ffb300); 
              }
            }
            .bulb-set-1 {
              animation: lightPulse1 1.75s infinite ease-in-out;
            }
            .bulb-set-2 {
              animation: lightPulse2 1.75s infinite ease-in-out;
            }
          `}</style>
        </defs>

        {/* 1. Extruded 3D Bottom Shadow */}
        <text
          x="50%"
          y="63"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "102px",
            letterSpacing: "4px",
            fontWeight: "900",
            fill: "#2b0305",
            stroke: "#2b0305",
            strokeWidth: "12px",
            strokeLinejoin: "miter",
          }}
        >
          PREDICT BOX OFFICE
        </text>

        {/* 2. Outer Gold Frame Rim */}
        <text
          x="50%"
          y="62"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "102px",
            fontWeight: "900",
            letterSpacing: "4px",
            fill: "url(#redGradient)",
            stroke: "url(#goldGradient)",
            strokeWidth: "2.5px",
            strokeLinejoin: "miter",
          }}
        >
          PREDICT BOX OFFICE
        </text>

        {/* 3. Dark Red Inner Inset Fill */}
        <text
          x="50%"
          y="62"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "102px",
            fontWeight: "900",
            letterSpacing: "4px",
            fill: "url(#redGradient)",
          }}
        >
          PREDICT BOX OFFICE
        </text>

        {/* <MarqueeBulbs text="PREDICT BOX OFFICE" /> */}

        {/* 4. Marquee Lightbulbs Layer A (Odd Bulbs) */}
        <text
          x="20.15%"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          className="bulb-set-1"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "77px",
            fontWeight: "100",
            letterSpacing: "23.25px",
            fill: "none",
            strokeWidth: "9px",
            strokeDasharray: "1 22",
            strokeDashoffset: "0",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            paddingLeft: "50px",
          }}
        >
          PREDICT
        </text>

        <text
          x="54.15%"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          className="bulb-set-1"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "77px",
            fontWeight: "100",
            letterSpacing: "26px",
            fill: "none",
            strokeWidth: "9px",
            strokeDasharray: "1 22",
            strokeDashoffset: "0",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            paddingLeft: "50px",
          }}
        >
          BOX
        </text>
        <text
          x="85%"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          className="bulb-set-1"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "77px",
            fontWeight: "100",
            letterSpacing: "22px",
            fill: "none",
            strokeWidth: "9px",
            strokeDasharray: "1 22",
            strokeDashoffset: "0",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            paddingLeft: "50px",
          }}
        >
          OFFICE
        </text>

        {/* 5. Marquee Lightbulbs Layer B (Even Bulbs) */}
        <text
          x="20.15%"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          className="bulb-set-2"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "77px",
            fontWeight: "100",
            letterSpacing: "23.25px",
            fill: "none",
            strokeWidth: "9px",
            strokeDasharray: "1 22",
            strokeDashoffset: "10",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            paddingLeft: "50px",
          }}
        >
          PREDICT
        </text>

        <text
          x="54.15%"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          className="bulb-set-2"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "77px",
            fontWeight: "100",
            letterSpacing: "26px",
            fill: "none",
            strokeWidth: "9px",
            strokeDasharray: "1 22",
            strokeDashoffset: "10",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            paddingLeft: "50px",
          }}
        >
          BOX
        </text>
        <text
          x="85%"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          className="bulb-set-2"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "77px",
            fontWeight: "100",
            letterSpacing: "22px",
            fill: "none",
            strokeWidth: "9px",
            strokeDasharray: "1 22",
            strokeDashoffset: "10",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            paddingLeft: "50px",
          }}
        >
          OFFICE
        </text>

      </svg>
    </button>
  );
}