{
  /*
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

        // group by day, skip today, prefer 12:00
        const daysMap = new Map<string, ForecastItem>();
        const today = new Date().toISOString().split("T")[0];

        for (const item of forecastJson.list) {
          const date = item.dt_txt.split(" ")[0];
          if (date === today) continue;
          if (!daysMap.has(date) || item.dt_txt.includes("12:00:00")) {
            daysMap.set(date, item);
          }
        }
        setForecastData(Array.from(daysMap.values()).slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch weather:", err);
      }
    };
    fetchWeather();
  }, [API_KEY, location]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[#0B1B18] flex items-center gap-2">
        <span>☀️</span> Weather
      </h2>

      
      {currentDay && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl bg-[#EAF6EF] border border-[#E0EBE6] p-6 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <Image
              src={`https://openweathermap.org/img/wn/${currentDay.weather[0].icon}@2x.png`}
              alt="weather icon"
              width={88}
              height={88}
              className="w-20 h-20"
              unoptimized
            />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[#0B1B18]">
                Today — {currentDay.name}
              </h3>
              <p className="text-[#355e50] capitalize">
                {currentDay.weather[0].description}
              </p>
              <p className="text-[#5a786c] text-sm mt-1">
                🌧 Chance of Rain: {currentDay.clouds.all}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-[#0B1B18]">
                {currentDay.main.temp.toFixed(1)}°C
              </p>
              <p className="text-[#5a786c] text-sm mt-1">
                H: {currentDay.main.temp_max.toFixed(1)}° / L:{" "}
                {currentDay.main.temp_min.toFixed(1)}°
              </p>
              <p className="text-[#5a786c] text-sm mt-1">
                💨 {currentDay.wind.speed} km/h • 💧 {currentDay.main.humidity}%
              </p>
            </div>
          </div>
        </motion.div>
      )}

      
      <div className="space-y-3">
        {forecastData.map((item, index) => {
          const d = new Date(item.dt_txt);
          const shades = [
            "#EAF3EE",
            "#E2EFE8",
            "#D9E8E1",
            "#D1E2DA",
            "#C9DBD3",
          ];
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-[#E0EBE6] p-4 shadow-sm flex items-center justify-between"
              style={{
                backgroundColor: shades[Math.min(index, shades.length - 1)],
              }}
            >
              <div className="flex items-center gap-3">
                <Image
                  src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                  alt="icon"
                  width={36}
                  height={36}
                  className="w-9 h-9"
                  unoptimized
                />
                <div>
                  <div className="text-sm font-semibold text-[#0B1B18]">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className="text-xs text-[#355e50]">
                    {d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-base font-semibold text-[#0B1B18]">
                  {item.main.temp.toFixed(1)}°
                </div>
                <div className="text-xs text-[#355e50]">
                  {item.main.temp_max.toFixed(0)}° /{" "}
                  {item.main.temp_min.toFixed(0)}°
                </div>
                <div className="text-xs text-[#0F7A9B]">
                  {item.rain?.["3h"]
                    ? `🌧 ${Math.round((item.rain["3h"] / 3) * 100)}%`
                    : ""}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
*/
}
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
      {/* Current day – white card */}
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

      {/* Next days – white square tiles in 2 columns */}
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
