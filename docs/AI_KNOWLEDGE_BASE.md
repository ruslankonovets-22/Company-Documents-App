# 🤖 AI Knowledge Base - Company Documents App

**Версия проекта:** v0.0.2.4  
**Дата создания:** 2025-11-22  
**Назначение:** Comprehensive guide для обучения AI ассистентов работе с проектом

---

## 📚 Оглавление

1. [О проекте](#1-о-проекте)
2. [Технический стек](#2-технический-стек)
3. [Архитектура приложения](#3-архитектура-приложения)
4. [Frappe Framework v15 - Критичные особенности](#4-frappe-framework-v15---критичные-особенности)
5. [Fixtures - Экспорт и импорт данных](#5-fixtures---экспорт-и-импорт-данных)
6. [Разработка и тестирование](#6-разработка-и-тестирование)
7. [NextCloud интеграция](#7-nextcloud-интеграция)
8. [Типичные проблемы и решения](#8-типичные-проблемы-и-решения)
9. [Workflow разработки](#9-workflow-разработки)
10. [Чек-листы для AI](#10-чек-листы-для-ai)

---

## 1. О проекте

### 1.1 Что такое Company Documents App?

**Company Documents App** - кастомное приложение для ERPNext, обеспечивающее:
- Управление документами с автоматической нумерацией (`DOC-2025-00001`)
- Синхронизацию файлов с NextCloud через WebDAV (самописная реализация, 636 строк)
- Гибкую структуру папок (5 уровней вложенности)
- Связь документов с проектами и задачами ERPNext

### 1.2 Текущая стадия разработки

**Версия:** v0.0.2.4 (Development Stage)

**Философия разработки - ПОЛИГОН:**
- ✅ Тестовый сервер, который можно полностью пересоздать
- ✅ Миграции НЕ используются - всегда чистая установка
- ✅ База данных пересоздается при необходимости
- ❌ Production deployment - пока не планируется

**Важно:** Миграции начнут использоваться только с версии v1.0.0+

### 1.3 Структура репозитория

```
Company-Documents-App/
├── company_documents/              # Основной Python модуль
│   ├── __init__.py                 # Версия приложения
│   ├── hooks.py                    # Конфигурация Frappe hooks
│   ├── nextcloud_sync.py           # NextCloud синхронизация (636 строк)
│   ├── modules.txt                 # Список модулей (Documents)
│   ├── patches.txt                 # Миграции (пусто в v0.0.2)
│   │
│   ├── fixtures/                   # Данные для установки
│   │   ├── doctype.json            # 9 DocTypes (~87 KB)
│   │   ├── server_script.json      # 5 Server Scripts (~18 KB)
│   │   ├── client_script.json      # 7 Client Scripts (~12 KB)
│   │   ├── folder_structure_template.json  # 45 шаблонов (~17 KB)
│   │   ├── custom_field.json       # Custom Fields (2 байт - пусто)
│   │   ├── property_setter.json    # Property Setters (2 байт - пусто)
│   │   ├── document_naming_rule.json  # Правила нумерации (296 байт)
│   │   └── workspace.json          # UI воркспейсы (~2.5 KB)
│   │
│   ├── config/                     # Конфигурация модуля
│   ├── custom/                     # Кастомные контроллеры
│   │   └── document.py             # Document controller
│   ├── documents/                  # Модуль Documents
│   ├── templates/                  # Jinja2 шаблоны
│   └── public/                     # Статические файлы
│
├── docs/                           # Документация
│   ├── AI_KNOWLEDGE_BASE.md        # Этот файл
│   ├── ARCHITECTURE.md             # Архитектура (~463 строки)
│   ├── DEVELOPMENT.md              # Процесс разработки
│   ├── FIXTURES.md                 # Работа с fixtures
│   ├── NEXTCLOUD_SYNC.md           # NextCloud интеграция
│   ├── DOCKER_SETUP.md             # Docker конфигурация
│   └── copilot/
│       ├── GUIDELINES.md           # Правила для AI
│       └── COMMON_COMMANDS.md      # Часто используемые команды
│
├── scripts/                        # Утилиты
│   ├── validate_fst_order.py       # Проверка порядка FST
│   ├── fix_fst_order.py            # Автофикс порядка FST
│   └── pre-commit-hook.sh          # Git hook для валидации
│
├── CHANGELOG.md                    # История изменений
├── README.md                       # Главная документация
├── knowledge.md                    # База знаний
└── pyproject.toml                  # Python конфигурация

```

---

## 2. Технический стек

### 2.1 Точные версии (КРИТИЧНО!)

| Компонент | Версия | Источник | Комментарий |
|-----------|--------|----------|-------------|
| **Frappe Framework** | version-15 | [GitHub](https://github.com/frappe/frappe/tree/version-15) | ⚠️ НЕ v14, НЕ v16! |
| **ERPNext** | v15.83.0 | [GitHub](https://github.com/frappe/erpnext/tree/v15.83.0) | Точная версия |
| **HRMS** | v15.52.0 | [GitHub](https://github.com/frappe/hrms/tree/v15.52.0) | HR модуль |
| **Raven** | v2.6.4 | [GitHub](https://github.com/The-Commit-Company/raven/tree/v2.6.4) | Чат |
| **pibiDAV** | version-15 | [GitHub](https://github.com/pibico/pibidav/tree/version-15) | WebDAV (не используется напрямую) |
| **Python** | 3.10+ | - | Минимум 3.10 |
| **MariaDB** | 10.6 | - | Совместима с Frappe v15 |
| **Redis** | 7.0+ | - | Кэш и очереди |
| **Node.js** | 18+ | - | Сборка фронтенда |
| **Docker** | 24+ | - | Контейнеризация |
| **NextCloud** | latest | - | Облачное хранилище |

### 2.2 apps.json конфигурация

```json
[
  {"url": "https://github.com/frappe/erpnext", "branch": "v15.83.0"},
  {"url": "https://github.com/frappe/hrms", "branch": "v15.52.0"},
  {"url": "https://github.com/The-Commit-Company/raven", "branch": "v2.6.4"},
  {"url": "https://github.com/pibico/pibidav", "branch": "version-15"},
  {"url": "https://github.com/ruslankonovets-22/Company-Documents-App", "branch": "main"}
]
```

**⚠️ ПОРЯДОК КРИТИЧЕН!** company_documents устанавливается последним через Git.

**Примечание:** pibidav включен в apps.json но напрямую не используется - вместо этого реализована самописная интеграция NextCloud (636 строк).

### 2.3 Официальная документация

#### Frappe Framework v15
- **Официальный сайт:** https://frappeframework.com/
- **GitHub:** https://github.com/frappe/frappe/tree/version-15
- **Документация:** https://frappeframework.com/docs/v15/user
- **API Reference:** https://frappeframework.com/docs/v15/api
- **Migration Guide v14→v15:** https://github.com/frappe/frappe/wiki/Migrating-to-Version-15

#### ERPNext v15
- **GitHub:** https://github.com/frappe/erpnext/tree/v15.83.0
- **Документация:** https://docs.erpnext.com/
- **User Manual:** https://docs.erpnext.com/docs/v15/user/manual/en

#### NextCloud WebDAV
- **WebDAV API:** https://docs.nextcloud.com/server/stable/developer_manual/client_apis/WebDAV/
- **Files API:** https://docs.nextcloud.com/server/latest/developer_manual/client_apis/WebDAV/files.html

---

## 3. Архитектура приложения

### 3.1 DocTypes (5 типов)

**⚠️ ВАЖНО:** Удалены 4 legacy DocTypes из модуля Projects (Project Document Type, Task Employee, CILA Document Row, Task Workspace Row) - они больше не используются!

#### 3.1.1 Document (Основной DocType)

**Тип:** Document  
**Модуль:** Documents  
**Назначение:** Хранение документов с файлами

**Ключевые поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| `name` | Data | Автонумерация: `DOC-2025-00001` |
| `project` | Link (Project) | Связь с проектом |
| `task` | Link (Task) | Связь с задачей (опционально) |
| `level_1` до `level_5` | Link (Folder Structure Template) | 5 уровней структуры папок |
| `files` | Table (Document File) | Child table с файлами |

**Hooks события:**
```python
doc_events = {
    "Document": {
        "on_update": [
            "company_documents.nextcloud_sync.track_folder_changes",
            "company_documents.nextcloud_sync.track_file_deletions",
            "company_documents.nextcloud_sync.upload_to_nextcloud",
            "company_documents.nextcloud_sync.delete_from_nextcloud"
        ]
    }
}
```

#### 3.1.2 Document File (Child Table)

**Тип:** Child Table  
**Родитель:** Document  
**Назначение:** Хранение файлов документа

**Ключевые поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| `file` | Attach | Прикрепленный файл |
| `file_name` | Data | Имя файла |
| `file_url` | Data | URL в NextCloud (с file_id) |
| `file_synced` | Check | Флаг синхронизации (v0.0.2.4+) |
| `uploaded_by` | Link (User) | Кто загрузил (v0.0.2.4+) |
| `uploaded_on` | Datetime | Когда загружен (v0.0.2.4+) |

**⚠️ ВАЖНО:** В v0.0.2.3 и ранее поле называлось `is_synced` - исправлено в v0.0.2.4!

#### 3.1.3 Folder Structure Template

**Тип:** Document  
**Модуль:** Documents  
**Назначение:** Шаблоны структуры папок  
**Особенность:** Использует Frappe NestedSet (иерархия)

**Ключевые поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| `name` | Data | ID шаблона: `FST-0001` |
| `folder_name` | Data | Название папки |
| `parent_folder_structure_template` | Link (Self) | Родительская папка |
| `is_group` | Check | Является ли группой |
| `lft`, `rgt` | Int | NestedSet индексы |

**КРИТИЧНО - Порядок в fixtures:**
```json
[
  {"name": "FST-0001", "parent_folder_structure_template": null},  // СНАЧАЛА родители
  {"name": "FST-0004", "parent_folder_structure_template": "FST-0001"},  // ПОТОМ дети
  // ...
]
```

**Проблема v0.0.2.2:** Неправильный порядок → `TypeError: cannot unpack non-iterable NoneType object`  
**Решение v0.0.2.3:** Переупорядочены JSON, добавлены утилиты валидации

#### 3.1.4 NextCloud Sync Settings

**Тип:** Single DocType  
**Модуль:** Documents  
**Назначение:** Настройки синхронизации NextCloud

**⚠️ ВАЖНО:** Single DocType хранится в `tabSingles`, НЕ в отдельной таблице!

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| `enabled` | Check | Включить синхронизацию |
| `nc_url` | Data | URL NextCloud |
| `nc_username` | Data | Имя пользователя |
| `nc_password` | Password | Пароль (AES-256 зашифрован) |
| `nc_root_path` | Data | Корневой путь (опционально) |

**Расшифровка пароля:**
```python
from frappe.utils.password import get_decrypted_password

nc_password = get_decrypted_password(
    "NextCloud Sync Settings",  # DocType
    "NextCloud Sync Settings",  # Name (для Single = DocType)
    "nc_password",              # Fieldname
    raise_exception=False
)
```

### 3.2 Server Scripts (5 скриптов)

**Включение в Frappe v15:**
```bash
bench set-config -g server_script_enabled 1  # -g ОБЯЗАТЕЛЬНО!
```

**Типы:**
- API scripts
- DocType events
- Scheduled jobs
- Permission scripts
- Button actions

### 3.3 Client Scripts (7 скриптов)

**Выполняются в браузере пользователя**

**События:**
- Form lifecycle (refresh, validate, before_save)
- Field changes (onchange)
- Custom buttons
- List view events

---

## 4. Frappe Framework v15 - Критичные особенности

### 4.1 Breaking Changes из v14

#### 4.1.1 Server Scripts Configuration

**❌ НЕ РАБОТАЕТ в v15 (работало в v14):**
```bash
bench set-config server_script_enabled true
```

**✅ ПРАВИЛЬНО для v15:**
```bash
bench set-config -g server_script_enabled 1
```

**Причина:** `is_safe_exec_enabled()` проверяет ТОЛЬКО `common_site_config.json` (флаг `-g`)

**Источник:** https://github.com/frappe/frappe/wiki/Migrating-to-Version-15

### 4.1.1.1 Task Document Link

**Тип:** Document  
**Модуль:** Projects  
**Назначение:** Связь задач с документами

**Ключевые поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| `task` | Link (Task) | Ссылка на задачу |
| `document` | Link (Document) | Ссылка на документ |

**Использование:** Связать Document с Task из ERPNext Projects

#### 4.1.2 Удалённые зависимости

**Удалены из Frappe v15:**
- googlemaps
- urllib3
- gitdb
- pypng
- schedule
- pycryptodome

**Решение:** Добавить в `requirements.txt` если используются.

#### 4.1.3 Database API изменения

**Удалены методы:**
- `frappe.db.touch()`
- `frappe.db.clear_table()`
- Параметры: `as_utf8`, `formatted`

**Использовать вместо:**
```python
frappe.db.set_value(doctype, name, field, value)
```

### 4.2 Важные концепции Frappe

#### 4.2.1 Hooks система

**Файл:** `company_documents/hooks.py`

**Типы hooks:**

1. **Doc Events (события документов):**
```python
doc_events = {
    "Document": {
        "before_insert": "path.to.function",
        "after_insert": "path.to.function",
        "before_save": "path.to.function",
        "on_update": "path.to.function",
        "on_submit": "path.to.function",
        "on_cancel": "path.to.function",
        "on_trash": "path.to.function",
    }
}
```

2. **Scheduler Events:**
```python
scheduler_events = {
    "daily": [
        "path.to.daily_task"
    ],
    "hourly": [
        "path.to.hourly_task"
    ]
}
```

3. **Web Request Hooks:**
```python
before_request = [
    "path.to.middleware"
]
```

#### 4.2.2 Fixtures система

**Назначение:** Экспорт/импорт метаданных между инсталляциями

**Конфигурация в hooks.py:**
```python
fixtures = [
    # Простой экспорт всех записей
    {"dt": "Server Script"},
    
    # С фильтрами
    {
        "dt": "DocType",
        "filters": [
            ["module", "=", "Documents"],
            ["custom", "=", 1]
        ]
    },
    
    # С конкретными полями
    {
        "dt": "Custom Field",
        "filters": [["module", "=", "Documents"]],
        "fields": ["name", "label", "fieldtype"]  # Опционально
    }
]
```

**Важно:** Fixtures НЕ экспортируют данные пользователей - только метаданные!

#### 4.2.3 NestedSet (Иерархические структуры)

**Что это:** Способ хранения дерева в реляционной БД

**Поля:**
- `lft` (left) - левая граница
- `rgt` (right) - правая граница
- `parent_<doctype>` - ссылка на родителя
- `is_group` - является ли группой (имеет детей)

**КРИТИЧНО для fixtures:**
```
Родители ДОЛЖНЫ быть созданы ПЕРЕД детьми!
```

**Пример правильного порядка:**
```json
[
  {"name": "FST-0001", "parent": null, "lft": 1, "rgt": 10},       // Root
  {"name": "FST-0004", "parent": "FST-0001", "lft": 2, "rgt": 3},  // Child of FST-0001
  {"name": "FST-0015", "parent": "FST-0004", "lft": 4, "rgt": 5}   // Grandchild
]
```

**Утилиты для проверки:**
- `scripts/validate_fst_order.py` - проверка порядка
- `scripts/fix_fst_order.py` - автоматическое исправление

---

## 5. Fixtures - Экспорт и импорт данных

### 5.1 Что экспортируется в fixtures?

**Текущая конфигурация (v0.0.2.4):**

| Тип | Фильтр | Файл | Размер |
|-----|--------|------|--------|
| DocType | module=Documents, custom=1 | doctype.json | ~87 KB |
| DocType | module=Projects, custom=1 | doctype.json | ~87 KB |
| Server Script | все | server_script.json | ~18 KB |
| Client Script | все | client_script.json | ~12 KB |
| Custom Field | module in [Documents, Projects] | custom_field.json | 2 байт (пусто) |
| Property Setter | module in [Documents, Projects] | property_setter.json | 2 байт (пусто) |
| Folder Structure Template | все | folder_structure_template.json | ~17 KB |
| Document Naming Rule | document_type=Document | document_naming_rule.json | 296 байт |
| Workspace | title="Documents app" | workspace.json | ~2.5 KB |

### 5.2 Экспорт fixtures (из работающего сервера)

#### 5.2.1 Через bench команду

```bash
# Войти в контейнер
docker compose exec backend bash

# Экспортировать все fixtures из hooks.py
bench --site localhost export-fixtures

# Результат: обновятся файлы в company_documents/fixtures/
```

#### 5.2.2 Проверка экспортированных данных

```bash
# Размеры файлов
ls -lh company_documents/fixtures/

# Количество записей
jq 'length' company_documents/fixtures/folder_structure_template.json
# Вывод: 45

# Первая запись
jq '.[0]' company_documents/fixtures/doctype.json
```

#### 5.2.3 Критичное поле: counter в Document Naming Rule

**⚠️ ВАЖНО:** Файл `document_naming_rule.json` содержит поле `counter` которое хранит текущий счётчик нумерации документов.

**Пример:**
```json
{
  "doctype": "Document Naming Rule",
  "document_type": "Document",
  "counter": 45,  // ← ТЕКУЩЕЕ ЗНАЧЕНИЕ ИЗ РАЗРАБОТКИ!
  "prefix": "DOC-.YYYY.-",
  ...
}
```

**Проблема:** При каждой установке `company_documents` счётчик начинается с этого значения (45), а не с 0.

**Где хранится счётчик (иерархия):**
1. **Document Naming Rule.counter** (БД) - ГЛАВНЫЙ ИСТОЧНИК ПРАВДЫ
2. **tabSeries** (БД) - кэш для быстрого доступа
3. **Python memory cache** - временный кэш в runtime

**ВАЖНО:** Удаление из `tabSeries` или `tabDocument` НЕ сбрасывает счётчик!

**Правильный способ сброса:**
```python
# Удалить Document Naming Rule целиком
frappe.delete_doc("Document Naming Rule", "rule_name", force=1)

# Создать новый с counter=0
naming_rule = frappe.get_doc({
    "doctype": "Document Naming Rule",
    "document_type": "Document",
    "prefix": "DOC-.YYYY.-",
    "counter": 0,  # ← СБРОС!
    ...
})
naming_rule.insert()
frappe.db.commit()
```

**Детальная документация:** См. `docs/internals/NAMING_MECHANISM.md` и `docs/internals/FIXTURES_MECHANICS.md`

#### 5.2.4 Важные моменты при экспорте

**✅ ДЕЛАТЬ:**
- Экспортировать после каждого изменения DocType в UI
- Проверять порядок в folder_structure_template.json
- **Проверять значение `counter` в document_naming_rule.json перед релизом**
- Коммитить изменения в Git
- Проверять размер файлов (не должно быть 2 байта)

**❌ НЕ ДЕЛАТЬ:**
- Не редактировать JSON вручную (кроме порядка FST)
- Не экспортировать данные пользователей в fixtures
- Не добавлять фильтры `custom=1` для DocTypes созданных через код

### 5.3 Импорт fixtures (на новом сервере)

#### 5.3.1 Автоматический импорт при установке

```bash
bench new-site localhost \
  --install-app erpnext \
  --install-app hrms \
  --install-app raven \
  --install-app pibidav \
  --install-app company_documents  # fixtures импортируются автоматически!
```

#### 5.3.2 Ручной импорт fixtures

```bash
# Войти в контейнер
docker compose exec backend bash

# Импортировать fixtures
bench --site localhost import-app company_documents

# Или конкретный файл
bench --site localhost import-doc company_documents/fixtures/doctype.json
```

#### 5.3.3 Проверка успешности импорта

```bash
# Проверить что DocTypes созданы
bench --site localhost console
>>> frappe.get_list("DocType", filters={"app": "company_documents"})

# Проверить Server Scripts
>>> frappe.get_list("Server Script")

# Проверить Folder Structure Template
>>> frappe.get_list("Folder Structure Template")
# Должно быть 45 записей
```

### 5.4 Fixtures vs Migrations

| Аспект | Fixtures | Migrations (patches) |
|--------|----------|----------------------|
| **Назначение** | Метаданные (DocTypes, Scripts) | Изменения данных |
| **Когда использовать** | v0.0.2 (ПОЛИГОН) | v1.0.0+ (Production) |
| **Формат** | JSON файлы | Python скрипты |
| **Импорт** | При установке приложения | При `bench migrate` |
| **Идемпотентность** | Да (можно импортировать повторно) | Нет (выполняется один раз) |
| **Версионирование** | В Git | В patches.txt + файлы |

**Текущий проект:** Используем ТОЛЬКО fixtures, миграции пустые (patches.txt = 6 байт)

---

## 6. Разработка и тестирование

### 6.1 Философия ПОЛИГОН

**Что такое ПОЛИГОН?**
- Тестовый сервер, который можно ПОЛНОСТЬЮ пересоздать
- Можно сломать - не страшно
- Можно пересоздать - быстро (Docker)
- Миграции НЕ нужны - всегда чистая установка

**Когда пересоздавать:**
- ✅ После изменения fixtures
- ✅ После изменения DocTypes
- ✅ После добавления зависимостей
- ✅ Когда что-то сломалось

### 6.2 Docker Workflow

#### 6.2.1 Полное пересоздание окружения

```bash
# 1. Остановить и удалить контейнеры + volumes
docker compose down -v

# 2. Пересобрать образ (если изменился apps.json)
export APPS_JSON_BASE64=$(base64 -w 0 apps.json)
docker build \
  --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" \
  --tag custom-erpnext:v15-0.0.2.4 \
  --file images/custom/Containerfile \
  .

# 3. Запустить заново
docker compose up -d

# 4. Следить за установкой
docker compose logs -f create-site

# Ожидание: ~10-15 минут до готовности
```

#### 6.2.2 Проверка готовности

```bash
# Проверить статус контейнеров
docker compose ps

# Должно быть Running:
# - backend (Frappe)
# - frontend (Nginx)
# - db (MariaDB)
# - redis-cache
# - redis-queue
# - scheduler
# - worker

# Проверить логи
docker compose logs backend | grep "Serving"
# Вывод: Serving on http://0.0.0.0:8000

# Проверить доступность
curl http://localhost:8000/api/method/ping
# Вывод: {"message":"pong"}
```

#### 6.2.3 Частичное обновление

**Пересоздание только сайта (БЕЗ пересборки образа):**
```bash
# Остановить
docker compose stop

# Удалить только volumes сайта
docker volume rm frappe_docker_sites

# Запустить
docker compose up -d
docker compose logs -f create-site
```

### 6.3 Работа через UI (Desk)

#### 6.3.1 Создание нового DocType через UI

**Шаги:**

1. **Открыть Desk:**
   ```
   http://localhost:8000/app/doctype
   ```

2. **New DocType:**
   - Name: `My Custom DocType`
   - Module: `Documents`
   - ✅ Is Submittable (если нужен workflow)
   - ✅ Track Changes (для аудита)

3. **Добавить поля:**
   - Label: `Customer Name`
   - Type: `Link`
   - Options: `Customer`
   - Reqd: ✅

4. **Сохранить и разрешения:**
   - Save
   - Настроить permissions для ролей

5. **Экспортировать в fixtures:**
   ```bash
   docker compose exec backend bash
   bench --site localhost export-fixtures
   ```

6. **Проверить изменения:**
   ```bash
   git diff company_documents/fixtures/doctype.json
   ```

7. **Закоммитить:**
   ```bash
   git add company_documents/fixtures/doctype.json
   git commit -m "feat: Add My Custom DocType"
   ```

#### 6.3.2 Создание Server Script через UI

**Шаги:**

1. **Открыть Server Script:**
   ```
   http://localhost:8000/app/server-script
   ```

2. **New Server Script:**
   - Script Name: `Validate Document`
   - Script Type: `DocType Event`
   - Reference DocType: `Document`
   - Event: `Before Save`

3. **Код скрипта:**
   ```python
   def before_save(doc, method):
       if not doc.project:
           frappe.throw("Project is mandatory!")
   ```

4. **Сохранить и тестировать:**
   - Save
   - Попробовать создать Document без Project
   - Должна быть ошибка

5. **Экспортировать:**
   ```bash
   bench --site localhost export-fixtures
   ```

#### 6.3.3 Тестирование через Console

```bash
# Войти в Python console
docker compose exec backend bash
bench --site localhost console

# Создать тестовый документ
>>> doc = frappe.new_doc("Document")
>>> doc.project = "TEST"
>>> doc.level_1 = "FST-0001"
>>> doc.insert()

# Проверить
>>> print(doc.name)
DOC-2025-00001

# Добавить файл
>>> file_doc = frappe.get_doc({
...     "doctype": "File",
...     "file_name": "test.pdf",
...     "attached_to_doctype": "Document",
...     "attached_to_name": doc.name
... })
>>> file_doc.insert()

# Проверить синхронизацию
>>> doc.reload()
>>> doc.files[0].file_synced
1  # Файл синхронизирован в NextCloud!
```

### 6.4 Работа через консоль (bench)

#### 6.4.1 Полезные команды

```bash
# Войти в контейнер
docker compose exec backend bash

# === ИНФОРМАЦИЯ ===

# Версия Frappe
bench version

# Список сайтов
bench --site localhost list-apps

# Список DocTypes
bench --site localhost console
>>> frappe.get_list("DocType", {"app": "company_documents"})

# === БАЗА ДАННЫХ ===

# MariaDB консоль
bench --site localhost mariadb

# SQL запрос
bench --site localhost mariadb -e "SELECT name FROM tabDocument LIMIT 5;"

# === КЭШ И ОЧЕРЕДИ ===

# Очистить кэш
bench --site localhost clear-cache

# Перезапустить workers
docker compose restart worker scheduler

# === ЛОГИ ===

# Логи Frappe
docker compose logs backend

# Логи ошибок
docker compose exec backend tail -f sites/localhost/logs/error.log

# === РАЗРАБОТКА ===

# Включить dev mode
bench --site localhost set-config developer_mode 1

# Пересобрать assets
bench --site localhost build

# Перезапустить Frappe
docker compose restart backend
```

#### 6.4.2 Тестирование NextCloud синхронизации

```bash
# Войти в console
bench --site localhost console

# Проверить конфигурацию
>>> from company_documents.nextcloud_sync import get_nextcloud_config
>>> config = get_nextcloud_config()
>>> print(config)
{'url': 'https://cloud.example.com', 'user': 'admin', ...}

# Тестовое создание папки
>>> from company_documents.nextcloud_sync import create_nextcloud_folder
>>> result = create_nextcloud_folder('test_folder', config)
>>> print(result)
True  # Папка создана!

# Проверить file_id функцию
>>> from company_documents.nextcloud_sync import get_nextcloud_file_id
>>> file_id = get_nextcloud_file_id('Projects/TEST/file.pdf', config)
>>> print(file_id)
'123456'  # file_id получен!

# Полная синхронизация документа
>>> from company_documents.nextcloud_sync import sync_document_to_nextcloud
>>> result = sync_document_to_nextcloud("DOC-2025-00001")
>>> print(result)
{'success': True, 'uploaded': 3}
```

---

## 7. NextCloud интеграция

### 7.1 Архитектура синхронизации

**Файл:** `company_documents/nextcloud_sync.py` (636 строк)

**Основные функции:**

1. **`get_nextcloud_config()`** - получение настроек
2. **`get_nextcloud_file_id(file_path, config)`** - NEW v0.0.2.4! Получение file_id через PROPFIND
3. **`create_nextcloud_folder(path, config)`** - создание папки (MKCOL)
4. **`get_folder_path(doc)`** - генерация пути: `Projects/ProjectName/Level1/.../Level5`
5. **`upload_to_nextcloud(doc, method)`** - загрузка файлов (PUT)
6. **`move_files_in_nextcloud(doc, old_path)`** - перемещение (MOVE)
7. **`delete_from_nextcloud(doc, method)`** - удаление (DELETE)

### 7.2 WebDAV операции

#### 7.2.1 MKCOL - Создание папки

```python
import requests
from requests.auth import HTTPBasicAuth
from urllib.parse import quote

def create_nextcloud_folder(path, config):
    safe_path = quote(path.encode('utf-8'))
    url = f"{config['url']}/remote.php/dav/files/{config['user']}/{safe_path}"
    
    response = requests.request(
        'MKCOL',
        url,
        auth=HTTPBasicAuth(config['user'], config['password']),
        timeout=30
    )
    
    return response.status_code in [201, 405]  # 405 = уже существует
```

#### 7.2.2 PUT - Загрузка файла

```python
def upload_file_to_nextcloud(local_path, remote_path, config):
    safe_path = quote(remote_path.encode('utf-8'))
    url = f"{config['url']}/remote.php/dav/files/{config['user']}/{safe_path}"
    
    with open(local_path, 'rb') as f:
        response = requests.put(
            url,
            data=f,
            auth=HTTPBasicAuth(config['user'], config['password']),
            timeout=120
        )
    
    return response.status_code in [200, 201, 204]
```

#### 7.2.3 PROPFIND - Получение file_id (NEW v0.0.2.4)

```python
import xml.etree.ElementTree as ET

def get_nextcloud_file_id(file_path, config):
    safe_path = quote(file_path.encode('utf-8'))
    url = f"{config['url']}/remote.php/dav/files/{config['user']}/{safe_path}"
    
    propfind_xml = '''<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <oc:fileid/>
    <nc:fileid/>
  </d:prop>
</d:propfind>'''
    
    response = requests.request(
        'PROPFIND',
        url,
        data=propfind_xml,
        headers={'Depth': '0'},
        auth=HTTPBasicAuth(config['user'], config['password']),
        timeout=10
    )
    
    if response.status_code == 207:
        root = ET.fromstring(response.content)
        
        # Попробовать oc:fileid (OwnCloud)
        ns_oc = {'d': 'DAV:', 'oc': 'http://owncloud.org/ns'}
        fileid_elem = root.find('.//oc:fileid', ns_oc)
        if fileid_elem is not None:
            return fileid_elem.text
        
        # Попробовать nc:fileid (NextCloud 25+)
        ns_nc = {'d': 'DAV:', 'nc': 'http://nextcloud.org/ns'}
        fileid_elem = root.find('.//nc:fileid', ns_nc)
        if fileid_elem is not None:
            return fileid_elem.text
    
    return None
```

**Использование file_id для ссылок:**
```python
if file_id:
    # Прямая ссылка на ФАЙЛ (открывается сразу)
    file_url = f"{config['url']}/apps/files/files/{file_id}?dir=/{quote(folder_path)}&openfile=true"
else:
    # Fallback: ссылка на ПАПКУ
    file_url = f"{config['url']}/apps/files/?dir={quote(folder_path)}"
```

#### 7.2.4 MOVE - Перемещение файла

```python
def move_file_in_nextcloud(old_path, new_path, config):
    old_safe = quote(old_path.encode('utf-8'))
    new_safe = quote(new_path.encode('utf-8'))
    
    source_url = f"{config['url']}/remote.php/dav/files/{config['user']}/{old_safe}"
    dest_url = f"{config['url']}/remote.php/dav/files/{config['user']}/{new_safe}"
    
    response = requests.request(
        'MOVE',
        source_url,
        headers={'Destination': dest_url},
        auth=HTTPBasicAuth(config['user'], config['password']),
        timeout=30
    )
    
    return response.status_code in [201, 204]
```

#### 7.2.5 DELETE - Удаление файла

```python
def delete_file_from_nextcloud(path, config):
    safe_path = quote(path.encode('utf-8'))
    url = f"{config['url']}/remote.php/dav/files/{config['user']}/{safe_path}"
    
    response = requests.delete(
        url,
        auth=HTTPBasicAuth(config['user'], config['password']),
        timeout=10
    )
    
    return response.status_code in [204, 404]  # 404 = уже удален
```

### 7.3 Структура путей в NextCloud

```
NextCloud/
└── remote.php/dav/files/USERNAME/
    └── [ROOT_PATH]/                    # Опционально из настроек
        └── Projects/                   # Корневая папка проектов
            └── ProjectName/            # Название проекта
                └── Level1/             # level_1 из Document
                    └── Level2/         # level_2
                        └── Level3/     # level_3
                            └── Level4/ # level_4
                                └── Level5/  # level_5
                                    └── file.pdf  # Файл
```

**Пример полного URL:**
```
https://cloud.example.com/remote.php/dav/files/admin/Projects/TEST/Progettazione/Preliminare/file.pdf
```

**С root_path:**
```
https://cloud.example.com/remote.php/dav/files/admin/company_docs/Projects/TEST/.../file.pdf
```

### 7.4 Hooks события для синхронизации

**Когда запускается синхронизация:**

1. **`track_folder_changes(doc, method)`** - Before Save
   - Сравнивает старый и новый `get_folder_path()`
   - Если изменился → устанавливает флаг `doc._folder_changed = True`

2. **`track_file_deletions(doc, method)`** - Before Save
   - Сравнивает старый и новый списки файлов
   - Сохраняет удаленные в `doc._deleted_files`

3. **`upload_to_nextcloud(doc, method)`** - After Save (on_update)
   - Создает иерархию папок в NextCloud
   - Загружает новые файлы (`file_synced = 0`)
   - Обновляет `file_url` для уже загруженных файлов (v0.0.2.4+)
   - Устанавливает `file_synced = 1`, `uploaded_by`, `uploaded_on`

4. **`move_files_in_nextcloud(doc, old_path)`** - After Save
   - Если `doc._folder_changed == True`
   - Перемещает файлы из старой папки в новую (MOVE)
   - Удаляет пустые папки

5. **`delete_from_nextcloud(doc, method)`** - After Save
   - Если `doc._deleted_files` не пусто
   - Удаляет файлы из NextCloud (DELETE)
   - Удаляет пустые папки

---

## 8. Типичные проблемы и решения

### 8.1 Fixtures импорт

#### Проблема: TypeError при импорте FST

**Ошибка:**
```
TypeError: cannot unpack non-iterable NoneType object
```

**Причина:** Неправильный порядок в `folder_structure_template.json` - дети идут перед родителями

**Решение:**
```bash
# Проверить порядок
python scripts/validate_fst_order.py

# Автоматически исправить
python scripts/fix_fst_order.py

# Проверить изменения
git diff company_documents/fixtures/folder_structure_template.json

# Закоммитить
git add company_documents/fixtures/folder_structure_template.json
git commit -m "fix: Correct FST order"
```

#### Проблема: Empty fixtures (2 bytes)

**Симптом:** Файлы `custom_field.json`, `property_setter.json` содержат только `[]` (2 байта)

**Причина:** Нет данных для экспорта (это нормально!)

**Решение:** Оставить как есть. Если данные появятся - они будут экспортированы.

#### Проблема: DocTypes не экспортируются

**Симптом:** `doctype.json` остается старым после изменений в UI

**Причина:** Неправильный фильтр в fixtures

**Неправильно:**
```python
{
    "dt": "DocType",
    "filters": [
        ["module", "=", "Documents"],
        ["custom", "=", 1]  # ❌ DocTypes созданные через код имеют custom=0!
    ]
}
```

**Правильно:**
```python
{
    "dt": "DocType",
    "filters": [
        ["module", "=", "Documents"]
        # БЕЗ custom=1!
    ]
}
```

### 8.2 NextCloud синхронизация

#### Проблема: Files не загружаются

**Проверки:**

1. **Настройки NextCloud:**
```bash
bench --site localhost console
>>> settings = frappe.get_single("NextCloud Sync Settings")
>>> print(settings.enabled, settings.nc_url, settings.nc_username)
```

2. **Тест подключения:**
```bash
>>> from company_documents.nextcloud_sync import test_nextcloud_connection
>>> result = test_nextcloud_connection()
>>> print(result)
{'success': True, 'message': 'Подключение успешно! ✓'}
```

3. **Логи ошибок:**
```bash
docker compose exec backend tail -f sites/localhost/logs/error.log
```

4. **Проверка file_synced поля:**
```python
>>> doc = frappe.get_doc("Document", "DOC-2025-00001")
>>> print(doc.files[0].file_synced)  # Должно быть 0 или 1
```

#### Проблема: file_url указывает на папку, а не файл

**Симптом:** После v0.0.2.3 ссылки вели на папку, нужны прямые ссылки на файл

**Решение:** Обновиться до v0.0.2.4

**Проверка:**
```python
>>> doc = frappe.get_doc("Document", "DOC-2025-00001")
>>> print(doc.files[0].file_url)
# v0.0.2.3: https://cloud.example.com/apps/files/?dir=/Projects/TEST
# v0.0.2.4: https://cloud.example.com/apps/files/files/123456?dir=/Projects/TEST&openfile=true
```

**Как работает (v0.0.2.4):**
1. Файл загружается через PUT
2. Вызывается `get_nextcloud_file_id()` через PROPFIND
3. Если file_id получен → прямая ссылка с `openfile=true`
4. Если file_id недоступен → fallback на папку

#### Проблема: Неправильное поле is_synced vs file_synced

**История:**
- v0.0.2.1 - v0.0.2.3: использовалось поле `is_synced`
- v0.0.2.4: переименовано в `file_synced` (правильное название)

**Миграция не требуется** (ПОЛИГОН - устанавливаем с нуля)

### 8.3 Docker проблемы

#### Проблема: Container не стартует

**Проверка:**
```bash
# Статус контейнеров
docker compose ps

# Логи конкретного контейнера
docker compose logs backend

# Логи установки сайта
docker compose logs create-site
```

**Типичные причины:**
1. Недостаточно памяти (нужно минимум 4GB RAM)
2. Порты заняты (8000, 3306, 6379)
3. Ошибка в apps.json

#### Проблема: Сайт не создается

**Логи:**
```bash
docker compose logs create-site | grep -i error
```

**Типичные ошибки:**

1. **MariaDB не готов:**
```
Error: Can't connect to MySQL server
```
**Решение:** Подождать 30 секунд и перезапустить
```bash
docker compose restart create-site
```

2. **Приложение не установлено:**
```
App company_documents not found
```
**Решение:** Проверить что Git репозиторий доступен и ветка main существует

3. **Ошибка импорта fixtures:**
```
TypeError: cannot unpack non-iterable NoneType object
```
**Решение:** Проверить порядок FST (см. раздел 8.1)

---

## 9. Workflow разработки

### 9.1 Новая функция через UI

**Пример:** Добавить новое поле в Document

1. **Открыть DocType:**
   ```
   http://localhost:8000/app/doctype/Document
   ```

2. **Добавить поле:**
   - Label: `Customer`
   - Type: `Link`
   - Options: `Customer`
   - Insert After: `project`

3. **Сохранить:** Save

4. **Тестировать:**
   - Создать новый Document
   - Проверить что поле Customer появилось

5. **Экспортировать:**
   ```bash
   docker compose exec backend bash
   bench --site localhost export-fixtures
   ```

6. **Проверить изменения:**
   ```bash
   git diff company_documents/fixtures/doctype.json
   ```

7. **Commit:**
   ```bash
   git add company_documents/fixtures/doctype.json
   git commit -m "feat: Add customer field to Document"
   git push origin main
   ```

8. **Пересоздать сервер (для проверки):**
   ```bash
   docker compose down -v
   docker compose up -d
   ```

### 9.2 Новая функция через код

**Пример:** Добавить новую функцию в nextcloud_sync.py

1. **Редактировать код:**
   ```python
   # company_documents/nextcloud_sync.py
   
   def my_new_function(doc):
       """New function description"""
       # Implementation
       pass
   ```

2. **Добавить hook:**
   ```python
   # company_documents/hooks.py
   
   doc_events = {
       "Document": {
           "on_update": [
               # ... existing hooks
               "company_documents.nextcloud_sync.my_new_function"
           ]
       }
   }
   ```

3. **Тестировать локально:**
   ```bash
   # Перезапустить Frappe
   docker compose restart backend
   
   # Тестировать в console
   docker compose exec backend bench --site localhost console
   >>> doc = frappe.get_doc("Document", "DOC-2025-00001")
   >>> doc.save()  # Должна вызваться новая функция
   ```

4. **Обновить CHANGELOG:**
   ```markdown
   ## [0.0.2.5] - 2025-11-23
   
   ### Added
   - New function `my_new_function()` in nextcloud_sync.py
   ```

5. **Обновить версию:**
   ```python
   # company_documents/__init__.py
   __version__ = "0.0.2.5"
   
   # company_documents/hooks.py
   app_version = "0.0.2.5"
   ```

6. **Commit:**
   ```bash
   git add .
   git commit -m "feat: Add my_new_function to nextcloud_sync"
   git push origin main
   ```

### 9.3 Исправление бага

**Пример:** Исправить ошибку в get_folder_path()

1. **Воспроизвести баг:**
   ```bash
   docker compose exec backend bench --site localhost console
   >>> from company_documents.nextcloud_sync import get_folder_path
   >>> doc = frappe.get_doc("Document", "DOC-2025-00001")
   >>> path = get_folder_path(doc)
   >>> print(path)  # Ошибка!
   ```

2. **Исправить код:**
   ```python
   # company_documents/nextcloud_sync.py
   
   def get_folder_path(doc):
       if not doc.project:
           return None  # FIX: Добавлена проверка
       # ...
   ```

3. **Тестировать:**
   ```bash
   docker compose restart backend
   docker compose exec backend bench --site localhost console
   >>> # Повторить тест - должно работать
   ```

4. **Обновить CHANGELOG:**
   ```markdown
   ## [0.0.2.5] - 2025-11-23
   
   ### Fixed
   - Fixed NoneType error in get_folder_path() when project is empty
   ```

5. **Commit:**
   ```bash
   git add company_documents/nextcloud_sync.py CHANGELOG.md
   git commit -m "fix: Handle empty project in get_folder_path()"
   git push origin main
   ```

---

## 10. Чек-листы для AI

### 10.1 Перед ответом на вопрос

- [ ] Указан уровень уверенности (CERTAIN/CONFIDENT/UNCERTAIN/DON'T KNOW)
- [ ] Проверена версия (Frappe v15, ERPNext v15.83.0)
- [ ] Учтены breaking changes v14→v15
- [ ] Не предложены решения из других версий
- [ ] Проверена официальная документация (если CERTAIN)

### 10.2 При изменении fixtures

- [ ] Изменения сделаны через UI (не вручную в JSON)
- [ ] Выполнен `bench --site localhost export-fixtures`
- [ ] Проверен порядок в folder_structure_template.json
- [ ] Размер файлов проверен (не 2 байта где должно быть больше)
- [ ] Изменения закоммичены в Git
- [ ] Сервер пересоздан для проверки (docker compose down -v && up)

### 10.3 При работе с NestedSet (FST)

- [ ] Родители идут ПЕРЕД детьми в JSON
- [ ] Запущена утилита `scripts/validate_fst_order.py`
- [ ] Если ошибка - запущен `scripts/fix_fst_order.py`
- [ ] Изменения проверены в Git diff
- [ ] Тест импорта на чистом сервере

### 10.4 При добавлении нового кода

- [ ] Код следует стилю проекта
- [ ] Добавлены docstrings
- [ ] Обработаны исключения (try/except)
- [ ] Добавлены логи ошибок (`frappe.log_error()`)
- [ ] Обновлен CHANGELOG.md
- [ ] Обновлены версии (__init__.py и hooks.py)
- [ ] Код протестирован в console
- [ ] Документация обновлена (если нужно)

### 10.5 При работе с NextCloud

- [ ] Настройки NextCloud заполнены в UI
- [ ] Тест подключения пройден (`test_nextcloud_connection()`)
- [ ] Используется правильное поле `file_synced` (v0.0.2.4+)
- [ ] file_url генерируется с file_id (если возможно)
- [ ] Обработаны ошибки WebDAV (timeouts, 404, 403)
- [ ] root_path учтен в путях

### 10.6 При работе с Docker

- [ ] Контейнеры запущены (`docker compose ps`)
- [ ] Логи проверены (`docker compose logs`)
- [ ] Достаточно ресурсов (4GB RAM, 20GB disk)
- [ ] Порты свободны (8000, 3306, 6379)
- [ ] После изменений сервер пересоздан (down -v && up)

---

## Приложения

### A. Полезные ссылки

**Frappe Framework:**
- Официальная документация: https://frappeframework.com/docs/v15
- GitHub: https://github.com/frappe/frappe/tree/version-15
- Migration Guide v14→v15: https://github.com/frappe/frappe/wiki/Migrating-to-Version-15
- API Reference: https://frappeframework.com/docs/v15/api
- Forum: https://discuss.frappe.io/

**ERPNext:**
- Документация: https://docs.erpnext.com/
- GitHub: https://github.com/frappe/erpnext/tree/v15.83.0
- User Manual: https://docs.erpnext.com/docs/v15/user/manual/en

**NextCloud:**
- WebDAV API: https://docs.nextcloud.com/server/stable/developer_manual/client_apis/WebDAV/
- Files API: https://docs.nextcloud.com/server/latest/developer_manual/client_apis/WebDAV/files.html

**Docker:**
- frappe_docker: https://github.com/frappe/frappe_docker

### B. Глоссарий терминов

| Термин | Определение |
|--------|-------------|
| **Bench** | CLI инструмент для управления Frappe/ERPNext |
| **DocType** | Тип документа - аналог таблицы в БД + UI + логика |
| **Single DocType** | DocType с одной записью (settings) |
| **Child Table** | Вложенная таблица (один ко многим) |
| **Fixtures** | JSON файлы с метаданными для экспорта/импорта |
| **NestedSet** | Способ хранения дерева в реляционной БД |
| **Hook** | Точка расширения - callback на события |
| **Server Script** | Python скрипт, выполняющийся на сервере |
| **Client Script** | JS скрипт, выполняющийся в браузере |
| **WebDAV** | Протокол для работы с файлами через HTTP |
| **ПОЛИГОН** | Тестовый сервер, который можно пересоздать |

### C. Changelog v0.0.2.x

**v0.0.2.4** (2025-11-22) - 🎉 PRODUCTION READY!
- ✅ **NextCloud file_id support**: Функция `get_nextcloud_file_id()` через WebDAV PROPFIND
  - Поддержка `oc:fileid` (OwnCloud) и `nc:fileid` (NextCloud 25+)
  - Прямые ссылки на файлы с `openfile=true` вместо папок
- ✅ **Правильное имя поля**: `is_synced` → `file_synced` во всех функциях
- ✅ **Улучшенная синхронизация**:
  - Автообновление `file_url` для уже синхронизированных файлов
  - Поля `uploaded_by` и `uploaded_on` при загрузке
  - Счётчики и сообщения пользователю
  - Автосохранение после перемещения файлов
- ✅ **Чистая структура**: Удалена дублированная директория `company_documents/company_documents/`
- ✅ **Удалены legacy DocTypes**: Project Document Type, Task Employee, CILA Document Row, Task Workspace Row (оставлено 5 из 9)
- ✅ **Полностью работает из коробки**:
  - Все 5 DocTypes устанавливаются корректно
  - 45 Folder Structure Templates импортируются без ошибок
  - Server/Client Scripts работают
  - Workspace "Documents App" появляется автоматически
  - Синхронизация файлов работает (загрузка, перемещение, удаление)
  - Удаление пустых папок работает
  - Корректные ссылки на файлы в NextCloud
  - Галочки синхронизации отображаются правильно
  - pibidav не ругается при установке

**v0.0.2.3** (2025-11-22):
- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Неправильный порядок в `folder_structure_template.json`
- Исправлена версия в `__init__.py` (была 0.0.2.1)
- Добавлены утилиты для валидации FST: `validate_fst_order.py`, `fix_fst_order.py`
- Добавлен Git pre-commit hook для автоматической проверки

**v0.0.2.2** (дата неизвестна):
- Исправления fixtures импорта

**v0.0.2.1** (дата неизвестна):
- NextCloud file_id support (не реализован полностью - доделан в v0.0.2.4)

**v0.0.2.0** (дата неизвестна):
- Первая рабочая версия

---

## Заключение

Этот документ содержит всю необходимую информацию для работы AI ассистента с проектом Company Documents App.

**Ключевые принципы:**
1. ✅ Всегда указывать уровень уверенности
2. ✅ Проверять версии перед советом
3. ✅ Следовать философии ПОЛИГОН
4. ✅ Использовать fixtures вместо миграций
5. ✅ Тестировать на чистом сервере

**Обновление документа:**
- Обновлять при изменении архитектуры
- Добавлять новые проблемы и решения
- Документировать breaking changes
- Поддерживать актуальность версий

**Контакты:**
- GitHub: https://github.com/ruslankonovets-22/Company-Documents-App
- Issues: https://github.com/ruslankonovets-22/Company-Documents-App/issues

---

*Документ создан: 2025-11-22*  
*Версия документа: 1.0*  
*Для проекта: Company Documents App v0.0.2.4*
