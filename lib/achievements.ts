export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_guess",    emoji: "🎯", title: "Первое угадывание", description: "Бот угадал твой рисунок"                   },
  { id: "lightning",      emoji: "⚡", title: "Молния",            description: "Бот угадал при >20 сек на таймере"         },
  { id: "artist_10",      emoji: "🎨", title: "Художник",          description: "Сыграй 10 раундов"                         },
  { id: "artist_50",      emoji: "🖌️", title: "Мастер кисти",     description: "Сыграй 50 раундов"                         },
  { id: "score_500",      emoji: "🚀", title: "На взлёте",         description: "Набери 500 очков за сессию"                },
  { id: "score_1000",     emoji: "👑", title: "Легенда",           description: "Набери 1000 очков за сессию"               },
  { id: "perfect_phase",  emoji: "💎", title: "Идеально",          description: "Максимум в одной фазе (150 очков)"         },
  { id: "streak_3",       emoji: "🔥", title: "Постоянство",       description: "Играй 3 дня подряд"                        },
  { id: "streak_7",       emoji: "📅", title: "Марафонец",         description: "Играй 7 дней подряд"                       },
  { id: "daily_played",   emoji: "📆", title: "Ежедневный игрок",  description: "Сыграй ежедневный челлендж"                },
  { id: "guesser",        emoji: "🔍", title: "Угадайка",          description: "Угадай рисунок бота до его завершения"     },
];

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
