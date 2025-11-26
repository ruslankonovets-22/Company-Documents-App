# 📦 Fixtures - Конфигурация и экспорт

**Версия:** v0.0.2.6  
**Дата:** 2025-11-26  
**Файл:** company_documents/hooks.py

---

## 1. Что такое Fixtures?

**Fixtures** - механизм Frappe для экспорта/импорта данных:
- DocTypes
- Server Scripts
- Client Scripts
- Custom Fields
- Folder Structure Templates
- И другие метаданные

### 1.1 Зачем нужны Fixtures?

**Цель:** Перенести конфигурацию между инсталляциями

**Использование:**
- ✅ Экспорт DocTypes для установки на другой сервер
- ✅ Версионирование изменений в Git
- ✅ Автоматическая установка при `bench --install-app`

---

## 2. Текущая конфигурация fixtures (v0.0.2.6)

### 2.1 Конфигурация в hooks.py

```python
# company_documents/hooks.py

fixtures = [
    # 1. DocTypes - фильтр по app (НЕ по module!)
    {"dt": "DocType", "filters": [["app", "=", "company_documents"]]},
    
    # 2. Server Scripts - фильтр по module
    {"dt": "Server Script", "filters": [["module", "=", "Documents"]]},
    
    # 3. Client Scripts - фильтр по dt (наши DocTypes)
    {"dt": "Client Script", "filters": [
        ["dt", "in", ["Document", "Document File", "NextCloud Sync Settings", "Folder Structure Template"]]
    ]},
    
    # 4. Custom Fields
    {"dt": "Custom Field", "filters": [["module", "=", "Documents"]]},
    
    # 5. Property Setters
    {"dt": "Property Setter", "filters": [["module", "=", "Documents"]]},
    
    # 6. Folder Structure Templates (все 84 записи)
    {"dt": "Folder Structure Template"},
    
    # 7. Document Naming Rule
    {"dt": "Document Naming Rule", "filters": [["document_type", "=", "Document"]]},
    
    # 8. Workspace
    {"dt": "Workspace", "filters": [["title", "=", "Documents App"]]}
]
```

**Ключевые изменения v0.0.2.6:**
- ✅ Фильтр DocTypes по `app` вместо `module` + `custom`
- ✅ Client Scripts фильтруются по `dt` (конкретные DocTypes)
- ✅ Server Scripts фильтруются по `module=Documents`
    },
    
    # Workspace
    {
        "dt": "Workspace",
        "filters": [["title", "=", "Documents app"]]
    }
]
```

### 2.2 Что экспортируется (v0.0.2.6)

| Тип данных | Фильтр | Количество |
|------------|--------|------------|
| DocType | app=company_documents | 5 (Document, Document File, FST, NextCloud Sync Settings, Task Document Link) |
| Server Script | module=Documents | несколько |
| Client Script | dt in [Document, Document File, ...] | 6 |
| Custom Field | module=Documents | 0 (пусто) |
| Property Setter | module=Documents | 0 (пусто) |
| Folder Structure Template | все | **84** (3 корневых + 81 дочерних) |
| Document Naming Rule | document_type=Document | 1 |
| Workspace | title="Documents App" | 1 |

**⚠️ Важно:** Все DocTypes имеют `custom=1` - это позволяет устанавливать их без `developer_mode`.

---

## 3. Проблемы с фильтрами (история)

### 3.1 ❌ Проблема #1: Фильтр по module

**Неправильный фильтр:**
```python
{"dt": "DocType", "filters": [["module", "=", "Documents"]]}
```

**Что происходит:**
- Экспортирует ВСЕ DocTypes с module="Documents"
- Включает стандартные ERPNext DocTypes!
- Результат: 17 DocTypes вместо 5

**Пример нежелательных DocTypes:**
- File
- Folder
- File Permission
- и другие стандартные

### 3.2 ❌ Проблема #2: Фильтр по module + custom

**Попытка исправления:**
```python
{
    "dt": "DocType",
    "filters": [
        ["module", "=", "Documents"],
        ["custom", "=", 1]
    ]
}
```

**Что происходит:**
- Экспортирует только кастомные DocTypes
- НО: Наши DocTypes имеют `custom=0` (не кастомные!)
- Результат: Экспортирует только 2 DocType вместо 5

**Почему custom=0?**
- DocTypes созданы через код, не через UI
- Frappe считает их "встроенными" в приложение
- Флаг `custom=1` только для DocTypes созданных через Desk

### 3.3 ✅ Решение: Фильтр по app

**Правильный фильтр:**
```python
{"dt": "DocType", "filters": [["app", "=", "company_documents"]]}
```

**Почему работает:**
- Поле `app` указывает на приложение-владельца
- Экспортирует ТОЛЬКО DocTypes этого приложения
- Результат: Ровно 5 основных DocTypes

**Как установить app:**
```python
# Для каждого DocType
dt = frappe.get_doc("DocType", "Document")
dt.app = "company_documents"
dt.save()
```

---

## 4. Правильная конфигурация fixtures (будущее)

### 4.1 ✅ РЕКОМЕНДУЕМАЯ конфигурация

```python
fixtures = [
    # ✅ Использовать фильтр по app
    {
        "dt": "DocType",
        "filters": [["app", "=", "company_documents"]]
    },
    
    # Server Scripts - фильтр по module
    {
        "dt": "Server Script",
        "filters": [["module", "in", ["Documents", "Projects"]]]
    },
    
    # Client Scripts - фильтр по module
    {
        "dt": "Client Script",
        "filters": [["module", "in", ["Documents", "Projects"]]]
    },
    
    # Custom Fields
    {
        "dt": "Custom Field",
        "filters": [["module", "in", ["Documents", "Projects"]]]
    },
    
    # Property Setters
    {
        "dt": "Property Setter",
        "filters": [["module", "in", ["Documents", "Projects"]]]
    },
    
    # Folder Structure Templates
    {"dt": "Folder Structure Template"},
    
    # Document Naming Rule
    {
        "dt": "Document Naming Rule",
        "filters": [["document_type", "=", "Document"]]
    },
    
    # Workspace
    {
        "dt": "Workspace",
        "filters": [["title", "=", "Documents app"]]
    }
]
```

---

## 5. Команды для работы с fixtures

### 5.1 Экспорт fixtures

**Базовая команда:**
```bash
cd /workspace/frappe-bench
bench --site localhost export-fixtures
```

**В Docker:**
```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost export-fixtures
'
```

**Что происходит:**
1. Читает конфигурацию `fixtures` из hooks.py
2. Экспортирует данные по фильтрам
3. Сохраняет в `company_documents/fixtures/*.json`

### 5.2 Копирование fixtures на хост

```bash
# Скопировать из контейнера
docker compose cp backend:/workspace/frappe-bench/apps/company_documents/company_documents/fixtures/ \
  ./company_documents/fixtures/
```

### 5.3 Импорт fixtures

**Автоматически при установке:**
```bash
bench --install-app company_documents
```

**Вручную:**
```bash
bench --site localhost migrate
```

---

## 6. Назначение app для DocTypes

### 6.1 Зачем назначать app?

**Причины:**
- ✅ Правильный экспорт через фильтр `[["app", "=", "company_documents"]]`
- ✅ Отображение в списке DocTypes приложения
- ✅ Правильная деинсталляция приложения

### 6.2 Скрипт для назначения app

```python
# Запустить через bench console
import frappe

frappe.init()
frappe.connect()

# Список DocTypes приложения
doctypes = [
    "Document",
    "Document File",
    "Folder Structure Template",
    "NextCloud Sync Settings",
    "Task Document Link",
    "Project Document Type",
    "Task Employee",
    "CILA Document Row",
    "Task Workspace Row"
]

# Установить app для каждого
for dt_name in doctypes:
    try:
        dt = frappe.get_doc("DocType", dt_name)
        dt.app = "company_documents"
        dt.save()
        print(f"✓ Set app for {dt_name}")
    except Exception as e:
        print(f"✗ Error for {dt_name}: {str(e)}")

frappe.db.commit()
print("\nDone! Now run: bench export-fixtures")
```

### 6.3 Запуск через Docker

```bash
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost console << '\''PYEOF'\''
import frappe

frappe.init()
frappe.connect()

doctypes = ["Document", "Document File", "Folder Structure Template", "NextCloud Sync Settings", "Task Document Link"]

for dt_name in doctypes:
    dt = frappe.get_doc("DocType", dt_name)
    dt.app = "company_documents"
    dt.save()
    print(f"Set app for {dt_name}")

frappe.db.commit()
PYEOF'
```

---

## 7. Структура файлов fixtures

### 7.1 Директория fixtures

```
company_documents/fixtures/
├── doctype.json                      # 9 DocTypes
├── server_script.json                # 5 Server Scripts
├── client_script.json                # 7 Client Scripts
├── folder_structure_template.json    # 45 шаблонов
├── custom_field.json                 # Кастомные поля
├── property_setter.json              # Настройки свойств
├── document_naming_rule.json         # Правила нумерации
└── workspace.json                    # Воркспейсы
```

### 7.2 Формат файлов

**doctype.json:**
```json
[
  {
    "name": "Document",
    "module": "Documents",
    "app": "company_documents",
    "doctype": "DocType",
    "fields": [...],
    "permissions": [...]
  },
  ...
]
```

**server_script.json:**
```json
[
  {
    "name": "Document: Auto-set project name",
    "doctype": "Server Script",
    "script_type": "DocType Event",
    "reference_doctype": "Document",
    "script": "..."
  },
  ...
]
```

---

## 8. Проверка экспортированных данных

### 8.1 Подсчет DocTypes

```bash
cat company_documents/fixtures/doctype.json | \
  python3 -c "import sys, json; data = json.load(sys.stdin); print(f'Total DocTypes: {len(data)}')"
```

### 8.2 Список DocTypes

```bash
cat company_documents/fixtures/doctype.json | \
  python3 -c "import sys, json; data = json.load(sys.stdin); [print(f'- {d[\"name\"]}') for d in data]"
```

### 8.3 Проверка app для DocTypes

```bash
cat company_documents/fixtures/doctype.json | \
  python3 -c "import sys, json; data = json.load(sys.stdin); [print(f'{d[\"name\"]}: {d.get(\"app\", \"NOT SET\")}') for d in data]"
```

**Ожидаемый вывод:**
```
Document: company_documents
Document File: company_documents
Folder Structure Template: company_documents
NextCloud Sync Settings: company_documents
Task Document Link: company_documents
...
```

---

## 9. Обновление fixtures в Git

### 9.1 Workflow

```bash
# 1. Внести изменения в DocTypes через UI
# (например, добавить новое поле)

# 2. Экспортировать fixtures
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost export-fixtures
'

# 3. Скопировать на хост
docker compose cp backend:/workspace/frappe-bench/apps/company_documents/company_documents/fixtures/ \
  ./company_documents/fixtures/

# 4. Проверить изменения
git diff company_documents/fixtures/

# 5. Закоммитить
git add company_documents/fixtures/
git commit -m "feat(fixtures): add new field to Document"
git push
```

### 9.2 Что коммитить

**✅ Коммитить:**
- `fixtures/*.json` - все JSON файлы
- `hooks.py` - если изменилась конфигурация fixtures

**❌ НЕ коммитить:**
- Временные файлы
- Файлы с реальными данными (не метаданные)

---

## 10. Troubleshooting

### 10.1 Fixtures не экспортируются

**Проблема:** `bench export-fixtures` ничего не делает

**Проверка конфигурации:**
```python
# В bench console
import frappe
from company_documents import hooks

print(hooks.fixtures)
```

**Проверка наличия данных:**
```python
import frappe
frappe.init()
frappe.connect()

# Проверить DocTypes
doctypes = frappe.get_all("DocType", filters={"app": "company_documents"})
print(f"Found {len(doctypes)} DocTypes")
```

### 10.2 Экспортируются лишние DocTypes

**Проблема:** В fixtures попадают стандартные ERPNext DocTypes

**Решение:** Проверить фильтр
```python
# ❌ НЕПРАВИЛЬНО
{"dt": "DocType", "filters": [["module", "=", "Documents"]]}

# ✅ ПРАВИЛЬНО
{"dt": "DocType", "filters": [["app", "=", "company_documents"]]}
```

### 10.3 Fixtures не импортируются при установке

**Проблема:** `bench --install-app` не загружает fixtures

**Проверка:**
```bash
# Проверить наличие файлов
ls -la company_documents/fixtures/

# Проверить права доступа
ls -l company_documents/fixtures/*.json
```

**Ручной импорт:**
```bash
bench --site localhost migrate
```

---

## 11. Best Practices

### 11.1 Фильтры

**✅ DO:**
- Используйте фильтр по `app` для DocTypes
- Используйте конкретные фильтры для избежания лишних данных
- Документируйте логику фильтров

**❌ DON'T:**
- Не экспортируйте все данные без фильтров
- Не полагайтесь только на `module` для DocTypes
- Не забывайте про флаг `custom`

### 11.2 Версионирование

```python
# Добавьте версию в комментарий
fixtures = [
    # v0.0.2: Changed filter from module to app
    {
        "dt": "DocType",
        "filters": [["app", "=", "company_documents"]]
    }
]
```

### 11.3 Тестирование

**Перед коммитом:**
1. Пересоздать окружение с нуля
2. Установить приложение
3. Проверить что все DocTypes на месте

```bash
# Полный цикл тестирования
docker compose down -v
docker compose up -d
docker compose logs -f create-site

# Проверка
docker compose exec backend bench --site localhost list-apps
```

---

## 12. Folder Structure Template - Nested Set

### 12.1 Что такое Nested Set?

**Nested Set** - способ хранения иерархических данных в Frappe. FST использует его для древовидной структуры папок.

**Проблема:** При импорте fixtures порядок записей критичен - **родители должны быть перед детьми!**

### 12.2 Ошибка при неправильном порядке

```
cannot unpack non-iterable NoneType object
```

**Причина:** Frappe пытается вставить дочерний элемент, но родитель ещё не создан → `lft`, `rgt` = None.

### 12.3 Правильный порядок в JSON

```json
[
  {"name": "FST-0001", "parent_folder_structure_template": null, "level": 1},  // ✅ Root первый
  {"name": "FST-0002", "parent_folder_structure_template": null, "level": 1},  // ✅ Root
  {"name": "FST-0004", "parent_folder_structure_template": "FST-0001", "level": 2},  // ✅ Child после родителя
  ...
]
```

### 12.4 Pre-commit hook для валидации

Скрипт `scripts/validate_fst_order.py` проверяет порядок при коммите:

```bash
# Ручная проверка
python3 scripts/validate_fst_order.py

# Вывод при успехе:
# ✅ VALIDATION PASSED: All 84 records are in correct order!
# Order verification:
#   - Root elements: 3
#   - Child elements: 81
```

**Установка hook:**
```bash
./scripts/install-hooks.sh
```

---

## 13. custom=1 vs custom=0

### 13.1 В чём разница?

| Флаг | Значение | developer_mode | Где код |
|------|----------|----------------|---------|
| `custom=0` | "Стандартный" DocType | ✅ Требуется | `documents/doctype/document/` |
| `custom=1` | "Кастомный" DocType | ❌ Не требуется | Только в fixtures JSON |

### 13.2 Почему мы используем custom=1?

**Преимущества:**
- ✅ Установка без `developer_mode`
- ✅ Не нужны Python файлы структуры DocType
- ✅ Весь DocType в одном JSON

**Важно:** Логика (validate, on_update) реализована через:
- `hooks.py` → `doc_events`
- `custom/document.py` → функции

---

## 14. Миграция fixtures (будущее)

### 14.1 Когда нужны миграции?

**В v0.0.2.6:** Миграции **НЕ используются** (ПОЛИГОН)

**В будущем (v1.0.0+):**
- Изменение структуры DocType
- Добавление новых полей
- Изменение названий полей
- Удаление старых DocTypes

### 14.2 Пример миграции

```python
# company_documents/patches/v1_0/update_document_doctype.py

import frappe

def execute():
    """Добавить новое поле в Document"""
    if frappe.db.exists("DocType", "Document"):
        doc = frappe.get_doc("DocType", "Document")
        
        # Добавить поле если его нет
        if not any(f.fieldname == "new_field" for f in doc.fields):
            doc.append("fields", {
                "fieldname": "new_field",
                "label": "New Field",
                "fieldtype": "Data"
            })
            doc.save()
            
        print("✓ Document DocType updated")
```

---

## Ссылки

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - структура DocTypes
- **[DOCUMENT_LOGIC.md](DOCUMENT_LOGIC.md)** - логика работы Document
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - процесс разработки
- **[Frappe Fixtures Documentation](https://frappeframework.com/docs/user/en/basics/fixtures)** - официальная документация

---

**Последнее обновление:** 2025-11-26
