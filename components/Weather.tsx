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

export default function ForecastCards() {
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

        // Group forecast data by date
        const daysMap = new Map<string, ForecastItem>();

        // Get today's date
        const today = new Date().toISOString().split("T")[0];

        for (const item of forecastJson.list) {
          const date = item.dt_txt.split(" ")[0];

          // Skip today's date since we're showing it separately
          if (date === today) continue;

          // Use the 12:00:00 forecast for each day, or the first available time slot
          if (!daysMap.has(date)) {
            if (item.dt_txt.includes("12:00:00")) {
              daysMap.set(date, item);
            }
          } else if (item.dt_txt.includes("12:00:00")) {
            // Replace with noon forecast if available
            daysMap.set(date, item);
          }
        }

        // Convert map to array and ensure we have exactly 5 days
        const fullForecast = Array.from(daysMap.values()).slice(0, 5);

        setForecastData(fullForecast);

        console.log(`Showing ${fullForecast.length} days of forecast data`);
      } catch (err) {
        console.error("Failed to fetch weather:", err);
      }
    };

    fetchWeather();
  }, [API_KEY, location]);

  return (
    <div className="space-y-6 p-8 bg-[#0F111A] shadow-2xl rounded-lg">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Current Day Forecast - Increased width */}
        {currentDay && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col justify-between bg-[#0F111A] border ring-1 ring-blue-400 rounded-xl p-6 shadow-md w-full lg:w-2/5"
          >
            <div className="flex items-center space-x-4">
              <Image
                src={`https://openweathermap.org/img/wn/${currentDay.weather[0].icon}@2x.png`}
                alt="weather icon"
                width={96}
                height={96}
                className="w-24 h-24"
                unoptimized
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  Today - {currentDay.name}
                </h2>
                <p className="text-gray-300 capitalize text-lg">
                  {currentDay.weather[0].description}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  🌧 Chance of Rain: {currentDay.clouds.all}%
                </p>
              </div>
            </div>
            <div className="flex justify-between items-end mt-4">
              <div>
                <p className="text-4xl font-bold text-white">
                  {currentDay.main.temp.toFixed(1)}°C
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  H: {currentDay.main.temp_max.toFixed(1)}°C / L:{" "}
                  {currentDay.main.temp_min.toFixed(1)}°C
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">
                  💨 Wind: {currentDay.wind.speed} km/h
                </p>
                <p className="text-gray-400 text-sm">
                  💧 Humidity: {currentDay.main.humidity}%
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Forecast Cards - Fixed to always show 5 columns */}
        <div className="grid grid-cols-5 gap-2 w-full lg:w-3/5">
          {forecastData.map((item, index) => {
            const forecastDate = new Date(item.dt_txt);
            const isWeekend =
              forecastDate.getDay() === 0 || forecastDate.getDay() === 6;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex flex-col items-center justify-center bg-[#0F111A] border ring-1 ring-blue-400 rounded-lg p-3 shadow hover:scale-105 transition-transform ${
                  isWeekend ? "ring-1 ring-blue-400" : ""
                }`}
              >
                <span className="text-xs font-semibold text-white">
                  {forecastDate.toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </span>
                <span className="text-xs text-gray-400">
                  {forecastDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <Image
                  src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                  alt="weather icon"
                  width={32}
                  height={32}
                  className="w-8 h-8 my-1"
                  unoptimized
                />
                <span className="text-sm font-bold text-white">
                  {item.main.temp.toFixed(1)}°
                </span>
                <span className="text-xs text-gray-400">
                  {item.main.temp_max.toFixed(0)}°/
                  {item.main.temp_min.toFixed(0)}°
                </span>
                <span className="text-xs text-blue-400">
                  {item.rain?.["3h"]
                    ? `🌧 ${Math.round((item.rain["3h"] / 3) * 100)}%`
                    : ""}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
