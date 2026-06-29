'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Sun, Sparkles, Calendar, AlertCircle, 
  TrendingUp, Heart, History, Plus, Award
} from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import { 
  getClothes, getOutfits, getCalendarEvents, 
  ClientCloth, ClientOutfit, ClientCalendarEvent 
} from '@/lib/client-db';

const COMPLIMENTS = [
  "Confidence looks beautiful on you. ✨",
  "Today's outfit matches your energy. 🌸",
  "You are your own fashion icon. 👑",
  "Every outfit tells a story. 📖",
  "Radiate elegance and grace today. 💫",
  "Your style is an expression of your imagination. 🎨",
  "Dress like you're already famous. 🌟"
];

export default function Home() {
  const [clothes, setClothes] = useState<ClientCloth[]>([]);
  const [outfits, setOutfits] = useState<ClientOutfit[]>([]);
  const [events, setEvents] = useState<ClientCalendarEvent[]>([]);
  const [dailyCompliment, setDailyCompliment] = useState('');
  const [historyAlerts, setHistoryAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Weather simulation
  const [weather] = useState({
    temp: 28,
    condition: 'Pleasant',
    icon: Sun,
    text: "It's a perfect day for a light outfit. Pick your favorite pastel colors!"
  });

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Select daily quote
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setDailyCompliment(COMPLIMENTS[dayOfYear % COMPLIMENTS.length]);

    async function loadData() {
      try {
        const [loadedClothes, loadedOutfits, loadedEvents] = await Promise.all([
          getClothes(),
          getOutfits(),
          getCalendarEvents(),
        ]);

        setClothes(loadedClothes);
        setOutfits(loadedOutfits);
        setEvents(loadedEvents);

        // Calculate hostel outfit repetition alerts
        calculateAlerts(loadedEvents, loadedOutfits, loadedClothes);
      } catch (e) {
        console.error('Error loading client database:', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const calculateAlerts = (
    loadedEvents: ClientCalendarEvent[], 
    loadedOutfits: ClientOutfit[],
    loadedClothes: ClientCloth[]
  ) => {
    const alerts: string[] = [];
    
    // Find today's event
    const todayEv = loadedEvents.find(e => e.date === todayStr);
    if (!todayEv) return;

    const todayOut = loadedOutfits.find(o => o.id === todayEv.outfitId);
    if (!todayOut) return;

    const todayItemIds = todayOut.items.map(i => i.clothId);
    if (todayItemIds.length === 0) return;

    // Get calendar events from the last 3 days (excluding today)
    const oneDay = 24 * 60 * 60 * 1000;
    const todayTime = new Date(todayStr).getTime();

    const recentEvents = loadedEvents.filter(ev => {
      if (ev.date === todayStr) return false;
      const evTime = new Date(ev.date).getTime();
      const diffDays = (todayTime - evTime) / oneDay;
      return diffDays > 0 && diffDays <= 3;
    });

    // Check if any item in today's outfit was worn in those recent events
    const repeatedItemNames: string[] = [];
    recentEvents.forEach(ev => {
      const pastOutfit = loadedOutfits.find(o => o.id === ev.outfitId);
      if (pastOutfit) {
        pastOutfit.items.forEach(item => {
          if (todayItemIds.includes(item.clothId)) {
            const clothObj = loadedClothes.find(c => c.id === item.clothId);
            if (clothObj && !repeatedItemNames.includes(clothObj.name)) {
              repeatedItemNames.push(clothObj.name);
            }
          }
        });
      }
    });

    if (repeatedItemNames.length > 0) {
      alerts.push(`Hostel Alert: You wore "${repeatedItemNames.join(', ')}" in the last 3 days! Consider swapping them to avoid repeating.`);
    }

    setHistoryAlerts(alerts);
  };

  // Find today's outfit
  const todayEvent = events.find(e => e.date === todayStr);
  const todayOutfit = todayEvent ? outfits.find(o => o.id === todayEvent.outfitId) : null;

  // Weekly calendar strip (7 days starting from today)
  const getWeeklyDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const event = events.find(e => e.date === dateStr);
      const outfit = event ? outfits.find(o => o.id === event.outfitId) : null;
      dates.push({ dateStr, dayName, dayNum, outfit });
    }
    return dates;
  };

  // Stats calculation
  const getStats = () => {
    const totalWorn = clothes.reduce((acc, c) => acc + (c.wearCount || 0), 0);
    const favoriteItems = clothes.filter(c => c.favorite);
    const mostWornItem = [...clothes].sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0))[0];
    const leastWornItem = clothes.filter(c => (c.wearCount || 0) === 0);
    
    return {
      totalWorn,
      favoriteCount: favoriteItems.length,
      mostWornName: mostWornItem && mostWornItem.wearCount > 0 ? mostWornItem.name : 'None yet',
      mostWornImage: mostWornItem && mostWornItem.wearCount > 0 ? mostWornItem.image : null,
      leastWornCount: leastWornItem.length,
    };
  };

  const stats = getStats();
  const weeklyDates = getWeeklyDates();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="text-4xl mb-4 animate-bounce">👗</div>
          <p className="font-playfair text-lg text-gray-500 font-semibold">Opening your closet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Welcome Header */}
      <div className="space-y-1">
        <span className="text-[10px] font-extrabold uppercase text-lavender tracking-widest">AURA CLOSET</span>
        <h1 className="font-playfair text-3xl font-bold text-gray-800 tracking-wide leading-tight">
          Hey, Beautiful! ✨
        </h1>
        {/* Daily Quote/Compliment */}
        <p className="text-sm font-semibold italic text-softpink font-poppins mt-1">
          "{dailyCompliment}"
        </p>
      </div>

      {/* Weather Widget */}
      <GlassCard className="flex items-center gap-4 bg-gradient-to-br from-cream/50 to-softpink/10 border-white/40 p-4">
        <div className="p-3 bg-white/80 rounded-2xl text-softpink shadow-xs">
          <weather.icon size={24} className="animate-float" />
        </div>
        <div className="min-w-0">
          <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Today's Aura</span>
          <h3 className="text-base font-bold text-gray-800 leading-tight">{weather.temp}°C • {weather.condition}</h3>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5 leading-tight truncate">{weather.text}</p>
        </div>
      </GlassCard>

      {/* Today's Outfit Canvas */}
      <div className="space-y-2">
        <h2 className="font-playfair text-lg font-bold text-gray-800 flex items-center gap-2">
          Today's Canvas
        </h2>
        <GlassCard className="flex flex-col items-center justify-center min-h-[340px] bg-gradient-to-b from-white/70 to-cream/30 p-4 relative">
          {todayOutfit && todayOutfit.items.length > 0 ? (
            <div className="w-full flex flex-col items-center h-full justify-between">
              <div className="text-center mb-3">
                <span className="text-[9px] font-bold uppercase text-softpink tracking-wider">Active Outfit</span>
                <h3 className="font-playfair text-base font-bold text-gray-800">{todayOutfit.outfitName}</h3>
              </div>
              
              {/* Render items in saved positions */}
              <div className="relative w-full max-w-[240px] aspect-[3/4] bg-white/30 rounded-2xl border border-white/20 overflow-hidden shadow-xs">
                {todayOutfit.items.map((canvasItem) => {
                  const cloth = clothes.find(c => c.id === canvasItem.clothId);
                  if (!cloth) return null;
                  return (
                    <div
                      key={canvasItem.id}
                      style={{
                        position: 'absolute',
                        left: `${canvasItem.x}%`,
                        top: `${canvasItem.y}%`,
                        transform: `translate(-50%, -50%) scale(${canvasItem.scale}) rotate(${canvasItem.rotate}deg)`,
                        zIndex: canvasItem.zIndex,
                        width: '50%',
                        aspectRatio: '1',
                      }}
                      className="pointer-events-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cloth.image}
                        alt={cloth.name}
                        className="w-full h-full object-contain filter drop-shadow-sm"
                      />
                    </div>
                  );
                })}
              </div>

              {todayEvent?.notes && (
                <p className="text-[11px] text-gray-500 font-medium italic mt-3">
                  "{todayEvent.notes}"
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="w-14 h-14 bg-lavender/20 rounded-full flex items-center justify-center text-lavender mb-3 animate-float">
                <Plus size={24} />
              </div>
              <h3 className="font-playfair text-base font-bold text-gray-800">No outfit planned yet</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[220px]">
                "Your wardrobe is waiting to tell your fashion story."
              </p>
              <Link href="/build" className="mt-4 px-4 py-2 bg-lavender hover:bg-lavender/90 text-white rounded-full text-xs font-semibold tracking-wider transition-all">
                BUILD OUTFIT
              </Link>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Weekly Preview */}
      <div className="space-y-2">
        <h2 className="font-playfair text-lg font-bold text-gray-800 flex items-center justify-between">
          <span>Weekly Canvas</span>
          <Link href="/calendar" className="text-xs font-semibold text-lavender hover:underline flex items-center gap-0.5">
            View Calendar <Calendar size={12} />
          </Link>
        </h2>
        <div className="grid grid-cols-7 gap-1.5">
          {weeklyDates.map((item) => {
            const isToday = item.dateStr === todayStr;
            return (
              <GlassCard 
                key={item.dateStr} 
                className={`p-1.5 flex flex-col items-center justify-center text-center transition-all ${
                  isToday 
                    ? 'bg-lavender/35 border-lavender/60 shadow-md ring-1 ring-lavender/20' 
                    : 'bg-white/45 hover:bg-white/60'
                }`}
              >
                <span className={`text-[9px] font-bold uppercase ${isToday ? 'text-gray-900' : 'text-gray-400'}`}>
                  {item.dayName.substring(0, 2)}
                </span>
                <span className={`text-sm font-bold my-0.5 ${isToday ? 'text-gray-900' : 'text-gray-700'}`}>
                  {item.dayNum}
                </span>
                {item.outfit ? (
                  <div className="w-5 h-5 bg-softpink/20 rounded-full flex items-center justify-center text-[9px]" title={item.outfit.outfitName}>
                    👗
                  </div>
                ) : (
                  <div className="w-1 h-1 bg-gray-200 rounded-full my-1" />
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Hostel Tracker Warnings */}
      {historyAlerts.length > 0 && (
        <div className="space-y-2">
          {historyAlerts.map((alert, i) => (
            <div key={i} className="bg-orange-50 border border-orange-100 p-3.5 rounded-2xl shadow-xs flex gap-3 items-start">
              <AlertCircle className="text-orange-500 mt-0.5 flex-shrink-0" size={16} />
              <div>
                <h4 className="text-xs font-bold text-gray-800">Repetition Warning</h4>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{alert}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wardrobe Statistics */}
      <div className="space-y-2">
        <h2 className="font-playfair text-lg font-bold text-gray-800">Stats at a Glance</h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Total Clothes */}
          <GlassCard className="p-3 bg-white/50 flex items-center gap-3">
            <div className="p-2 bg-lavender/20 rounded-xl text-lavender">
              <TrendingUp size={16} />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-800 leading-none">{clothes.length}</h4>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-1">Total Clothes</p>
            </div>
          </GlassCard>

          {/* Favorites */}
          <GlassCard className="p-3 bg-white/50 flex items-center gap-3">
            <div className="p-2 bg-softpink/20 rounded-xl text-softpink">
              <Heart size={16} className="fill-softpink/20" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-800 leading-none">{stats.favoriteCount}</h4>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-1">Favorites</p>
            </div>
          </GlassCard>

          {/* Most Worn */}
          <GlassCard className="p-3 bg-white/50 flex items-center gap-3 col-span-2">
            {stats.mostWornImage ? (
              <div className="w-10 h-10 border border-gray-100 bg-white rounded-lg p-1 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={stats.mostWornImage} alt="Most worn" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="p-2 bg-pastel-blue/20 rounded-xl text-pastel-blue">
                <History size={16} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-gray-800 truncate">{stats.mostWornName}</h4>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Most Worn Clothing</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
