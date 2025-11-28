# Company Documents App

🎯 Кастомное приложение для ERPNext: управление документами с автоматической синхронизацией в NextCloud.

**Версия:** v0.0.2.7 | **Дата:** 2025-11-28 | **Статус:** 🎉 Production Ready - Fully Tested!

---

## 🚀 Quick Start

### Для пользователей

1. **Установите через Docker** - см. [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md)
2. **Настройте NextCloud** - заполните NextCloud Sync Settings
3. **Создайте первый документ** - через Desk → Documents

### Для разработчиков

```bash
# 1. Клонировать репозиторий
git clone https://github.com/ruslankonovets-22/Company-Documents-App.git

# 2. Следовать инструкциям
# См. docs/DEVELOPMENT.md
```

### Для GitHub Copilot

📖 **Прочитайте сначала:** [docs/copilot/GUIDELINES.md](docs/copilot/GUIDELINES.md)

---

## ✨ Возможности

### Управление документами
- ✅ **Автоматическая нумерация:** `DOC-2025-00001` (с годовым сбросом)
- ✅ **Связь с проектами и задачами:** интеграция с ERPNext
- ✅ **Гибкая структура папок:** 5 уровней вложенности
- ✅ **Шаблоны структуры:** 84 предустановленных шаблона

### NextCloud синхронизация
- ✅ **Автоматическая загрузка файлов** при сохранении документа
- ✅ **WebDAV протокол:** MKCOL, PUT, MOVE, DELETE
- ✅ **Самописная реализация:** 644 строки кода (не использует pibidav)
- ✅ **Шифрование паролей:** AES-256 через Frappe
- ✅ **Отслеживание изменений:** автоматическое перемещение файлов при изменении структуры

### Технические особенности
- ✅ **5 кастомных DocTypes** (удалены 4 legacy DocTypes)
- ✅ **5 Server Scripts + 7 Client Scripts**
- ✅ **Single DocType для настроек** (хранится в tabSingles)
- ✅ **Docker deployment** из GitHub (apps.json)
- ✅ **Полностью работает из коробки** - протестировано на чистой установке!

---

## 📦 Установка

### Быстрая установка (Docker)

```bash
# 1. Создать apps.json
cat > apps.json << 'JSON'
[
  {"url": "https://github.com/frappe/erpnext", "branch": "v15.83.0"},
  {"url": "https://github.com/frappe/hrms", "branch": "v15.52.0"},
  {"url": "https://github.com/The-Commit-Company/raven", "branch": "v2.6.4"},
  {"url": "https://github.com/pibico/pibidav", "branch": "version-15"}
]
JSON

# 2. Собрать образ
export APPS_JSON_BASE64=$(base64 -w 0 apps.json)
docker build \
  --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" \
  --tag custom-erpnext:v15-0.0.2 \
  --file images/custom/Containerfile \
  .

# 3. Запустить
docker compose up -d
```

**Подробнее:** [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md)

---

## 📚 Документация

### 📖 Основная документация

| Документ | Описание |
|----------|----------|
| **[docs/INDEX.md](docs/INDEX.md)** | 🗂️ Навигация по всей документации |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | 🏗️ Архитектура приложения и DocTypes |
| **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** | 🛠️ Процесс разработки (ПОЛИГОН подход) |
| **[docs/NEXTCLOUD_SYNC.md](docs/NEXTCLOUD_SYNC.md)** | ☁️ Детали NextCloud синхронизации |
| **[docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md)** | 🐳 Docker конфигурация и установка |
| **[docs/FIXTURES.md](docs/FIXTURES.md)** | 📦 Конфигурация и экспорт fixtures |

### 🤖 Для GitHub Copilot

| Документ | Описание |
|----------|----------|
| **[docs/copilot/GUIDELINES.md](docs/copilot/GUIDELINES.md)** | ⭐ **КРИТИЧНО!** Правила для Copilot |
| **[docs/copilot/COMMON_COMMANDS.md](docs/copilot/COMMON_COMMANDS.md)** | 🎯 Частые команды (copy-paste ready) |

### 📝 Дополнительно

- **[CHANGELOG.md](CHANGELOG.md)** - История версий
- **[knowledge.md](knowledge.md)** - База знаний (технические детали)
- **[docs/installation.md](docs/installation.md)** - Инструкция по установке
- **[docs/configuration.md](docs/configuration.md)** - Настройка NextCloud
- **[docs/usage.md](docs/usage.md)** - Использование приложения

---

## 🏗️ Архитектура

### DocTypes (9)

**Основные (5):**
1. **Document** - основной DocType для управления документами
2. **Document File** - таблица файлов документа
3. **Folder Structure Template** - шаблоны структуры папок
4. **NextCloud Sync Settings** - настройки синхронизации (Single)
5. **Task Document Link** - связь документов с задачами

**Вспомогательные (4):**
- Project Document Type
- Task Employee
- CILA Document Row
- Task Workspace Row

### NextCloud Sync

```python
# 4 функции на Document.on_update:
doc_events = {
    "Document": {
        "on_update": [
            "track_folder_changes",    # Отслеживание изменений
            "track_file_deletions",    # Отслеживание удалений
            "upload_to_nextcloud",     # Загрузка файлов
            "delete_from_nextcloud"    # Удаление файлов
        ]
    }
}
```

**Подробнее:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🛠️ Технологии

| Компонент | Версия | Назначение |
|-----------|--------|------------|
| **Frappe Framework** | version-15 | Базовая платформа |
| **ERPNext** | v15.83.0 | ERP система |
| **HRMS** | v15.52.0 | Управление персоналом |
| **Raven** | v2.6.4 | Внутренний чат |
| **pibiDAV** | version-15 | WebDAV интеграция (базовый) |
| **Python** | 3.10+ | Язык программирования |
| **MariaDB** | 10.6 | База данных |
| **NextCloud** | latest | Облачное хранилище |

---

## 🔗 Версии

- **[v0.0.2.7](https://github.com/ruslankonovets-22/Company-Documents-App/releases/tag/v0.0.2.7)** — текущая версия (2025-11-28)
  - 5 DocTypes
  - NextCloud WebDAV sync (644 строки)
  - 5 Server Scripts + 7 Client Scripts
  - 84 Folder Structure Templates
  - Custom Page "Project Documents"
  - Полная документация
  
- **[v0.0.1](https://github.com/ruslankonovets-22/Company-Documents-App/releases/tag/v0.0.1)** — начальная версия (2025-09-04)

**История изменений:** [CHANGELOG.md](CHANGELOG.md)

---

## 💻 Для разработчиков

### Development Approach: ПОЛИГОН

**ПОЛИГОН** = тестовый сервер, который можно полностью пересоздать

```bash
# Пересоздать окружение
docker compose down -v
docker compose up -d
```

**Особенности v0.0.2:**
- ✅ Миграции НЕ используются (всегда чистая установка)
- ✅ Пароли хардкодятся (DEV ONLY!)
- ✅ Можно ломать и пересоздавать

**Подробнее:** [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

### Начать разработку

```bash
# 1. Прочитать документацию
cat docs/DEVELOPMENT.md

# 2. Настроить окружение
docker compose up -d

# 3. Войти в контейнер
docker compose exec backend bash
cd /workspace/frappe-bench
bench --site localhost console
```

---

## 🤖 Для GitHub Copilot

### ⚠️ ВАЖНО: Прочитайте перед началом работы!

**Обязательный документ:** [docs/copilot/GUIDELINES.md](docs/copilot/GUIDELINES.md)

**Содержит:**
- ✅ Уровни уверенности (CERTAIN, CONFIDENT, UNCERTAIN, DON'T KNOW)
- ✅ Технический стек (НЕ предлагать другие версии!)
- ✅ Критичные правила (NEVER/ALWAYS)
- ✅ Breaking changes в Frappe v15
- ✅ Методы работы (heredoc, Python команды, Frappe console)
- ✅ Типичные проблемы и решения

**Быстрые команды:** [docs/copilot/COMMON_COMMANDS.md](docs/copilot/COMMON_COMMANDS.md)

---

## 📊 Статистика проекта

- **Код:** 644 строки (nextcloud_sync.py)
- **DocTypes:** 5
- **Server Scripts:** 5
- **Client Scripts:** 7
- **Folder Templates:** 84
- **Документация:** 8 файлов (>50 страниц)

---

## 🐛 Troubleshooting

### Server Scripts не работают?

```bash
# В Frappe v15 нужен флаг -g!
bench set-config -g server_script_enabled 1
```

### Fixtures экспортируют лишние DocTypes?

```python
# Используйте фильтр по app
{"dt": "DocType", "filters": [["app", "=", "company_documents"]]}
```

### NextCloud sync не работает?

```python
# Проверьте настройки
settings = frappe.get_single("NextCloud Sync Settings")
print(settings.enabled)
print(settings.nc_url)
```

**Больше решений:** [docs/copilot/GUIDELINES.md](docs/copilot/GUIDELINES.md)

---

## 📝 Лицензия

MIT License - см. [license.txt](license.txt)

---

## 🤝 Контакты и поддержка

- **GitHub:** [@ruslankonovets-22](https://github.com/ruslankonovets-22)
- **Репозиторий:** [Company-Documents-App](https://github.com/ruslankonovets-22/Company-Documents-App)
- **Issues:** [Сообщить о проблеме](https://github.com/ruslankonovets-22/Company-Documents-App/issues)
- **Документация:** [docs/INDEX.md](docs/INDEX.md)

---

## 🙏 Благодарности

Создано с помощью:
- [Frappe Framework](https://frappeframework.com/)
- [ERPNext](https://erpnext.com/)
- [NextCloud](https://nextcloud.com/)
- [GitHub Copilot](https://github.com/features/copilot)

---

**Последнее обновление:** 2025-11-20
