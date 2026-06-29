'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Save, Calendar, Download, RefreshCw, Folder } from 'lucide-react';
import confetti from 'canvas-confetti';
import GlassCard from '@/components/GlassCard';
import CanvasWorkspace from '@/components/CanvasWorkspace';

import { 
  getClothes, saveOutfit, saveCalendarEvent, 
  ClientCloth, CanvasItem, ClientOutfit 
} from '@/lib/client-db';

export default function BuildOutfit() {
  const [clothes, setClothes] = useState<ClientCloth[]>([]);
  const [loading, setLoading] = useState(true);

  // Canvas items state
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Tabs
  const [leftTab, setLeftTab] = useState<'Top' | 'OnePiece'>('Top');
  const [rightTab, setRightTab] = useState<'Bottom' | 'Accessory'>('Bottom');

  // Save / Pin form state
  const [outfitName, setOutfitName] = useState('');
  const [collection, setCollection] = useState<'College Fits' | 'Casual Fits' | 'Hostel Fits' | 'Festive Fits' | 'Favorites'>('Casual Fits');
  const [pinDate, setPinDate] = useState('');
  const [pinNotes, setPinNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    async function loadClothes() {
      try {
        const data = await getClothes();
        setClothes(data);
      } catch (e) {
        console.error('Failed to load clothes:', e);
      } finally {
        setLoading(false);
      }
    }
    loadClothes();
  }, []);

  // Smart Default Layering & Placement Heuristics
  const handleAddClothToCanvas = (cloth: ClientCloth) => {
    let defaultX = 50;
    let defaultY = 40;
    let defaultScale = 0.9;
    let defaultZIndex = 10;

    // Apply smart defaults based on category and length
    if (cloth.category === 'Top') {
      defaultX = 50;
      defaultZIndex = 15; // Tops sit above bottoms by default
      if (cloth.length === 'Short') {
        defaultY = 28; // Crop top ends high
        defaultScale = 0.8;
      } else if (cloth.length === 'Long') {
        defaultY = 42; // Kurti covers thighs
        defaultScale = 1.05;
      } else {
        defaultY = 32; // Medium (T-shirt/Hoodie)
        defaultScale = 0.95;
      }
    } else if (cloth.category === 'Bottom') {
      defaultX = 50;
      defaultY = 65; // Bottoms positioned lower
      defaultScale = 0.95;
      defaultZIndex = 10; // Jeans sit behind tops by default
    } else if (cloth.category === 'OnePiece') {
      defaultX = 50;
      defaultY = 46;
      defaultScale = 1.0;
      defaultZIndex = 12;
    } else if (cloth.category === 'Accessory') {
      if (cloth.subCategory === 'Shoes') {
        defaultX = 50;
        defaultY = 88; // Shoes at the very bottom
        defaultScale = 0.65;
        defaultZIndex = 8; // Under trousers
      } else if (cloth.subCategory === 'Bags') {
        defaultX = 76;
        defaultY = 48; // Handbag on the right side
        defaultScale = 0.65;
        defaultZIndex = 22; // On top of clothes
      } else if (cloth.subCategory === 'Jewellery') {
        defaultX = 50;
        defaultY = 20; // Jewelry around the neck
        defaultScale = 0.45;
        defaultZIndex = 25; // On top of top
      }
    }

    const newCanvasItem: CanvasItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      clothId: cloth.id,
      x: defaultX,
      y: defaultY,
      scale: defaultScale,
      rotate: 0,
      zIndex: defaultZIndex
    };

    setCanvasItems(prev => [...prev, newCanvasItem]);
    setSelectedItemId(newCanvasItem.id);
  };

  // Reset Canvas
  const handleClear = () => {
    setCanvasItems([]);
    setSelectedItemId(null);
    setOutfitName('');
  };

  // Save Outfit to IndexedDB
  const handleSaveOutfit = async () => {
    if (canvasItems.length === 0) {
      alert('Please add at least one clothing item to build an outfit.');
      return;
    }

    if (!outfitName.trim()) {
      alert('Please enter a name for your outfit.');
      return;
    }

    setIsSaving(true);
    try {
      const newOutfit: ClientOutfit = {
        id: `outfit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        outfitName: outfitName.trim(),
        collection,
        items: canvasItems,
        dateCreated: new Date().toISOString(),
        lastWorn: null,
        wearCount: 0
      };

      await saveOutfit(newOutfit);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#CDB4DB', '#FFC8DD', '#A2D2FF'],
      });

      alert('Outfit saved successfully! ❤️');
      setOutfitName('');
    } catch (e) {
      console.error('Error saving outfit:', e);
      alert('Failed to save outfit.');
    } finally {
      setIsSaving(false);
    }
  };

  // Pin Outfit to Calendar
  const handlePinToCalendar = async () => {
    if (!pinDate) {
      alert('Please select a date.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Save the outfit first
      const oName = outfitName.trim() || `Fit for ${new Date(pinDate).toLocaleDateString()}`;
      const newOutfit: ClientOutfit = {
        id: `outfit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        outfitName: oName,
        collection,
        items: canvasItems,
        dateCreated: new Date().toISOString(),
        lastWorn: pinDate,
        wearCount: 1
      };

      await saveOutfit(newOutfit);

      // 2. Pin it to calendar
      await saveCalendarEvent({
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: pinDate,
        outfitId: newOutfit.id,
        notes: pinNotes.trim()
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#CDB4DB', '#FFC8DD', '#B5E2B9'],
      });

      alert('Outfit pinned to calendar! 📅');
      setShowPinModal(false);
      setPinNotes('');
      setOutfitName('');
      setCanvasItems([]);
    } catch (e) {
      console.error('Error pinning outfit:', e);
      alert('Failed to pin outfit.');
    } finally {
      setIsSaving(false);
    }
  };

  // Client-Side Canvas Compiler & Downloader
  const handleDownload = () => {
    if (canvasItems.length === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 530;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 530);
    gradient.addColorStop(0, '#FFF8E7'); // Cream
    gradient.addColorStop(1, '#FFC8DD'); // Soft Pink
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 530);

    // 2. Draw Title
    ctx.fillStyle = '#2D3748';
    ctx.font = 'bold 18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(outfitName || 'Closet Canvas Fit', 200, 40);

    // Sort items by zIndex ascending to render them in correct depth order
    const sortedItems = [...canvasItems].sort((a, b) => a.zIndex - b.zIndex);

    const loadAndDrawItem = (item: CanvasItem) => {
      return new Promise<void>((resolve) => {
        const cloth = clothes.find(c => c.id === item.clothId);
        if (!cloth) {
          resolve();
          return;
        }

        const img = new Image();
        img.src = cloth.image;
        img.onload = () => {
          ctx.save();
          
          // Compute pixel positions
          const px = (item.x / 100) * 400;
          const py = 70 + (item.y / 100) * 420; // Fit inside the 420px workspace below header

          const baseSize = 400 * 0.55; // 55% of canvas width
          const itemW = baseSize * item.scale;

          ctx.translate(px, py);
          ctx.rotate((item.rotate * Math.PI) / 180);
          ctx.drawImage(img, -itemW / 2, -itemW / 2, itemW, itemW);
          
          ctx.restore();
          resolve();
        };
        img.onerror = () => resolve();
      });
    };

    // Sequential loading and drawing to ensure layering is preserved
    let promiseChain = Promise.resolve();
    sortedItems.forEach(item => {
      promiseChain = promiseChain.then(() => loadAndDrawItem(item));
    });

    promiseChain.then(() => {
      // Trigger download
      const link = document.createElement('a');
      link.download = `${(outfitName || 'outfit').trim().replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  // Filter clothes list
  const topsList = clothes.filter(c => c.category === 'Top');
  const bottomsList = clothes.filter(c => c.category === 'Bottom');
  const onePieceList = clothes.filter(c => c.category === 'OnePiece');
  const accessoriesList = clothes.filter(c => c.category === 'Accessory');

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-extrabold uppercase text-lavender tracking-widest">DESIGN STUDIO</span>
        <div className="flex justify-between items-center">
          <h1 className="font-playfair text-3xl font-bold text-gray-800 tracking-wide">Outfit Builder</h1>
          <button
            onClick={handleClear}
            className="px-3.5 py-2 rounded-xl border border-gray-250 bg-white/60 hover:bg-white text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 transition-all active:scale-95"
          >
            <RefreshCw size={11} /> Clear
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5">
        {/* Middle Interactive Canvas */}
        <CanvasWorkspace
          items={canvasItems}
          clothes={clothes}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
          onUpdateItems={setCanvasItems}
        />

        {/* Input Details */}
        {canvasItems.length > 0 && (
          <div className="w-full max-w-[320px] space-y-3">
            <input
              type="text"
              placeholder="Name your outfit..."
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 bg-white/60 focus:outline-none focus:border-lavender text-xs font-bold text-gray-700 text-center placeholder-gray-400"
            />

            <div className="flex gap-2 w-full bg-white/60 border border-white/50 p-2 rounded-2xl items-center">
              <Folder size={14} className="text-lavender ml-1" />
              <select
                value={collection}
                onChange={(e) => setCollection(e.target.value as any)}
                className="flex-1 bg-transparent text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
              >
                <option value="Casual Fits">Casual Fits</option>
                <option value="College Fits">College Fits</option>
                <option value="Hostel Fits">Hostel Fits</option>
                <option value="Festive Fits">Festive Fits</option>
                <option value="Favorites">Favorites</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleDownload}
                className="py-2.5 bg-white/60 hover:bg-white border border-white/40 rounded-2xl text-gray-600 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                title="Download PNG Collage"
              >
                <Download size={15} />
                <span className="text-[8px] font-bold uppercase tracking-wider">Download</span>
              </button>

              <button
                onClick={() => {
                  if (canvasItems.length === 0) {
                    alert('Add items to the canvas first.');
                    return;
                  }
                  setShowPinModal(true);
                }}
                className="py-2.5 bg-white/60 hover:bg-white border border-white/40 rounded-2xl text-gray-600 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                title="Pin to Calendar"
              >
                <Calendar size={15} />
                <span className="text-[8px] font-bold uppercase tracking-wider">Pin Fit</span>
              </button>

              <button
                onClick={handleSaveOutfit}
                disabled={isSaving}
                className="py-2.5 bg-gradient-to-tr from-lavender to-softpink hover:from-lavender/95 hover:to-softpink/95 text-white rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-md shadow-lavender/10 font-bold"
              >
                <Save size={15} />
                <span className="text-[8px] font-bold uppercase tracking-wider">Save Fit</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Wardrobe Selector Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left Drawer Selector (Tops / One Pieces) */}
        <div className="flex flex-col h-[280px] bg-white/30 rounded-3xl border border-white/40 overflow-hidden">
          <div className="flex border-b border-black/5">
            <button
              onClick={() => setLeftTab('Top')}
              className={`flex-1 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all ${
                leftTab === 'Top' ? 'bg-white/60 text-gray-800 border-b-2 border-lavender' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              👚 Tops
            </button>
            <button
              onClick={() => setLeftTab('OnePiece')}
              className={`flex-1 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all ${
                leftTab === 'OnePiece' ? 'bg-white/60 text-gray-800 border-b-2 border-lavender' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              👗 One Piece
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-14 bg-gray-200/50 rounded-xl" />
                <div className="h-14 bg-gray-200/50 rounded-xl" />
              </div>
            ) : (leftTab === 'Top' ? topsList : onePieceList).length > 0 ? (
              (leftTab === 'Top' ? topsList : onePieceList).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAddClothToCanvas(item)}
                  className="p-2 rounded-2xl bg-white/60 border border-white/20 hover:bg-white flex items-center gap-3 cursor-pointer transition-all active:scale-98"
                >
                  <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg p-0.5 overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain filter drop-shadow-xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-gray-800 truncate">{item.name}</h4>
                    <p className="text-[9px] text-gray-400 font-semibold mt-0.5">{item.subCategory} • {item.color}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-xs text-gray-400 italic">No items found.</p>
                <Link href="/wardrobe" className="text-[10px] text-lavender font-bold mt-1.5 inline-block hover:underline">
                  + Add clothes in Closet
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Drawer Selector (Bottoms / Accessories) */}
        <div className="flex flex-col h-[280px] bg-white/30 rounded-3xl border border-white/40 overflow-hidden">
          <div className="flex border-b border-black/5">
            <button
              onClick={() => setRightTab('Bottom')}
              className={`flex-1 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all ${
                rightTab === 'Bottom' ? 'bg-white/60 text-gray-800 border-b-2 border-lavender' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              👖 Bottoms
            </button>
            <button
              onClick={() => setRightTab('Accessory')}
              className={`flex-1 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all ${
                rightTab === 'Accessory' ? 'bg-white/60 text-gray-800 border-b-2 border-lavender' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              👟 Accessories
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-14 bg-gray-200/50 rounded-xl" />
                <div className="h-14 bg-gray-200/50 rounded-xl" />
              </div>
            ) : (rightTab === 'Bottom' ? bottomsList : accessoriesList).length > 0 ? (
              (rightTab === 'Bottom' ? bottomsList : accessoriesList).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAddClothToCanvas(item)}
                  className="p-2 rounded-2xl bg-white/60 border border-white/20 hover:bg-white flex items-center gap-3 cursor-pointer transition-all active:scale-98"
                >
                  <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg p-0.5 overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain filter drop-shadow-xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-gray-800 truncate">{item.name}</h4>
                    <p className="text-[9px] text-gray-400 font-semibold mt-0.5">{item.subCategory} • {item.color}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-xs text-gray-400 italic">No items found.</p>
                <Link href="/wardrobe" className="text-[10px] text-lavender font-bold mt-1.5 inline-block hover:underline">
                  + Add clothes in Closet
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Pin to Calendar Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowPinModal(false)} className="absolute inset-0 bg-black/20 backdrop-blur-xs" />
          
          <GlassCard className="relative w-full max-w-xs bg-white/80 backdrop-blur-xl border border-white/40 p-5 rounded-3xl shadow-xl z-10 space-y-4">
            <h3 className="font-playfair text-lg font-bold text-gray-800 flex items-center gap-1.5">
              <Calendar className="text-lavender" size={18} />
              Pin Outfit to Calendar
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Select Date</label>
                <input
                  type="date"
                  value={pinDate}
                  onChange={(e) => setPinDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Event Notes (Optional)</label>
                <textarea
                  placeholder="Wore this for..."
                  value={pinNotes}
                  onChange={(e) => setPinNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPinModal(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handlePinToCalendar}
                disabled={isSaving}
                className="flex-1 py-2 rounded-xl bg-lavender text-white text-xs font-bold shadow-md"
              >
                {isSaving ? 'Pinning...' : 'Confirm Pin'}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
