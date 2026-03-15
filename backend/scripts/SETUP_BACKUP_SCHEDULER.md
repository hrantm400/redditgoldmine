# Настройка автоматического бэкапа каждые 3 дня

## Способ 1: Windows Task Scheduler (Рекомендуется)

### Шаги настройки:

1. **Открой Task Scheduler:**
   - Нажми `Win + R`
   - Введи `taskschd.msc` и нажми Enter

2. **Создай новую задачу:**
   - В правой панели нажми "Create Basic Task..."
   - Имя: `RedditGoldmine Auto Backup`
   - Описание: `Автоматический бэкап курсов каждые 3 дня`

3. **Настрой триггер:**
   - Выбери "Daily"
   - Начало: выбери сегодняшнюю дату и время (например, 14:00)
   - Повторять каждые: `3 days`

4. **Настрой действие:**
   - Выбери "Start a program"
   - Program/script: `powershell.exe`
   - Add arguments: `-ExecutionPolicy Bypass -File "C:\Users\hrant\Desktop\141125redditgdmnie\backend\scripts\backup-scheduler.ps1"`
   - Start in: `C:\Users\hrant\Desktop\141125redditgdmnie\backend`

5. **Дополнительные настройки:**
   - Отметь "Run whether user is logged on or not"
   - Отметь "Run with highest privileges" (если нужно)
   - В разделе "Conditions" сними галочку "Start the task only if the computer is on AC power" (если хочешь, чтобы работало и на батарее)

6. **Сохрани задачу**

### Проверка:
- Запусти задачу вручную из Task Scheduler (правый клик → Run)
- Проверь папку `backend/data/backup/` - должны появиться файлы

---

## Способ 2: Ручной запуск через npm

Можешь запускать бэкап вручную:

```bash
cd backend
npm run backup
```

---

## Способ 3: Добавить в server.js (автоматически при запуске)

Если хочешь, чтобы бэкап проверялся каждый раз при запуске сервера, можно добавить в `server.js`:

```javascript
// В начале файла после импортов
const { checkAndBackup } = require("./scripts/backup");

// В конце файла, перед app.listen
checkAndBackup().catch(console.error);
```

---

## Где хранятся бэкапы:

- Папка: `backend/data/backup/`
- Формат имени: `courses_YYYY-MM-DD_HH-mm-ss.json`
- Автоматически сохраняются последние 10 бэкапов (старые удаляются)

---

## Настройка интервала

Чтобы изменить интервал (например, каждый день или каждую неделю), отредактируй файл `backend/scripts/backup.js`:

```javascript
const BACKUP_INTERVAL_DAYS = 3; // Измени на нужное количество дней
```







