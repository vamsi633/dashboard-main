"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface WeatherMain { temp: number; temp_min: number; temp_max: number; humidity: number; }
interface WeatherItem { icon: string; description: string; }
interface CurrentWeather { name: string; main: WeatherMain; weather: WeatherItem[]; wind: { speed: number }; clouds: { all: number }; }
interface ForecastItem  { dt_txt: string; main: WeatherMain; weather: WeatherItem[]; rain?: Record<string, number>; }

function isCurrentWeather(x: unknown): x is CurrentWeather {
  const o = x as CurrentWeather;
  return !!o && typeof o.name === "string" &&
    typeof o.main?.temp === "number" && typeof o.main?.temp_min === "number" &&
    typeof o.main?.temp_max === "number" && typeof o.main?.humidity === "number" &&
    Array.isArray(o.weather) && o.weather.length > 0 &&
    typeof o.weather[0]?.icon === "string" && typeof o.weather[0]?.description === "string" &&
    typeof o.wind?.speed === "number" && typeof o.clouds?.all === "number";
}
function isForecastResponse(x: unknown): x is { list: ForecastItem[] } {
  return !!x && typeof x === "object" && Array.isArray((x as { list?: unknown }).list);
}

const OWM = "https://api.openweathermap.org/data/2.5";

export default function Weather() {
  const [currentDay, setCurrentDay] = useState<CurrentWeather | null>(null);
  const [forecastData, setForecastData] = useState<ForecastItem[]>([]);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const location = "Santa Clara";
  const API_KEY  = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setError(null);
      if (!API_KEY) { setError("OpenWeather API key missing."); return; }
      setLoading(true);
      try {
        const params = `q=${encodeURIComponent(location)}&units=metric&appid=${API_KEY}`;
        const [cr, fr] = await Promise.all([
          fetch(`${OWM}/weather?${params}`,  { cache: "no-store" }),
          fetch(`${OWM}/forecast?${params}`, { cache: "no-store" }),
        ]);
        if (!cr.ok) throw new Error(`Weather fetch failed (${cr.status})`);
        if (!fr.ok) throw new Error(`Forecast fetch failed (${fr.status})`);
        const cj: unknown = await cr.json(), fj: unknown = await fr.json();
        if (!isCurrentWeather(cj))    throw new Error("Weather response shape invalid.");
        if (!isForecastResponse(fj))  throw new Error("Forecast response shape invalid.");

        const today = new Date().toISOString().split("T")[0];
        const daysMap = new Map<string, ForecastItem>();
        for (const item of fj.list) {
          if (!item?.dt_txt) continue;
          const date = item.dt_txt.split(" ")[0];
          if (date === today) continue;
          if (!daysMap.has(date) || item.dt_txt.includes("12:00:00")) daysMap.set(date, item);
        }
        if (cancelled) return;
        setCurrentDay(cj);
        setForecastData(Array.from(daysMap.values()).slice(0, 7));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to fetch weather.");
        setCurrentDay(null); setForecastData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [API_KEY, location]);

  const w = currentDay?.weather?.[0];

  return (
    <section className="rounded-2xl bg-white border border-[#E6EFEA] p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">⛅</span>
          <h2 className="text-lg font-bold text-[#0B1B18] tracking-tight">Weather</h2>
        </div>
        {loading && <span className="text-xs text-slate-400 animate-pulse">Loading…</span>}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {currentDay && w && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Image src={`https://openweathermap.org/img/wn/${w.icon}@2x.png`} alt="weather icon" width={72} height={72} className="w-14 h-14 flex-shrink-0" unoptimized />
              <div>
                <p className="text-[36px] font-extrabold tracking-tight text-[#0B1B18] leading-none">{currentDay.main.temp.toFixed(1)}°C</p>
                <p className="text-sm font-semibold text-[#1a3a30] mt-1 leading-tight">{currentDay.name}</p>
                <p className="text-xs font-normal text-slate-400 capitalize mt-0.5">{w.description}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { icon: "💨", label: "Wind",     val: `${currentDay.wind.speed.toFixed(1)} km/h` },
                { icon: "🌧",  label: "Rain",     val: `${currentDay.clouds?.all ?? 0}%` },
                { icon: "💧", label: "Humidity", val: `${currentDay.main.humidity}%` },
                { icon: "📊", label: "H / L",   val: `${currentDay.main.temp_max.toFixed(0)}° / ${currentDay.main.temp_min.toFixed(0)}°` },
              ].map(({ icon, label, val }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-sm w-5 text-center leading-none">{icon}</span>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 w-16">{label}</span>
                  <span className="text-[13px] font-semibold text-[#0B1B18]">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-[#F0F7F3]">
            {[
              `☁️ Cloud ${currentDay.clouds?.all ?? 0}%`,
              `💨 ${currentDay.wind.speed.toFixed(0)} km/h`,
              `💧 ${currentDay.main.humidity}% RH`,
              `🌡️ Feels ~${(currentDay.main.temp - 1.5).toFixed(0)}°C`,
            ].map((chip) => (
              <span key={chip} className="px-2.5 py-1 bg-[#f4f9f6] border border-[#E0EBE6] rounded-full text-[11px] font-semibold text-[#254e3f]">{chip}</span>
            ))}
          </div>
        </motion.div>
      )}

      {forecastData.length > 0 && (
        <div className="pt-4 border-t border-[#F0F7F3]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">7-Day Forecast</p>
          <div className="flex gap-1.5">
            {forecastData.map((item, i) => {
              const dayName = new Date(item.dt_txt).toLocaleDateString("en-US", { weekday: "short" });
              const icon    = item.weather?.[0]?.icon;
              const rainPct = item.rain?.["3h"] ? Math.round((item.rain["3h"] / 3) * 100) : null;
              return (
                <motion.div key={`${item.dt_txt}-${i}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex-1 flex flex-col items-center gap-0.5 rounded-xl bg-[#f4f9f6] border border-[#E0EBE6] py-2.5 px-1 hover:bg-[#eaf4f0] transition-colors">
                  <span className="text-[11px] font-bold text-[#254e3f]">{dayName}</span>
                  {icon
                    ? <Image src={`https://openweathermap.org/img/wn/${icon}.png`} alt={dayName} width={32} height={32} className="w-8 h-8" unoptimized />
                    : <div className="w-8 h-8" />
                  }
                  <span className="text-[14px] font-bold text-[#0B1B18] leading-none">{item.main.temp.toFixed(0)}°</span>
                  {rainPct !== null
                    ? <span className="text-[10px] font-medium text-[#0FA3B1]">{rainPct}%</span>
                    : <span className="text-[10px] text-slate-300">—</span>
                  }
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !error && !currentDay && (
        <div className="flex flex-col items-center justify-center flex-1 py-6">
          <span className="text-3xl mb-2">🌤</span>
          <p className="text-sm text-slate-400">No weather data available</p>
        </div>
      )}
    </section>
  );
}
