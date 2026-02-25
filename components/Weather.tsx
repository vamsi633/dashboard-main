"use client";
{
  /*
// components/Weather.tsx
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface WeatherMain {
  temp: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
}

interface WeatherWind {
  speed: number;
}

interface WeatherItem {
  icon: string;
  description: string;
}

interface CurrentWeather {
  name: string;
  main: WeatherMain;
  weather: WeatherItem[];
  wind: WeatherWind;
  clouds: { all: number };
}

interface ForecastItem {
  dt_txt: string;
  main: WeatherMain;
  weather: WeatherItem[];
  rain?: { [key: string]: number };
}

export default function Weather() {
  const [currentDay, setCurrentDay] = useState<CurrentWeather | null>(null);
  const [forecastData, setForecastData] = useState<ForecastItem[]>([]);

  const location = "Santa Clara";
  const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const currentRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${location}&units=metric&appid=${API_KEY}`
        );
        const forecastRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=${location}&units=metric&appid=${API_KEY}`
        );

        const currentJson = await currentRes.json();
        const forecastJson = await forecastRes.json();

        setCurrentDay(currentJson);

        // Group forecast by date (skip today), prefer 12:00
        const daysMap = new Map<string, ForecastItem>();
        const today = new Date().toISOString().split("T")[0];

        for (const item of forecastJson.list) {
          const date = item.dt_txt.split(" ")[0];
          if (date === today) continue;

          if (!daysMap.has(date)) {
            daysMap.set(date, item);
          }
          if (item.dt_txt.includes("12:00:00")) {
            daysMap.set(date, item);
          }
        }

        const fullForecast = Array.from(daysMap.values()).slice(0, 5);
        setForecastData(fullForecast);
      } catch (err) {
        console.error("Failed to fetch weather:", err);
      }
    };

    fetchWeather();
  }, [API_KEY, location]);

  return (
    <section className="rounded-2xl bg-[#f0f7f3] border border-[#E0EBE6] p-5">
 
      {currentDay && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-4 rounded-xl bg-white border border-[#E6EFEA] p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <Image
              src={`https://openweathermap.org/img/wn/${currentDay.weather[0].icon}@2x.png`}
              alt="weather icon"
              width={96}
              height={96}
              className="w-20 h-20"
              unoptimized
            />
            <div className="flex-1">
              <h2 className="font-lato text-xl font-bold text-[#0B1B18]">
                Today — {currentDay.name}
              </h2>
              <p className="text-[#355e50] capitalize">
                {currentDay.weather[0].description}
              </p>
              <p className="text-sm text-[#5a786c] mt-1">
                🌧 Chance of Rain: {currentDay.clouds.all}%
              </p>
            </div>
            <div className="text-right">
              <p className="font-lato text-3xl font-bold text-[#0B1B18] leading-8">
                {currentDay.main.temp.toFixed(1)}°C
              </p>
              <p className="text-sm text-[#5a786c] mt-1">
                H: {currentDay.main.temp_max.toFixed(1)}°C / L:{" "}
                {currentDay.main.temp_min.toFixed(1)}°C
              </p>
              <p className="text-sm text-[#5a786c]">
                💨 {currentDay.wind.speed} km/h
              </p>
              <p className="text-sm text-[#5a786c]">
                💧 {currentDay.main.humidity}%
              </p>
            </div>
          </div>
        </motion.div>
      )}

     
      <div className="grid grid-cols-2 gap-3">
        {forecastData.map((item, index) => {
          const d = new Date(item.dt_txt);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`aspect-square rounded-xl bg-white border ${
                isWeekend ? "border-[#CFE5DD]" : "border-[#E6EFEA]"
              } p-3 shadow-sm flex flex-col items-center justify-center text-center`}
            >
              <div className="text-[11px] font-semibold text-[#355e50]">
                {d.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div className="text-[11px] text-[#5a786c] -mt-0.5">
                {d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>

              <Image
                src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                alt="weather icon"
                width={36}
                height={36}
                className="w-9 h-9 my-1.5"
                unoptimized
              />

              <div className="font-lato text-lg font-bold text-[#0B1B18] leading-none">
                {item.main.temp.toFixed(1)}°
              </div>
              <div className="text-[11px] text-[#5a786c]">
                {item.main.temp_max.toFixed(0)}° /{" "}
                {item.main.temp_min.toFixed(0)}°
              </div>

              <div className="text-[11px] text-[#0FA3B1] mt-0.5">
                {item.rain?.["3h"]
                  ? `🌧 ${Math.round((item.rain["3h"] / 3) * 100)}%`
                  : "\u00A0"}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

*/
}

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface WeatherMain {
  temp: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
}

interface WeatherWind {
  speed: number;
}

interface WeatherItem {
  icon: string;
  description: string;
}

interface CurrentWeather {
  name: string;
  main: WeatherMain;
  weather: WeatherItem[];
  wind: WeatherWind;
  clouds: { all: number };
}

interface ForecastItem {
  dt_txt: string;
  main: WeatherMain;
  weather: WeatherItem[];
  rain?: { [key: string]: number };
}

type WeatherError = string | null;

function isCurrentWeather(x: unknown): x is CurrentWeather {
  if (!x || typeof x !== "object") return false;

  const o = x as {
    name?: unknown;
    main?: {
      temp?: unknown;
      temp_min?: unknown;
      temp_max?: unknown;
      humidity?: unknown;
    };
    weather?: Array<{ icon?: unknown; description?: unknown }>;
    wind?: { speed?: unknown };
    clouds?: { all?: unknown };
  };

  return (
    typeof o.name === "string" &&
    !!o.main &&
    typeof o.main.temp === "number" &&
    typeof o.main.temp_min === "number" &&
    typeof o.main.temp_max === "number" &&
    typeof o.main.humidity === "number" &&
    Array.isArray(o.weather) &&
    o.weather.length > 0 &&
    typeof o.weather[0]?.icon === "string" &&
    typeof o.weather[0]?.description === "string" &&
    !!o.wind &&
    typeof o.wind.speed === "number" &&
    !!o.clouds &&
    typeof o.clouds.all === "number"
  );
}

function isForecastResponse(x: unknown): x is { list: ForecastItem[] } {
  if (!x || typeof x !== "object") return false;
  const o = x as { list?: unknown };
  return Array.isArray(o.list);
}

export default function Weather() {
  const [currentDay, setCurrentDay] = useState<CurrentWeather | null>(null);
  const [forecastData, setForecastData] = useState<ForecastItem[]>([]);
  const [error, setError] = useState<WeatherError>(null);
  const [loading, setLoading] = useState(false);

  const location = "Santa Clara";
  const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      setError(null);

      if (!API_KEY) {
        setCurrentDay(null);
        setForecastData([]);
        setError(
          "OpenWeather API key missing (NEXT_PUBLIC_OPENWEATHERMAP_API_KEY)."
        );
        return;
      }

      setLoading(true);

      try {
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          location
        )}&units=metric&appid=${API_KEY}`;

        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
          location
        )}&units=metric&appid=${API_KEY}`;

        const [currentRes, forecastRes] = await Promise.all([
          fetch(currentUrl, { cache: "no-store" }),
          fetch(forecastUrl, { cache: "no-store" }),
        ]);

        if (!currentRes.ok) {
          const txt = await currentRes.text().catch(() => "");
          throw new Error(
            `Current weather failed (${currentRes.status}). ${txt}`
          );
        }

        if (!forecastRes.ok) {
          const txt = await forecastRes.text().catch(() => "");
          throw new Error(`Forecast failed (${forecastRes.status}). ${txt}`);
        }

        const currentJson: unknown = await currentRes.json();
        const forecastJson: unknown = await forecastRes.json();

        if (!isCurrentWeather(currentJson)) {
          throw new Error("Current weather response shape invalid.");
        }
        if (!isForecastResponse(forecastJson)) {
          throw new Error("Forecast response shape invalid.");
        }

        // Group forecast by date (skip today), prefer 12:00
        const daysMap = new Map<string, ForecastItem>();
        const today = new Date().toISOString().split("T")[0];

        for (const item of forecastJson.list) {
          if (!item?.dt_txt) continue;

          const date = item.dt_txt.split(" ")[0];
          if (date === today) continue;

          if (!daysMap.has(date)) daysMap.set(date, item);
          if (item.dt_txt.includes("12:00:00")) daysMap.set(date, item);
        }

        if (cancelled) return;

        setCurrentDay(currentJson);
        setForecastData(Array.from(daysMap.values()).slice(0, 5));
      } catch (err) {
        if (cancelled) return;

        const msg =
          err instanceof Error ? err.message : "Failed to fetch weather.";
        console.error("Failed to fetch weather:", err);

        setCurrentDay(null);
        setForecastData([]);
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWeather();

    return () => {
      cancelled = true;
    };
  }, [API_KEY, location]);

  return (
    <section className="rounded-2xl bg-[#f0f7f3] border border-[#E0EBE6] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold text-[#0B1B18]">Weather</div>
        {loading && <div className="text-xs text-[#5a786c]">Loading…</div>}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-white border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Current day */}
      {currentDay && currentDay.weather?.[0] && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-4 rounded-xl bg-white border border-[#E6EFEA] p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <Image
              src={`https://openweathermap.org/img/wn/${currentDay.weather[0].icon}@2x.png`}
              alt="weather icon"
              width={96}
              height={96}
              className="w-20 h-20"
              unoptimized
            />
            <div className="flex-1">
              <h2 className="font-lato text-xl font-bold text-[#0B1B18]">
                Today — {currentDay.name}
              </h2>
              <p className="text-[#355e50] capitalize">
                {currentDay.weather[0].description}
              </p>
              <p className="text-sm text-[#5a786c] mt-1">
                🌧 Chance of Rain: {currentDay.clouds?.all ?? 0}%
              </p>
            </div>
            <div className="text-right">
              <p className="font-lato text-3xl font-bold text-[#0B1B18] leading-8">
                {currentDay.main.temp.toFixed(1)}°C
              </p>
              <p className="text-sm text-[#5a786c] mt-1">
                H: {currentDay.main.temp_max.toFixed(1)}°C / L:{" "}
                {currentDay.main.temp_min.toFixed(1)}°C
              </p>
              <p className="text-sm text-[#5a786c]">
                💨 {currentDay.wind.speed} km/h
              </p>
              <p className="text-sm text-[#5a786c]">
                💧 {currentDay.main.humidity}%
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Forecast */}
      <div className="grid grid-cols-2 gap-3">
        {forecastData.map((item, index) => {
          const d = new Date(item.dt_txt);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const icon = item.weather?.[0]?.icon;

          return (
            <motion.div
              key={`${item.dt_txt}-${index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`aspect-square rounded-xl bg-white border ${
                isWeekend ? "border-[#CFE5DD]" : "border-[#E6EFEA]"
              } p-3 shadow-sm flex flex-col items-center justify-center text-center`}
            >
              <div className="text-[11px] font-semibold text-[#355e50]">
                {d.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div className="text-[11px] text-[#5a786c] -mt-0.5">
                {d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>

              {icon ? (
                <Image
                  src={`https://openweathermap.org/img/wn/${icon}.png`}
                  alt="weather icon"
                  width={36}
                  height={36}
                  className="w-9 h-9 my-1.5"
                  unoptimized
                />
              ) : (
                <div className="w-9 h-9 my-1.5" />
              )}

              <div className="font-lato text-lg font-bold text-[#0B1B18] leading-none">
                {item.main.temp.toFixed(1)}°
              </div>
              <div className="text-[11px] text-[#5a786c]">
                {item.main.temp_max.toFixed(0)}° /{" "}
                {item.main.temp_min.toFixed(0)}°
              </div>

              <div className="text-[11px] text-[#0FA3B1] mt-0.5">
                {item.rain?.["3h"]
                  ? `🌧 ${Math.round((item.rain["3h"] / 3) * 100)}%`
                  : "\u00A0"}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
