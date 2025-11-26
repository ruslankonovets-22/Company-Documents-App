# 📄 Document - Логика работы DocType

**Версия:** v0.0.2.6  
**Дата:** 2025-11-26  
**Файлы:**
- `company_documents/fixtures/doctype.json` - структура DocType
- `company_documents/custom/document.py` - validate функция
- `company_documents/nextcloud_sync.py` - синхронизация с NextCloud
- `company_documents/hooks.py` - doc_events конфигурация

---

## 1. Обзор

**Document** - основной DocType для управления документами проекта с автоматической синхронизацией в NextCloud.

### 1.1 Ключевые возможности

- ✅ Автоматическая нумерация (DOC-2025-00001)
- ✅ 5-уровневая структура папок (level_1...level_5)
- ✅ Автоматическая загрузка файлов в NextCloud
- ✅ Прямые ссылки на файлы (с file_id)
- ✅ Автоматические расчёты (planned_end_date, files_count, overdue)
- ✅ Отслеживание изменений структуры папок

---

## 2. Структура полей DocType

### 2.1 Основные поля

| Поле | Тип | Опции | Описание |
|------|-----|-------|----------|
| `naming_series` | Select | DOC-.YYYY.- | Автонумерация |
| `project` | Link | Project | Связь с проектом |
| `task` | Link | Task | Связь с задачей |
| `data` | Date | - | Дата документа |
| `status` | Select | Draft/Complete/Needs Review | Статус |
| `note` | Small Text | - | Заметки |
| `is_synced` | Check | - | Синхронизирован с NextCloud |

### 2.2 Структура папок (Level 1-5)

| Поле | Тип | Опции | Описание |
|------|-----|-------|----------|
| `level_1` | Link | Folder Structure Template | Категория (Level 1) |
| `level_2` | Link | Folder Structure Template | Подтип (Level 2) |
| `level_3` | Link | Folder Structure Template | Подтип (Level 3) |
| `level_4` | Link | Folder Structure Template | Подтип (Level 4) |
| `level_5` | Link | Folder Structure Template | Подтип (Level 5) |

**Пример пути:**
```
Projects/ProjectName/Progettazione/Elaborati/Relazioni/...
         ↑              ↑            ↑         ↑
      project       level_1      level_2   level_3
```

### 2.3 Статус и планирование

| Поле | Тип | Описание |
|------|-----|----------|
| `readiness_status` | Select | Статус готовности (missing/partial/requested/in_progress/ready_for_review/approved) |
| `files_count` | Int | **Авто:** Количество файлов |
| `expected_files` | Int | Ожидаемое количество файлов |
| `overdue` | Check | **Авто:** Просрочен ли документ |
| `responsible_employee` | Link (Employee) | Ответственный |

### 2.4 Даты

| Поле | Тип | Описание |
|------|-----|----------|
| `start_date` | Date | Дата начала работы |
| `planned_days` | Int | Планируемые дни на работу |
| `planned_end_date` | Date | **Авто:** start_date + planned_days |
| `due_date` | Date | Крайний срок (опционально) |

### 2.5 Файлы

| Поле | Тип | Опции | Описание |
|------|-----|-------|----------|
| `files` | Table | Document File | Таблица файлов |

---

## 3. Автоматические расчёты (validate hook)

### 3.1 Конфигурация в hooks.py

```python
doc_events = {
    "Document": {
        "validate": [
            "company_documents.custom.document.validate"
        ],
        ...
    }
}
```

### 3.2 Функция validate()

**Файл:** `company_documents/custom/document.py`

```python
def validate(doc, method):
    """
    Вызывается перед сохранением Document.
    """
    # 1. Auto-calculate planned_end_date
    if doc.start_date and doc.planned_days:
        doc.planned_end_date = add_days(doc.start_date, doc.planned_days)
    
    # 2. Recalculate files_count
    doc.files_count = len(doc.files) if doc.files else 0
    
    # 3. Recalculate overdue
    effective_due = doc.due_date or doc.planned_end_date
    if effective_due:
        is_overdue = (getdate(today()) > getdate(effective_due) 
                     and doc.readiness_status != "approved")
        doc.overdue = 1 if is_overdue else 0
    else:
        doc.overdue = 0
```

### 3.3 Логика расчётов

| Расчёт | Формула | Когда обновляется |
|--------|---------|-------------------|
| `planned_end_date` | `start_date + planned_days` | При каждом save |
| `files_count` | `len(doc.files)` | При каждом save |
| `overdue` | `today > (due_date или planned_end_date) AND status != approved` | При каждом save |

---

## 4. NextCloud Sync - Поток синхронизации

### 4.1 Hooks для on_update

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

### 4.2 Последовательность при Save

```
User нажимает Save
        ↓
1. validate() - авто-расчёты (planned_end_date, files_count, overdue)
        ↓
2. track_folder_changes() - проверка изменения level_1...level_5
        ↓
3. track_file_deletions() - сохранение удалённых файлов в doc._deleted_files
        ↓
4. upload_to_nextcloud() - загрузка новых файлов
   - Создание папок (MKCOL)
   - Загрузка файлов (PUT)
   - Получение file_id (PROPFIND)
   - Обновление file_url
        ↓
5. delete_from_nextcloud() - удаление файлов из NextCloud
        ↓
Document сохранён ✅
```

### 4.3 Формат file_url

**До v0.0.2.6:**
```
https://cloud.example.com/apps/files/?dir=/Projects/Test
```
❌ Открывает папку - нужно искать файл вручную

**С v0.0.2.6:**
```
https://cloud.example.com/apps/files/files/123456?dir=/Projects/Test&openfile=true
```
✅ Открывает файл напрямую

---

## 5. Child Table: Document File

### 5.1 Поля

| Поле | Тип | Описание |
|------|-----|----------|
| `file` | Attach | Прикреплённый файл (Frappe File Manager) |
| `file_name` | Data | Имя файла |
| `file_url` | Data | URL в NextCloud (с file_id) |
| `file_synced` | Check | 1 = загружен в NextCloud |
| `uploaded_by` | Link (User) | Кто загрузил |
| `uploaded_on` | Datetime | Когда загружено |

### 5.2 Жизненный цикл файла

```
1. User добавляет файл через Attach
   → file_synced = 0, file_url = null
        ↓
2. Save Document
        ↓
3. upload_to_nextcloud()
   - PUT файл в NextCloud
   - PROPFIND для получения file_id
   - file_url = ".../files/{file_id}?openfile=true"
   - file_synced = 1
        ↓
4. User кликает на file_url
   → Открывается файл в NextCloud ✅
```

---

## 6. Client Scripts

### 6.1 Document NextCloud Sync

**Назначение:** Подстраховка синхронизации через UI

```javascript
frappe.ui.form.on("Document", {
    after_save: function(frm) {
        if (!frm.doc.files || frm.doc.files.length === 0) return;
        
        frappe.call({
            method: "company_documents.nextcloud_sync.sync_document_to_nextcloud",
            args: { docname: frm.doc.name },
            callback: function(r) {
                frm.reload_doc();
            }
        });
    }
});
```

### 6.2 File URL Clickable

**Назначение:** Делает file_url кликабельной ссылкой в UI

### 6.3 Document Folder Structure Filter

**Назначение:** Фильтрация level_2...level_5 на основе parent

---

## 7. Примеры использования

### 7.1 Создание Document с файлом

1. **Documents App** → **New Document**
2. Выбрать **Project**
3. Выбрать **Level 1** (например "Progettazione")
4. Выбрать **Level 2** (например "Elaborati")
5. Добавить файл в таблицу **Files**
6. Установить **Start Date** и **Planned Days**
7. **Save**

**Результат:**
- `planned_end_date` = start_date + planned_days ✅
- `files_count` = 1 ✅
- Файл загружен в NextCloud ✅
- `file_url` содержит прямую ссылку ✅

### 7.2 Изменение структуры папок

1. Изменить **Level 2** с "Elaborati" на "Relazioni"
2. **Save**

**Результат:**
- Файлы перемещены в новую папку ✅
- `file_url` обновлён с новым путём ✅
- Старая папка удалена (если пустая) ✅

### 7.3 Удаление файла

1. Удалить строку из таблицы **Files**
2. **Save**

**Результат:**
- Файл удалён из NextCloud ✅
- `files_count` обновлён ✅

---

## 8. Troubleshooting

### 8.1 Файлы не загружаются

**Проверить:**
1. NextCloud Sync Settings → Enabled = ✓
2. URL, Username, Password заполнены
3. Права доступа к папке в NextCloud

**Логи:**
```bash
docker exec backend bench --site localhost show-error-log
```

### 8.2 file_url ведёт на папку, а не на файл

**Причина:** file_id не получен через PROPFIND

**Решение:** Перезапустить backend и пересохранить Document

### 8.3 planned_end_date не рассчитывается

**Проверить:**
1. `start_date` заполнен
2. `planned_days` > 0
3. hooks.py содержит validate event

---

## Ссылки

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - общая архитектура
- **[NEXTCLOUD_SYNC.md](NEXTCLOUD_SYNC.md)** - детали WebDAV интеграции
- **[FIXTURES.md](FIXTURES.md)** - экспорт/импорт данных

---

**Последнее обновление:** 2025-11-26
