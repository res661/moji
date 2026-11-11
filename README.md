# Moji — прототип Telegram Mini App

Кликабельный прототип [@moji_app](https://t.me/moji_app). Чистая геймификация, без крипты.

Главный моджи — **аксолотль**. Интерфейс в духе iOS. Слоты «твой моджи» стоят на местах поз, пока нет шита эмоций.

Загрузочный экран берёт оригинальный арт как есть: положите файл в `assets/brand/splash.png` (без перерисовки). Тот же кадр может появиться в герое на главной, если положить пиксельный кроп в `assets/mascots/axolotl/hero.png`.

Цикл: серия с заморозкой, ежедневные задания, недельные вызовы, путь на 50 уровней, бесплатная дневная рулетка, карточки для чата. Подробные числа — в [USERFLOW.md](USERFLOW.md).

```bash
python3 -m http.server 8765 --directory . --bind 0.0.0.0
python3 tools/cut_sheet.py /path/to/sheet.png --rows 2 --cols 4 --out assets/mascots/axolotl
```

Сохранение: `localStorage` `moji-save-v2`. Stars — демо-модал. Бэкенда нет.
