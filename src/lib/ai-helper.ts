import { ClientCloth as Cloth, ClientOutfit as Outfit } from './client-db';

/**
 * Auto-categorizes an item based on its name/filename.
 */
export function autoCategorize(filename: string): {
  category: 'Top' | 'Bottom' | 'OnePiece' | 'Accessory';
  subCategory: string;
  length: 'Short' | 'Medium' | 'Long';
  layerPriority: number;
  color: string;
  season: string;
  occasion: string;
} {
  const name = filename.toLowerCase();

  // Default values
  let category: 'Top' | 'Bottom' | 'OnePiece' | 'Accessory' = 'Top';
  let subCategory = 'T-Shirts';
  let length: 'Short' | 'Medium' | 'Long' = 'Medium';
  let layerPriority = 2; // Tops usually 2
  let color = 'White';
  let season = 'Summer';
  let occasion = 'Casual';

  // Detect Color
  const colors = [
    'black', 'white', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 
    'lavender', 'cream', 'beige', 'grey', 'gray', 'orange', 'brown'
  ];
  for (const c of colors) {
    if (name.includes(c)) {
      color = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  // Tops detection
  if (name.includes('tshirt') || name.includes('t-shirt') || name.includes('tee')) {
    category = 'Top';
    subCategory = 'T-Shirts';
    length = 'Medium';
    layerPriority = 2;
  } else if (name.includes('kurti') || name.includes('kurtas') || name.includes('tunic')) {
    category = 'Top';
    subCategory = 'Kurtis';
    length = 'Long';
    layerPriority = 3; // Long Kurtis go over bottoms
    occasion = 'Festive';
  } else if (name.includes('hoodie') || name.includes('sweatshirt') || name.includes('jacket')) {
    category = 'Top';
    subCategory = 'Hoodies';
    length = 'Medium';
    layerPriority = 3; // Layered outerwear
    season = 'Winter';
  } else if (name.includes('crop') || name.includes('corset')) {
    category = 'Top';
    subCategory = 'Crop Tops';
    length = 'Short';
    layerPriority = 2;
  } else if (name.includes('shirt') || name.includes('blouse')) {
    category = 'Top';
    subCategory = 'Shirts';
    length = 'Medium';
    layerPriority = 2;
    occasion = 'Formal';
  }
  // Bottoms detection
  else if (name.includes('jean') || name.includes('denim')) {
    category = 'Bottom';
    subCategory = 'Jeans';
    length = 'Medium';
    layerPriority = 1;
  } else if (name.includes('pant') || name.includes('trouser') || name.includes('cargo')) {
    category = 'Bottom';
    subCategory = 'Pants';
    length = 'Medium';
    layerPriority = 1;
  } else if (name.includes('legging') || name.includes('jeggings') || name.includes('tight')) {
    category = 'Bottom';
    subCategory = 'Leggings';
    length = 'Medium';
    layerPriority = 1;
  } else if (name.includes('skirt')) {
    category = 'Bottom';
    subCategory = 'Skirts';
    length = 'Medium';
    layerPriority = 1;
  } else if (name.includes('shorts')) {
    category = 'Bottom';
    subCategory = 'Shorts';
    length = 'Short';
    layerPriority = 1;
  }
  // One Piece detection
  else if (name.includes('dress') || name.includes('gown') || name.includes('frock')) {
    category = 'OnePiece';
    subCategory = 'Dresses';
    length = 'Long';
    layerPriority = 2;
  } else if (name.includes('saree') || name.includes('sari')) {
    category = 'OnePiece';
    subCategory = 'Sarees';
    length = 'Long';
    layerPriority = 3;
    occasion = 'Festive';
  } else if (name.includes('jumpsuit') || name.includes('romper')) {
    category = 'OnePiece';
    subCategory = 'Jumpsuits';
    length = 'Long';
    layerPriority = 2;
  }
  // Accessories detection
  else if (name.includes('shoe') || name.includes('sneaker') || name.includes('heel') || name.includes('boot') || name.includes('sandal')) {
    category = 'Accessory';
    subCategory = 'Shoes';
    length = 'Short';
    layerPriority = 0; // Footwear is base layer
  } else if (name.includes('bag') || name.includes('handbag') || name.includes('purse') || name.includes('clutch')) {
    category = 'Accessory';
    subCategory = 'Bags';
    length = 'Medium';
    layerPriority = 4;
  } else if (name.includes('jewel') || name.includes('ring') || name.includes('necklace') || name.includes('earring') || name.includes('bracelet')) {
    category = 'Accessory';
    subCategory = 'Jewellery';
    length = 'Short';
    layerPriority = 5; // Jewelry on top
  }

  return { category, subCategory, length, layerPriority, color, season, occasion };
}

/**
 * Generates AI suggestions for outfits and alerts for repeated items.
 */
export function generateSuggestions(clothes: Cloth[], outfits: Outfit[], history: { date: string; outfitId: string; outfitName: string }[]): {
  type: 'alert' | 'suggestion' | 'insight';
  message: string;
  actionableId?: string;
  actionType?: 'wear' | 'pair';
}[] {
  const suggestions: {
    type: 'alert' | 'suggestion' | 'insight';
    message: string;
    actionableId?: string;
    actionType?: 'wear' | 'pair';
  }[] = [];

  const todayStr = new Date().toISOString().split('T')[0];
  const oneDay = 24 * 60 * 60 * 1000;

  // 1. Check for outfit repeated recently (Hostel life warning)
  if (history.length > 0) {
    // Sort history by date descending
    const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));
    const lastWornOutfit = sortedHistory[0];
    const daysSinceLastWorn = Math.round(Math.abs((new Date(todayStr).getTime() - new Date(lastWornOutfit.date).getTime()) / oneDay));

    if (daysSinceLastWorn <= 1) {
      suggestions.push({
        type: 'alert',
        message: `You wore "${lastWornOutfit.outfitName}" yesterday. Let's try something new today to keep your style fresh!`,
        actionableId: lastWornOutfit.outfitId,
        actionType: 'wear'
      });
    }
  }

  // 2. Identify neglected clothes (unworn for > 14 days)
  const neglectedClothes = clothes.filter(c => {
    if (!c.lastWorn) return true; // Never worn
    const daysUnworn = Math.round(Math.abs((new Date(todayStr).getTime() - new Date(c.lastWorn).getTime()) / oneDay));
    return daysUnworn >= 14;
  });

  if (neglectedClothes.length > 0) {
    // Pick a random neglected item
    const randomItem = neglectedClothes[Math.floor(Math.random() * neglectedClothes.length)];
    const days = randomItem.lastWorn 
      ? `${Math.round(Math.abs((new Date(todayStr).getTime() - new Date(randomItem.lastWorn).getTime()) / oneDay))} days`
      : 'ever';
      
    suggestions.push({
      type: 'suggestion',
      message: `You haven't worn your ${randomItem.color.toLowerCase()} ${randomItem.subCategory.toLowerCase().replace(/s$/, '')} ("${randomItem.name}") in ${days}. Let's build an outfit around it!`,
      actionableId: randomItem.id,
      actionType: 'pair'
    });
  }

  // 3. Color matching recommendations
  const tops = clothes.filter(c => c.category === 'Top');
  const bottoms = clothes.filter(c => c.category === 'Bottom');
  
  if (tops.length > 0 && bottoms.length > 0) {
    // Look for matching combinations. Let's make some classic combinations:
    // White/Black bottoms go with any top.
    // Lavender tops look great with white/cream/beige bottoms.
    // Pink tops look great with denim (blue jeans).
    const blueJeans = bottoms.find(b => b.subCategory === 'Jeans' && b.color.toLowerCase() === 'blue');
    const pinkTops = tops.find(t => t.color.toLowerCase() === 'pink');
    const lavenderTops = tops.find(t => t.color.toLowerCase() === 'lavender');
    const whiteBottoms = bottoms.find(b => b.color.toLowerCase() === 'white' || b.color.toLowerCase() === 'cream' || b.color.toLowerCase() === 'beige');

    if (pinkTops && blueJeans) {
      suggestions.push({
        type: 'insight',
        message: `Fashion Tip: Try pairing your "${pinkTops.name}" with your "${blueJeans.name}" for a cute, soft pastel look.`,
        actionableId: pinkTops.id,
        actionType: 'pair'
      });
    } else if (lavenderTops && whiteBottoms) {
      suggestions.push({
        type: 'insight',
        message: `Style Match: Your lavender top "${lavenderTops.name}" would pair beautifully with the cream/white "${whiteBottoms.name}".`,
        actionableId: lavenderTops.id,
        actionType: 'pair'
      });
    }
  }

  // 4. Default empty state suggestion
  if (suggestions.length === 0) {
    suggestions.push({
      type: 'insight',
      message: "Your wardrobe is waiting to tell your fashion story. Add some clothes to get customized styling suggestions!",
    });
  }

  return suggestions;
}
