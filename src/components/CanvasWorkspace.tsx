'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUp, ArrowDown, Trash2, RefreshCw, Maximize2, RotateCw
} from 'lucide-react';
import { ClientCloth, CanvasItem } from '@/lib/client-db';

interface CanvasWorkspaceProps {
  items: CanvasItem[];
  clothes: ClientCloth[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItems: (items: CanvasItem[]) => void;
}

export default function CanvasWorkspace({
  items,
  clothes,
  selectedItemId,
  onSelectItem,
  onUpdateItems
}: CanvasWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ mx: number; my: number; ix: number; iy: number } | null>(null);

  // Handle Drag Start
  const handleDragStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onSelectItem(id);

    const item = items.find(i => i.id === id);
    if (!item) return;

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    setDragStart({
      mx: clientX,
      my: clientY,
      ix: item.x,
      iy: item.y
    });
  };

  // Handle Drag Move
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragStart || !selectedItemId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Delta in pixels
    const dx = clientX - dragStart.mx;
    const dy = clientY - dragStart.my;

    // Delta in percentages
    const pctX = (dx / rect.width) * 100;
    const pctY = (dy / rect.height) * 100;

    // Update item coordinates
    const updatedItems = items.map(item => {
      if (item.id === selectedItemId) {
        const newX = Math.max(5, Math.min(95, dragStart.ix + pctX));
        const newY = Math.max(5, Math.min(95, dragStart.iy + pctY));
        return { ...item, x: newX, y: newY };
      }
      return item;
    });

    onUpdateItems(updatedItems);
  };

  // Handle Drag End
  const handleDragEnd = () => {
    setDragStart(null);
  };

  // Bind mouse/touch move events on window when dragging
  useEffect(() => {
    if (dragStart) {
      const handleMove = (e: MouseEvent | TouchEvent) => {
        handleDragMove(e as any);
      };
      const handleEnd = () => {
        handleDragEnd();
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);

      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
      };
    }
  }, [dragStart]);

  // Adjust Layer Controls for selected item
  const updateSelectedProperty = (updater: (item: CanvasItem) => Partial<CanvasItem>) => {
    if (!selectedItemId) return;
    const updated = items.map(item => {
      if (item.id === selectedItemId) {
        return { ...item, ...updater(item) };
      }
      return item;
    });
    onUpdateItems(updated);
  };

  const bringForward = () => {
    updateSelectedProperty(item => ({ zIndex: Math.min(50, item.zIndex + 1) }));
  };

  const sendBackward = () => {
    updateSelectedProperty(item => ({ zIndex: Math.max(0, item.zIndex - 1) }));
  };

  const handleScaleChange = (val: number) => {
    updateSelectedProperty(() => ({ scale: val }));
  };

  const handleRotateChange = (val: number) => {
    updateSelectedProperty(() => ({ rotate: val }));
  };

  const resetItem = () => {
    updateSelectedProperty(item => ({
      x: 50,
      y: 40,
      scale: 0.9,
      rotate: 0,
      zIndex: 10
    }));
  };

  const removeItem = () => {
    if (!selectedItemId) return;
    const updated = items.filter(item => item.id !== selectedItemId);
    onUpdateItems(updated);
    onSelectItem(null);
  };

  const selectedItem = items.find(i => i.id === selectedItemId);

  return (
    <div className="space-y-4 w-full max-w-[320px] mx-auto">
      {/* Canvas Box */}
      <div
        ref={containerRef}
        onClick={() => onSelectItem(null)}
        className="w-full aspect-[3/4] bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 relative overflow-hidden shadow-xs select-none"
      >
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-lavender/10 via-softpink/10 to-transparent pointer-events-none" />

        {/* Grid helper lines */}
        <div className="absolute inset-0 border-x border-dashed border-gray-200/20 left-1/3 right-1/3 pointer-events-none" />
        <div className="absolute inset-0 border-y border-dashed border-gray-200/20 top-1/3 bottom-1/3 pointer-events-none" />

        {/* Items */}
        {items.map((item) => {
          const cloth = clothes.find(c => c.id === item.clothId);
          if (!cloth) return null;
          
          const isSelected = selectedItemId === item.id;

          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(-50%, -50%) scale(${item.scale}) rotate(${item.rotate}deg)`,
                zIndex: item.zIndex,
                width: '55%',
                aspectRatio: '1',
              }}
              onMouseDown={(e) => handleDragStart(item.id, e)}
              onTouchStart={(e) => handleDragStart(item.id, e)}
              onClick={(e) => {
                e.stopPropagation(); // CRITICAL: Stop bubbling up to container which de-selects!
                onSelectItem(item.id);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation(); // CRITICAL: Stop touch end from triggering container click
              }}
              className={`cursor-grab active:cursor-grabbing transition-shadow ${
                isSelected ? 'ring-2 ring-lavender rounded-2xl p-0.5 bg-white/25 shadow-md shadow-lavender/15' : ''
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cloth.image}
                alt={cloth.name}
                className="w-full h-full object-contain filter drop-shadow-md pointer-events-none"
              />
            </div>
          );
        })}

        {/* Empty State */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
            <span className="text-3xl mb-2 animate-float">✨</span>
            <p className="text-xs text-gray-400 font-semibold font-poppins italic max-w-[200px]">
              "Select clothes from the panels below to build your outfit."
            </p>
          </div>
        )}
      </div>

      {/* Layer Control Buttons & Size/Rotate Sliders */}
      <AnimatePresence>
        {selectedItemId && selectedItem && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white/70 border border-white/50 p-4 rounded-2xl shadow-md space-y-4"
          >
            {/* Slider 1: Size Zoom (Scale) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Maximize2 size={11} className="text-softpink" />
                  Zoom / Size
                </span>
                <span className="text-softpink font-extrabold">{Math.round(selectedItem.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.0"
                step="0.05"
                value={selectedItem.scale}
                onChange={(e) => handleScaleChange(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="w-full accent-softpink h-1.5 bg-gray-250 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Slider 2: Rotation */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <RotateCw size={11} className="text-pastel-blue" />
                  Rotation
                </span>
                <span className="text-pastel-blue font-extrabold">{selectedItem.rotate}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={selectedItem.rotate}
                onChange={(e) => handleRotateChange(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="w-full accent-pastel-blue h-1.5 bg-gray-250 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Depth & Actions Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-1 border-t border-black/5">
              {/* Bring Forward */}
              <button
                onClick={(e) => { e.stopPropagation(); bringForward(); }}
                className="py-2.5 rounded-xl bg-white/80 hover:bg-white text-gray-700 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-xs border border-white"
                title="Bring Forward"
              >
                <ArrowUp size={14} className="text-lavender" />
                <span className="text-[8px] font-extrabold uppercase tracking-wider">Forward</span>
              </button>

              {/* Send Backward */}
              <button
                onClick={(e) => { e.stopPropagation(); sendBackward(); }}
                className="py-2.5 rounded-xl bg-white/80 hover:bg-white text-gray-700 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-xs border border-white"
                title="Send Backward"
              >
                <ArrowDown size={14} className="text-lavender" />
                <span className="text-[8px] font-extrabold uppercase tracking-wider">Backward</span>
              </button>

              {/* Reset */}
              <button
                onClick={(e) => { e.stopPropagation(); resetItem(); }}
                className="py-2.5 rounded-xl bg-white/80 hover:bg-white text-gray-700 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-xs border border-white"
                title="Reset Position"
              >
                <RefreshCw size={14} className="text-gray-500" />
                <span className="text-[8px] font-extrabold uppercase tracking-wider">Reset</span>
              </button>

              {/* Remove */}
              <button
                onClick={(e) => { e.stopPropagation(); removeItem(); }}
                className="py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border border-red-100/50"
                title="Remove from Canvas"
              >
                <Trash2 size={14} />
                <span className="text-[8px] font-extrabold uppercase tracking-wider">Remove</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
