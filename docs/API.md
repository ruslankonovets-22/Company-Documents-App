# 🔌 API Reference — Company Documents App v0.0.2.7

**Версия:** v0.0.2.7  
**Дата:** 2025-01-21  
**Файл:** `company_documents/api.py`

---

## 📋 Обзор

API модуль предоставляет **канонические методы** для всех UI компонентов приложения.
Все методы оптимизированы для производительности (2 SQL запроса вместо N+1).

### Доступные методы

| Метод | Назначение | Использование |
|-------|------------|---------------|
| `get_project_document_overview` | Flat-список документов | Таблицы, Script Report, DataTable |
| `get_project_document_tree` | Иерархическая структура | Tree View, Custom Page с деревом |
| `create_test_data` | Создание тестовых данных | Тестирование производительности |
| `cleanup_test_data` | Удаление тестовых данных | Очистка после тестов |

---

## 1. get_project_document_overview

### Описание

Получает **все документы проекта** в виде плоского списка с полными данными о файлах.
Подходит для таблиц, списков и отчётов.

### Сигнатура

```python
@frappe.whitelist()
def get_project_document_overview(project: str) -> list[dict]
```

### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `project` | str | ✅ | Имя проекта (например: "PROJ-0001") |

### Возвращаемое значение

Список словарей с полями:

```python
[
    {
        # Идентификация
        "name": "DOC-2025-00001",       # ID документа
        "project": "PROJ-0001",          # Проект
        
        # Структура папок (ссылки на Folder Structure Template)
        "level_1": "FST-0001",           # Уровень 1 (Progettazione)
        "level_2": "FST-0004",           # Уровень 2 (Preliminare)
        "level_3": "FST-0015",           # Уровень 3 или None
        "level_4": None,                 # Уровень 4 или None
        "level_5": None,                 # Уровень 5 или None
        
        # Статус
        "readiness_status": "approved",  # missing|partial|requested|in_progress|ready_for_review|approved
        
        # Даты
        "start_date": "2025-11-01",
        "planned_days": 10,
        "planned_end_date": "2025-11-11",
        "due_date": "2025-11-15",
        "overdue": 0,                    # 1 если просрочен
        
        # Файлы
        "expected_files": 3,             # Ожидаемое количество
        "files_count": 2,                # Фактическое количество
        "files": [                       # ✅ NEW: Массив файлов
            {
                "file_name": "contract.pdf",
                "file_url": "https://cloud.example.com/apps/files/files/123?..."
            },
            {
                "file_name": "annex.pdf", 
                "file_url": "https://cloud.example.com/apps/files/files/456?..."
            }
        ],
        
        # Ответственный
        "responsible_employee": "HR-EMP-00001"
    },
    # ... остальные документы
]
```

### Пример использования

**Python (Server-side):**
```python
from company_documents.api import get_project_document_overview

# Получить все документы проекта
docs = get_project_document_overview("PROJ-0001")

# Подсчитать документы по статусам
approved = sum(1 for d in docs if d["readiness_status"] == "approved")
print(f"Одобрено: {approved} из {len(docs)}")
```

**JavaScript (Client-side):**
```javascript
frappe.call({
    method: 'company_documents.api.get_project_document_overview',
    args: { project: 'PROJ-0001' },
    callback: function(r) {
        if (r.message) {
            console.log('Documents:', r.message.length);
            r.message.forEach(doc => {
                console.log(doc.name, doc.files.length, 'files');
            });
        }
    }
});
```

### Производительность

| Документов | Файлов | Время |
|------------|--------|-------|
| 50 | ~100 | ~3 ms |
| 150 | ~300 | ~7 ms |
| 500 | ~1000 | ~20 ms |

> ⚡ **Оптимизация:** 2 SQL запроса вместо N+1 (один для документов, один для всех файлов)

---

## 2. get_project_document_tree

### Описание

Получает документы проекта в виде **иерархической структуры** по уровням папок (level_1 → level_2 → ... → documents → files).
Идеально для построения Tree View и Custom Page с интерактивным деревом.

### Сигнатура

```python
@frappe.whitelist()
def get_project_document_tree(project: str) -> dict
```

### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `project` | str | ✅ | Имя проекта (например: "PROJ-0001") |

### Возвращаемое значение

```python
{
    "project": "PROJ-0001",
    
    # Словарь названий папок (FST ID → folder_name)
    "folder_names": {
        "FST-0001": "Progettazione",
        "FST-0004": "Preliminare",
        "FST-0005": "Definitivo",
        "_root": "(Без папки)"          # Для документов без папки
    },
    
    # Словарь ФИО сотрудников (Employee ID → full_name) ✅ NEW v0.0.2.7
    "employee_names": {
        "HR-EMP-00001": "Иванов Иван Иванович",
        "HR-EMP-00002": "Петров Пётр Петрович"
    },
    
    # Дерево папок и документов
    "tree": {
        "FST-0001": {                    # ID папки уровня 1
            "name": "Progettazione",     # Название папки
            "documents": [],             # Документы в этой папке (если нет детей)
            "children": {                # Вложенные папки
                "FST-0004": {
                    "name": "Preliminare",
                    "documents": [       # Документы в этой папке
                        {
                            "name": "DOC-2025-00001",
                            "readiness_status": "approved",
                            "files_count": 2,
                            "files": [
                                {"file_name": "contract.pdf", "file_url": "..."},
                                {"file_name": "annex.pdf", "file_url": "..."}
                            ]
                        }
                    ],
                    "children": {}
                },
                "FST-0005": {
                    "name": "Definitivo",
                    "documents": [...],
                    "children": {...}
                }
            }
        },
        "FST-0002": {...},               # Другие корневые папки
        "FST-0003": {...}
    }
}
```

### Визуализация структуры

```
📁 Progettazione (0 docs)
   └── 📁 Preliminare (25 docs)
        ├── 📄 DOC-2025-00001 [2 files]
        │    ├── 🔗 contract.pdf
        │    └── 🔗 annex.pdf
        └── 📄 DOC-2025-00002 [1 file]
             └── 🔗 report.xlsx
   └── 📁 Definitivo (15 docs)
        └── ...
📁 Realizzazione (30 docs)
   └── ...
📁 Amministrativi (20 docs)
   └── ...
```

### Пример использования

**JavaScript (Custom Page с Tree):**
```javascript
frappe.call({
    method: 'company_documents.api.get_project_document_tree',
    args: { project: 'PROJ-0001' },
    callback: function(r) {
        if (r.message) {
            renderTree(r.message.tree, r.message.folder_names);
        }
    }
});

function renderTree(tree, folderNames) {
    Object.keys(tree).forEach(fstId => {
        const folder = tree[fstId];
        console.log('📁', folder.name, '(', folder.documents.length, 'docs)');
        
        // Показать документы
        folder.documents.forEach(doc => {
            console.log('  📄', doc.name, '[', doc.files_count, 'files]');
            doc.files.forEach(f => {
                console.log('    🔗', f.file_name);
            });
        });
        
        // Рекурсивно для children
        if (Object.keys(folder.children).length > 0) {
            renderTree(folder.children, folderNames);
        }
    });
}
```

### Производительность

| Документов | Папок | Время |
|------------|-------|-------|
| 150 | 3 | ~10 ms |
| 500 | 10 | ~25 ms |

> 💡 **Примечание:** Метод внутри вызывает `get_project_document_overview`, затем группирует данные.

---

## 3. create_test_data

### Описание

Создаёт тестовые документы для проверки производительности.
**Только для разработки!**

### Сигнатура

```python
@frappe.whitelist()
def create_test_data(
    project_name: str = "TEST-PROJECT",
    doc_count: int = 50
) -> dict
```

### Параметры

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `project_name` | str | "TEST-PROJECT" | Имя тестового проекта |
| `doc_count` | int | 50 | Количество документов |

### Возвращаемое значение

```python
{
    "project": "TEST-PROJECT",
    "documents_created": 50,
    "document_names": ["DOC-2025-00001", "DOC-2025-00002", ...]  # первые 5
}
```

### Что создаёт

- Проект (если не существует)
- Документы с:
  - Случайными `level_1` и `level_2` из Folder Structure Template
  - Случайными статусами (missing, partial, requested, in_progress, ready_for_review, approved)
  - 1-3 тестовых файла на документ (mock URL)

### Пример

```python
# Frappe Console
from company_documents.api import create_test_data
result = create_test_data("PERF-TEST", 100)
print(f"Created {result['documents_created']} documents")
```

---

## 4. cleanup_test_data

### Описание

Удаляет тестовые данные (документы и проект).

### Сигнатура

```python
@frappe.whitelist()
def cleanup_test_data(project_name: str = "TEST-PROJECT") -> dict
```

### Параметры

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `project_name` | str | "TEST-PROJECT" | Имя проекта для удаления |

### Возвращаемое значение

```python
{
    "deleted_documents": 50,
    "project_deleted": "TEST-PROJECT"
}
```

### Пример

```python
from company_documents.api import cleanup_test_data
cleanup_test_data("PERF-TEST")
```

---

## 🔐 Безопасность

Все методы используют `@frappe.whitelist()` и проверяют права доступа:

```python
if not frappe.has_permission("Document", "read"):
    frappe.throw(_("Insufficient permissions"), frappe.PermissionError)
```

---

## 🧪 Тестирование API

### Через Frappe Console

```bash
# Войти в консоль
docker exec -it frappe_docker_test-backend-1 bench --site localhost console
```

```python
# В консоли
from company_documents.api import get_project_document_overview, get_project_document_tree

# Тест flat list
docs = get_project_document_overview("PROJ-0001")
print(f"Documents: {len(docs)}")

# Тест tree
tree = get_project_document_tree("PROJ-0001")
print(f"Folders: {len(tree['folder_names'])}")
```

### Через curl

```bash
# Flat list
curl -X POST "http://localhost:8080/api/method/company_documents.api.get_project_document_overview" \
  -H "Content-Type: application/json" \
  -d '{"project": "PROJ-0001"}' \
  --cookie "sid=YOUR_SESSION_ID"

# Tree
curl -X POST "http://localhost:8080/api/method/company_documents.api.get_project_document_tree" \
  -H "Content-Type: application/json" \
  -d '{"project": "PROJ-0001"}' \
  --cookie "sid=YOUR_SESSION_ID"
```

---

## 📊 Сравнение методов

| Критерий | `get_project_document_overview` | `get_project_document_tree` |
|----------|--------------------------------|----------------------------|
| **Формат** | Flat list | Nested hierarchy |
| **Группировка** | Нет | По level_1..5 |
| **Размер ответа** | Меньше | Больше (+ children) |
| **Использование** | Таблицы, отчёты | Tree View, Custom Page |
| **Производительность** | Быстрее | Чуть медленнее |

---

## 🔮 Планируемые методы

- [ ] `get_project_statistics(project)` — статистика по проекту
- [ ] `search_documents(query, project)` — поиск документов
- [ ] `bulk_update_status(doc_names, status)` — массовое обновление статуса

---

## 📚 См. также

- [ARCHITECTURE.md](ARCHITECTURE.md) — Архитектура приложения
- [DOCUMENT_LOGIC.md](DOCUMENT_LOGIC.md) — Логика DocType Document
- [NEXTCLOUD_SYNC.md](NEXTCLOUD_SYNC.md) — Синхронизация с NextCloud
