# Быстрый запуск Backend

## Проблема: Backend не запускается

Если backend завис или не запускается, проверьте:

### 1. Создайте файл `.env` в папке `backend/`

Создайте файл `backend/.env` со следующим содержимым:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Allowed CORS Origins
ALLOWED_ORIGINS=http://localhost:5173

# Application Password (для базового логина)
APP_PASSWORD=your_app_password_here

# Admin Configuration
ADMIN_PASSWORD=your_admin_password_here
ADMIN_EMAILS=your-admin@email.com

# Firebase Service Account
# Убедитесь, что файл firebaseServiceAccount.json находится в папке backend/
```

### 2. Проверьте наличие firebaseServiceAccount.json

Файл должен быть в `backend/firebaseServiceAccount.json`

### 3. Запустите backend

```powershell
cd backend
npm run dev
```

Или в отдельном окне:
```powershell
cd backend
npm start
```

### 4. Проверьте, что backend запустился

Откройте в браузере: http://localhost:4000/api/health

Должен вернуться: `{"status":"ok","timestamp":...}`

## Команды для перезапуска

### Остановить все процессы Node.js:
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Запустить Backend:
```powershell
cd backend
npm run dev
```

### Запустить Frontend:
```powershell
cd frontend
npm run dev
```







