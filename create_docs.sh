#!/bin/bash
set -e

echo "📚 Создаём документацию..."

# Создаём папку docs
mkdir -p docs

# ========================================
# 1. installation.md
# ========================================
cat > docs/installation.md << 'EOF'
# 📋 ФИНАЛЬНЫЙ МАНУАЛ v0.0.2: ПОЛНАЯ УСТАНОВКА ERPNext + company_documents

**Дата создания:** 2025-11-20 14:47:17  
**Версия:** v0.0.2 (РАБОЧАЯ, ПРОТЕСТИРОВАННАЯ)  
**Статус:** ✅ РАБОТАЕТ ИЗ КОРОБКИ

---

## 🎯 ЦЕЛЬ

Создать **полностью автоматическую установку** ERPNext + кастомное приложение `company_documents` на **ЧИСТОМ СЕРВЕРЕ**.

## 📦 СОСТАВ ПРИЛОЖЕНИЙ

| Приложение | Версия | Назначение |
|------------|--------|------------|
| **Frappe** | version-15 | Базовая платформа |
| **ERPNext** | v15.83.0 | ERP система |
| **HRMS** | v15.52.0 | Управление персоналом |
| **Raven** | v2.6.4 | Внутренний чат |
| **pibiDAV** | version-15 | WebDAV интеграция |
| **company_documents** | **0.0.2** | Наше приложение |

## 📂 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

1. **Docker + Docker Compose**
   ```bash
   docker --version        # >= 20.10
   docker compose version  # >= 2.0
   ```

2. **Архив приложения:**
   ```bash
   ~/company_documents_v0.0.2.tar.gz
   ```

## 🏗️ УСТАНОВКА

### **Шаг 1: Создаём директорию проекта**

```bash
TESTDIR="$HOME/frappe_docker_TEST"
mkdir -p "$TESTDIR"
cd "$TESTDIR"
```

### **Шаг 2: Клонируем frappe_docker**

```bash
git clone https://github.com/frappe/frappe_docker .
```

### **Шаг 3: Распаковываем company_documents**

```bash
mkdir -p company_documents_app
tar -xzf ~/company_documents_v0.0.2.tar.gz -C company_documents_app --strip-components=1
```

### **Шаг 4: Создаём apps.json**

```bash
cat > apps.json << 'JSON'
[
  {"url": "https://github.com/frappe/erpnext", "branch": "v15.83.0"},
  {"url": "https://github.com/frappe/hrms", "branch": "v15.52.0"},
  {"url": "https://github.com/The-Commit-Company/raven", "branch": "v2.6.4"},
  {"url": "https://github.com/pibico/pibidav", "branch": "version-15"}
]
JSON
```

### **Шаг 5: Сборка образа**

```bash
export APPS_JSON_BASE64=$(base64 -w 0 apps.json)

docker build \
  --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" \
  --tag custom-erpnext:v15-0.0.2 \
  --file images/custom/Containerfile \
  .
```

### **Шаг 6: Запуск**

```bash
docker compose up -d
docker compose logs -f create-site
```

## ✅ ПРОВЕРКА

**URL:** http://localhost:8081  
**Логин:** Administrator  
**Пароль:** admin

---

**Полная версия:** см. Release v0.0.2 на GitHub
EOF
echo "✅ Создан: docs/installation.md"

# ========================================
# 2. configuration.md
# ========================================
cat > docs/configuration.md << 'EOF'
# ⚙️ Настройка NextCloud Sync

## 1. Создайте пользователя в NextCloud

1. NextCloud → Settings → Users
2. Создайте пользователя `erpnext_sync`
3. Дайте права на папку `/Projects`

## 2. Настройте ERPNext

1. ERPNext: `NextCloud Sync Settings`
2. Заполните:
   - **Enabled:** ✓
   - **NextCloud URL:** `https://your-nextcloud.com`
   - **Username:** `erpnext_sync`
   - **Password:** `your_password`
   - **Root Path:** `/`
3. **Save** → **Test Connection** → "Подключение успешно! ✓"

## 3. Проверка

1. Создайте Document
2. Прикрепите файл
3. Save
4. Проверьте NextCloud: `Projects/ProjectName/Level1/.../file.pdf` ✅
EOF
echo "✅ Создан: docs/configuration.md"

# ========================================
# 3. usage.md
# ========================================
cat > docs/usage.md << 'EOF'
# 📖 Использование Company Documents App

## Создание документа

1. **Documents app** → **New Document**
2. Заполните:
   - **Project:** выберите проект
   - **Level 1:** "Contracts"
   - **Level 2:** "2025"
3. **Files** → **Add Row** → загрузите файл
4. **Save**

→ Имя: `DOC-2025-00001` ✅  
→ Файл в NextCloud: `Projects/ProjectName/Contracts/2025/file.pdf` ✅

## Изменение структуры папок

Если изменить `Level 2` на "Archive":

1. Файлы **автоматически переместятся**
2. Старая папка удалится (если пустая)
3. `file_url` обновится

## Удаление файлов

1. Откройте Document
2. Files → удалите строку
3. Save

→ Файл **автоматически удалится** из NextCloud ✅
EOF
echo "✅ Создан: docs/usage.md"

# ========================================
# 4. architecture.md
# ========================================
cat > docs/architecture.md << 'EOF'
# 🏗️ Архитектура Company Documents App

## 1. Frappe Framework

ERPNext построен на **Frappe** — Python-фреймворк для бизнес-приложений.

**Основные концепции:**

- **DocType** — тип документа (структура данных)
- **Doc** — экземпляр DocType (запись в БД)
- **Hooks** — автоматизация
- **Fixtures** — данные для экспорта/импорта

## 2. NextCloud Sync

При сохранении Document:

1. `get_folder_path()` — строит путь: `Projects/ProjectName/Level1/...`
2. `create_nextcloud_folder()` — создаёт папки (WebDAV MKCOL)
3. `upload_to_nextcloud()` — загружает файлы (WebDAV PUT)
4. `is_synced` → 1

## 3. WebDAV

Протокол для работы с файлами:

- `MKCOL` — создать папку
- `PUT` — загрузить файл
- `MOVE` — переместить
- `DELETE` — удалить

## 4. Диаграмма работы

```mermaid
graph TD
    A[User creates Document] --> B[Frappe saves to DB]
    B --> C[Hook: on_update]
    C --> D[upload_to_nextcloud]
    D --> E[get_folder_path]
    E --> F[Projects/ProjectName/Level1]
    F --> G[create_nextcloud_folder WebDAV MKCOL]
    G --> H[Upload files WebDAV PUT]
    H --> I[is_synced = 1]
```

---

**Подробнее:** см. `company_documents/nextcloud_sync.py`
EOF
echo "✅ Создан: docs/architecture.md"

echo ""
echo "🎉 Документация создана!"
echo "Файлы:"
ls -lh docs/