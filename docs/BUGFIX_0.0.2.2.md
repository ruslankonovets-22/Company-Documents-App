# Bugfix v0.0.2.2 - Fixtures не импортируются при установке

**Дата:** 2025-11-21  
**Версия:** 0.0.2.2  
**Статус:** ✅ ИСПРАВЛЕНО

---

## 🐛 Описание проблемы

При новой установке приложения `company_documents` через `bench --install-app company_documents`:

1. ❌ **Folder Structure Templates не устанавливаются** (должно быть 45 шаблонов)
2. ❌ **Workspace "Documents App" не устанавливается**

### Симптомы

```bash
# После установки:
bench --site localhost console

>>> frappe.db.count("Folder Structure Template")
0  # ❌ Должно быть 45!

>>> frappe.db.exists("Workspace", "Documents App")
None  # ❌ Должен существовать!
```

---

## 🔍 Анализ причины

### Проблема 1: Фильтр `custom=1` для DocTypes

**В `hooks.py` было:**
```python
fixtures = [
    {
        "dt": "DocType",
        "filters": [
            ["module", "=", "Documents"],
            ["custom", "=", 1]  # ❌ ПРОБЛЕМА!
        ]
    }
]
```

**Почему не работает:**
- Наши DocTypes созданы через **код** (не через UI)
- Frappe считает их **встроенными** в приложение
- Флаг `custom=0` для DocTypes из кода
- Флаг `custom=1` только для DocTypes, созданных через Desk UI
- **Результат:** Фильтр `custom=1` не находит наши DocTypes → не экспортирует → не импортирует

### Проблема 2: Несовпадение регистра в Workspace

**В `hooks.py` было:**
```python
{
    "dt": "Workspace",
    "filters": [["title", "=", "Documents app"]]  # ❌ маленькая "a"
}
```

**В `fixtures/workspace.json`:**
```json
{
  "title": "Documents App"  // ✅ заглавная "A"
}
```

**Результат:** Фильтр не находит Workspace → не экспортирует → не импортирует

---

## ✅ Решение

### Исправление `hooks.py`

```python
fixtures = [
    # ✅ ИСПРАВЛЕНО: Убран фильтр custom=1
    {
        "dt": "DocType",
        "filters": [
            ["module", "=", "Documents"]
        ]
    },
    {
        "dt": "DocType",
        "filters": [
            ["module", "=", "Projects"]
        ]
    },
    {"dt": "Server Script"},
    {"dt": "Client Script"},
    {
        "dt": "Custom Field",
        "filters": [["module", "in", ["Documents", "Projects"]]]
    },
    {
        "dt": "Property Setter",
        "filters": [["module", "in", ["Documents", "Projects"]]]
    },
    {"dt": "Folder Structure Template"},
    {
        "dt": "Document Naming Rule",
        "filters": [["document_type", "=", "Document"]]
    },
    # ✅ ИСПРАВЛЕНО: "Documents app" -> "Documents App"
    {
        "dt": "Workspace",
        "filters": [["title", "=", "Documents App"]]
    }
]
```

---

## 🧪 Проверка установки

### После исправления

```bash
# 1. Обновить приложение
cd ~/frappe-bench
bench get-app company_documents --branch main

# 2. Установить на сайт
bench --site localhost install-app company_documents

# 3. Проверить
bench --site localhost console
```

### В консоли:

```python
import frappe

# Проверить Folder Structure Templates
count = frappe.db.count("Folder Structure Template")
print(f"✅ Folder Structure Templates: {count}")  # Должно быть 45

# Проверить Workspace
workspace = frappe.db.exists("Workspace", "Documents App")
print(f"✅ Workspace exists: {workspace}")  # Должно быть "Documents App"

# Посмотреть список шаблонов
templates = frappe.db.get_list("Folder Structure Template", 
    fields=["name", "folder_name"], 
    limit=5)
for t in templates:
    print(f"  - {t.name}: {t.folder_name}")
```

**Ожидаемый результат:**
```
✅ Folder Structure Templates: 45
✅ Workspace exists: Documents App
  - FST-0001: Progettazione
  - FST-0002: Esecuzione
  - FST-0003: Amministrazione
  - FST-0004: Fase preliminare
  - FST-0005: Definitivo
```

---

## 📋 Команды для проверки из SSH (Linux)

### Если у вас возникли проблемы при установке:

```bash
# 1. Проверить логи установки
docker compose logs backend | grep -A 20 "Installing company_documents"

# 2. Проверить наличие файлов fixtures
ls -lh apps/company_documents/company_documents/fixtures/

# 3. Проверить содержимое folder_structure_template.json
wc -l apps/company_documents/company_documents/fixtures/folder_structure_template.json
# Должно быть ~542 строки

# 4. Проверить количество объектов в JSON
cat apps/company_documents/company_documents/fixtures/folder_structure_template.json | \
  python3 -c "import sys, json; print(len(json.load(sys.stdin)))"
# Должно быть 45

# 5. Проверить workspace.json
cat apps/company_documents/company_documents/fixtures/workspace.json | \
  python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['title'])"
# Должно быть: Documents App
```

### Проверка в базе данных (из bench console):

```python
import frappe

# Подключиться к сайту
frappe.init(site="localhost")
frappe.connect()

# Проверить Folder Structure Templates
print("Folder Structure Templates:", frappe.db.count("Folder Structure Template"))

# Проверить Workspace
workspace = frappe.get_doc("Workspace", "Documents App")
print("Workspace title:", workspace.title)
print("Workspace links:", len(workspace.links))

# Вывести первые 5 шаблонов
for fst in frappe.db.get_all("Folder Structure Template", limit=5):
    doc = frappe.get_doc("Folder Structure Template", fst.name)
    print(f"  {doc.name}: {doc.folder_name}")
```

---

## 🚀 Для разработчиков: Переэкспорт fixtures

Если вы изменили DocTypes и хотите переэкспортировать fixtures:

```bash
# В Docker
docker compose exec backend bash -c \
  'cd /workspace/frappe-bench && bench --site localhost export-fixtures'

# Локально
cd ~/frappe-bench
bench --site localhost export-fixtures

# Скопировать из контейнера
docker compose cp backend:/workspace/frappe-bench/apps/company_documents/company_documents/fixtures/ \
  ./company_documents/fixtures/
```

---

## 📚 Связанные документы

- **[FIXTURES.md](FIXTURES.md)** - полная документация по fixtures
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - процесс разработки
- **[installation.md](installation.md)** - инструкция по установке

---

## 📝 История изменений

| Версия | Проблема | Решение |
|--------|----------|---------|
| 0.0.2 | Fixtures экспортируются | ✅ Рабочая версия |
| 0.0.2.1 | Добавлен фильтр `custom=1` | ❌ Fixtures не импортируются |
| 0.0.2.2 | Убран `custom=1`, исправлен title | ✅ ИСПРАВЛЕНО |

---

**Вывод:** Всегда проверяйте фильтры в `fixtures` - они должны **точно совпадать** с данными в JSON файлах!
