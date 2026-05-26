import { WORD_LIST, type WordEntry } from "./word-list";

/**
 * Word categories for the classic game. Each themed category is a subset of the
 * 321 QuickDraw classes the model knows. "Общая" = all words; "Разное" = words
 * that aren't in any themed category (computed automatically).
 *
 * Only categories that map onto existing CNN classes are possible — themes like
 * movies/countries would need a different (retrained) model.
 */

const THEMED: { id: string; label: string; emoji: string; words: string[] }[] = [
  {
    id: "animals", label: "Животные", emoji: "🐾",
    words: ["ant","bat","bear","bee","bird","butterfly","camel","cat","cow","crab","crocodile","dog","dolphin","dragon","duck","elephant","fish","flamingo","frog","giraffe","hedgehog","horse","kangaroo","lion","lobster","monkey","mosquito","mouse","octopus","owl","panda","parrot","penguin","pig","rabbit","raccoon","rhinoceros","scorpion","sea turtle","shark","sheep","snail","snake","spider","squirrel","swan","tiger","whale","zebra"],
  },
  {
    id: "food", label: "Еда", emoji: "🍕",
    words: ["apple","asparagus","banana","birthday cake","blackberry","blueberry","bread","broccoli","cake","carrot","cookie","donut","grapes","hamburger","hot dog","ice cream","lollipop","mushroom","onion","peanut","pear","peas","pineapple","pizza","popsicle","potato","sandwich","steak","strawberry","string bean","watermelon"],
  },
  {
    id: "transport", label: "Транспорт", emoji: "🚗",
    words: ["aircraft carrier","airplane","ambulance","bicycle","bulldozer","bus","canoe","car","cruise ship","firetruck","helicopter","hot air balloon","motorbike","parachute","pickup truck","police car","sailboat","school bus","speedboat","submarine","tractor","train","truck","van"],
  },
  {
    id: "nature", label: "Природа", emoji: "🌳",
    words: ["beach","bush","cactus","campfire","cloud","flower","garden","grass","house plant","leaf","lightning","moon","mountain","palm tree","rain","rainbow","river","snowflake","star","sun","tornado","tree"],
  },
  {
    id: "music", label: "Музыка", emoji: "🎵",
    words: ["cello","clarinet","drums","guitar","harp","piano","saxophone","trombone","trumpet","violin"],
  },
  {
    id: "buildings", label: "Здания", emoji: "🏛️",
    words: ["barn","bridge","castle","church","hospital","house","jail","lighthouse","skyscraper","windmill","The Eiffel Tower"],
  },
  {
    id: "clothes", label: "Одежда", emoji: "👕",
    words: ["backpack","belt","bowtie","bracelet","crown","eyeglasses","flip flops","hat","jacket","necklace","pants","purse","rollerskates","shoe","shorts","sock","sweater","t-shirt","underwear","helmet","lipstick","wristwatch"],
  },
  {
    id: "body", label: "Тело", emoji: "🧍",
    words: ["beard","brain","ear","eye","face","finger","foot","hand","leg","mouth","moustache","nose","skull","tooth"],
  },
  {
    id: "sport", label: "Спорт", emoji: "⚽",
    words: ["baseball","baseball bat","basketball","golf club","hockey puck","hockey stick","soccer ball","tennis racquet","skateboard","dumbbell"],
  },
  {
    id: "shapes", label: "Фигуры", emoji: "🔷",
    words: ["circle","square","triangle","diamond"],
  },
  {
    id: "home", label: "Предметы", emoji: "🏠",
    words: ["anvil","axe","bandage","basket","bathtub","bed","bench","binoculars","book","broom","bucket","calculator","calendar","camera","candle","cannon","ceiling fan","cell phone","chair","chandelier","clock","coffee cup","compass","computer","couch","cup","dishwasher","door","dresser","drill","envelope","eraser","fan","fence","fireplace","flashlight","floor lamp","fork","frying pan","hammer","headphones","hourglass","key","keyboard","knife","ladder","lantern","laptop","light bulb","lighter","mailbox","map","marker","matches","megaphone","microphone","microwave","mug","nail","oven","paintbrush","paint can","paper clip","pencil","picture frame","pillow","pliers","power outlet","radio","rake","remote control","saw","scissors","screwdriver","sink","spoon","stereo","stethoscope","stove","suitcase","table","teapot","telephone","television","tent","toaster","toilet","toothbrush","toothpaste","umbrella","vase","washing machine","wheel","wine bottle","wine glass"],
  },
];

const themedEn = new Set<string>(THEMED.flatMap((c) => c.words));

export interface Category {
  id: string;
  label: string;
  emoji: string;
}

// Picker order: Общая first, themed in the middle, Разное last.
export const CATEGORIES: Category[] = [
  { id: "general", label: "Общая", emoji: "🎲" },
  ...THEMED.map(({ id, label, emoji }) => ({ id, label, emoji })),
  { id: "misc", label: "Разное", emoji: "🎯" },
];

/** Resolve a category id to its pool of words. */
export function getCategoryWords(id: string): WordEntry[] {
  if (id === "general") return WORD_LIST;
  if (id === "misc") return WORD_LIST.filter((w) => !themedEn.has(w.en));
  const cat = THEMED.find((c) => c.id === id);
  if (!cat) return WORD_LIST;
  const set = new Set(cat.words);
  return WORD_LIST.filter((w) => set.has(w.en));
}

export function getRandomWordFromCategory(id: string): WordEntry {
  const pool = getCategoryWords(id);
  return pool[Math.floor(Math.random() * pool.length)] ?? WORD_LIST[0];
}
