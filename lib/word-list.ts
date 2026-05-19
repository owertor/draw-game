export interface WordEntry {
  en: string;
  ru: string;
  synonyms: string[];
}

export const WORD_LIST: WordEntry[] = [
  { en: "cat", ru: "кот", synonyms: ["кот", "кошка", "котёнок", "котик"] },
  { en: "dog", ru: "собака", synonyms: ["собака", "пёс", "щенок", "собачка"] },
  { en: "house", ru: "дом", synonyms: ["дом", "домик", "здание"] },
  { en: "tree", ru: "дерево", synonyms: ["дерево", "деревце", "ёлка"] },
  { en: "sun", ru: "солнце", synonyms: ["солнце", "солнышко"] },
  { en: "moon", ru: "луна", synonyms: ["луна", "месяц"] },
  { en: "car", ru: "машина", synonyms: ["машина", "автомобиль", "авто", "тачка"] },
  { en: "fish", ru: "рыба", synonyms: ["рыба", "рыбка"] },
  { en: "bird", ru: "птица", synonyms: ["птица", "птичка"] },
  { en: "flower", ru: "цветок", synonyms: ["цветок", "цветочек", "цветы"] },
  { en: "star", ru: "звезда", synonyms: ["звезда", "звёздочка"] },
  { en: "pizza", ru: "пицца", synonyms: ["пицца"] },
  { en: "cloud", ru: "облако", synonyms: ["облако", "облачко", "туча"] },
  { en: "apple", ru: "яблоко", synonyms: ["яблоко", "яблочко"] },
  { en: "banana", ru: "банан", synonyms: ["банан", "бананчик"] },
  { en: "clock", ru: "часы", synonyms: ["часы", "будильник", "время"] },
  { en: "key", ru: "ключ", synonyms: ["ключ", "ключик"] },
  { en: "hat", ru: "шляпа", synonyms: ["шляпа", "шляпка", "шапка"] },
  { en: "umbrella", ru: "зонт", synonyms: ["зонт", "зонтик"] },
  { en: "eye", ru: "глаз", synonyms: ["глаз", "глазик", "глаза"] },
  { en: "hand", ru: "рука", synonyms: ["рука", "ладонь", "кисть"] },
  { en: "shoe", ru: "ботинок", synonyms: ["ботинок", "туфля", "кроссовок", "обувь"] },
  { en: "cup", ru: "кружка", synonyms: ["кружка", "чашка", "стакан"] },
  { en: "book", ru: "книга", synonyms: ["книга", "книжка"] },
  { en: "chair", ru: "стул", synonyms: ["стул", "стульчик", "кресло"] },
  { en: "bicycle", ru: "велосипед", synonyms: ["велосипед", "велик"] },
  { en: "airplane", ru: "самолёт", synonyms: ["самолёт", "самолет", "самолётик", "авиация"] },
  { en: "sailboat", ru: "парусник", synonyms: ["парусник", "лодка", "яхта"] },
  { en: "snake", ru: "змея", synonyms: ["змея", "змейка", "уж"] },
  { en: "rabbit", ru: "кролик", synonyms: ["кролик", "заяц", "зайчик", "зайка"] },
];

export function getRandomWord(): WordEntry {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
}

export function getWordByEn(en: string): WordEntry | undefined {
  return WORD_LIST.find((w) => w.en === en);
}
