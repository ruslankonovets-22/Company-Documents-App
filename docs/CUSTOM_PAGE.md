# Custom Page: Project Documents

> Версия: v0.0.2.7  
> Последнее обновление: 2025-01-21

## Обзор

Custom Page "Project Documents" - это интерактивная страница для просмотра документов по проектам в двух режимах: табличном (Table View) и древовидном (Tree View).

**Расположение файлов:**
```
company_documents/documents/page/project_documents/
├── __init__.py
├── project_documents.json     # Конфигурация страницы Frappe
├── project_documents.html     # HTML шаблон + CSS fallback
└── project_documents.js       # JavaScript контроллер
```

## Архитектура

### Схема взаимодействия

```
┌─────────────────────────────────────────────────────────────┐
│                        Custom Page                           │
│  project_documents.js (ProjectDocumentsController)          │
└───────────────────────────┬─────────────────────────────────┘
                            │ frappe.call()
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      api.py (Whitelisted)                    │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │get_project_document_│  │get_project_document_│          │
│  │     overview()      │  │      tree()         │          │
│  └──────────┬──────────┘  └──────────┬──────────┘          │
└─────────────┼─────────────────────────┼─────────────────────┘
              │                         │
              ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     База данных Frappe                       │
│  Project Documents + Folder Structure Template               │
└─────────────────────────────────────────────────────────────┘
```

---

## Конфигурация страницы (project_documents.json)

```json
{
    "content": null,
    "docstatus": 0,
    "doctype": "Page",
    "idx": 0,
    "modified": "2025-01-20 16:12:02.803421",
    "modified_by": "Administrator",
    "module": "Documents",
    "name": "project-documents",
    "owner": "Administrator",
    "page_name": "project-documents",
    "restrict_to_domain": "",
    "roles": [
        {"role": "System Manager"},
        {"role": "Projects User"}
    ],
    "script": null,
    "standard": "Yes",
    "style": null,
    "system_page": 0,
    "title": "Project Documents"
}
```

### Ключевые поля:
| Поле | Значение | Описание |
|------|----------|----------|
| `name` | `project-documents` | URL страницы: `/app/project-documents` |
| `module` | `Documents` | Модуль приложения |
| `roles` | System Manager, Projects User | Доступ к странице |
| `standard` | `"Yes"` | Страница из приложения (не кастомная) |

---

## JavaScript Controller (project_documents.js)

### Класс ProjectDocumentsController

```javascript
class ProjectDocumentsController {
    constructor(wrapper) {
        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: 'Project Documents',
            single_column: true
        });
        this.currentView = 'table';  // По умолчанию табличный вид
        this.currentProject = null;
        this.treeData = {};
        this.tableData = [];
        this.folderNames = {};
        this.employeeNames = {};     // Словарь ФИО сотрудников
        this.init();
    }
}
```

### Свойства контроллера

| Свойство | Тип | Описание |
|----------|-----|----------|
| `page` | Object | Frappe Page object |
| `currentView` | String | Текущий вид: `'table'` или `'tree'` |
| `currentProject` | String | Выбранный проект (name) |
| `treeData` | Object | Вложенная структура для Tree View |
| `tableData` | Array | Плоский список документов для Table View |
| `folderNames` | Object | Словарь `{fst_id: folder_name}` |
| `employeeNames` | Object | Словарь `{employee_id: full_name}` |

---

## Методы контроллера

### init()
Точка входа. Вызывает:
1. `injectStyles()` - инъекция CSS
2. `setupHeader()` - создание заголовка
3. `setupContent()` - создание контейнера
4. `renderProjectSelector()` - рендер выбора проекта

### injectStyles()

**Критически важный метод!** Frappe не всегда корректно загружает CSS из HTML-файла страницы. Решение - динамическая инъекция через JavaScript:

```javascript
injectStyles() {
    if (document.getElementById('pd-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'pd-injected-styles';
    style.textContent = `
        /* Все CSS стили страницы */
    `;
    document.head.appendChild(style);
}
```

### loadData()

Загружает данные из API в зависимости от выбранного режима:

```javascript
loadData() {
    if (!this.currentProject) return Promise.resolve();
    const promises = [];

    // Table View: плоский список документов
    promises.push(frappe.call({
        method: 'company_documents.api.get_project_document_overview',
        args: { project: this.currentProject }
    }).then(r => {
        this.tableData = r.message || [];
    }));

    // Tree View: вложенная структура + метаданные
    promises.push(frappe.call({
        method: 'company_documents.api.get_project_document_tree',
        args: { project: this.currentProject }
    }).then(r => {
        this.treeData = r.message?.tree || {};
        this.folderNames = r.message?.folder_names || {};
        this.employeeNames = r.message?.employee_names || {};
    }));

    return Promise.all(promises);
}
```

### render()

Выбирает метод рендеринга на основе `currentView`:

```javascript
render() {
    const container = this.page.main.find('.pd-content');
    if (this.currentView === 'table') {
        container.html(this.renderTableView());
    } else {
        container.html(this.renderTreeView());
    }
}
```

### bindEvents()

Обработчики событий:

```javascript
bindEvents() {
    // 1. Переключение видов (Table/Tree)
    this.page.main.on('click', '.pd-view-btn', (e) => {
        const view = $(e.currentTarget).data('view');
        this.currentView = view;
        this.page.main.find('.pd-view-btn').removeClass('active');
        $(e.currentTarget).addClass('active');
        this.render();
    });

    // 2. Сворачивание/разворачивание папок в Tree View
    this.page.main.on('click', '.pd-tree-node-content', (e) => {
        const node = $(e.currentTarget).closest('.pd-tree-node');
        const children = node.children('.pd-tree-children');
        const toggle = node.find('> .pd-tree-node-content .pd-tree-toggle');
        if (!toggle.hasClass('empty')) {
            children.slideToggle(200);
            toggle.toggleClass('expanded');
        }
    });

    // 3. Клик по документу - открытие формы
    this.page.main.on('click', '.pd-tree-document', (e) => {
        const docName = $(e.currentTarget).data('name');
        frappe.set_route('Form', 'Project Documents', docName);
    });
}
```

---

## Table View (Табличный вид)

### Структура таблицы

9 колонок с фиксированной минимальной шириной:

| # | Колонка | min-width | Описание |
|---|---------|-----------|----------|
| 1 | Путь | 200px | Полный путь: `Корень › Подпапка › Папка` |
| 2 | Документ | 150px | Имя документа (ссылка) |
| 3 | Статус | 110px | Цветной бейдж статуса |
| 4 | Дедлайн | 90px | Дата или `не задан` |
| 5 | Дата запроса | 100px | Форматированная дата |
| 6 | План дней | 80px | Количество или `—` |
| 7 | Ответственный | 120px | ФИО сотрудника |
| 8 | Комментарий | 150px | Текст комментария |
| 9 | Файлы | 250px | Список файлов в `<textarea>` |

### renderTableView()

```javascript
renderTableView() {
    let html = '<table class="pd-table"><thead><tr>';
    html += '<th style="min-width:200px">Путь</th>';
    html += '<th style="min-width:150px">Документ</th>';
    // ... остальные колонки
    html += '</tr></thead><tbody>';

    this.tableData.forEach(doc => {
        html += '<tr>';
        html += '<td>' + this.buildFullPath(doc) + '</td>';
        html += '<td><a href="/app/project-documents/' + doc.name + '">' + doc.name + '</a></td>';
        html += '<td>' + this.renderStatusBadge(doc.readiness_status) + '</td>';
        // ... остальные ячейки
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}
```

### buildFullPath()

Строит путь из иерархии папок:

```javascript
buildFullPath(doc) {
    const parts = [];
    if (doc.folder_structure_template) {
        const fstParts = doc.folder_structure_template.split('/');
        fstParts.forEach(fstId => {
            const folderName = this.folderNames[fstId] || fstId;
            parts.push(folderName);
        });
    }
    return parts.join(' › ') || 'Без папки';
}
```

### renderResponsible()

Отображает ФИО сотрудника вместо ID:

```javascript
renderResponsible(doc) {
    if (!doc.responsible_employee) return '';
    return this.employeeNames[doc.responsible_employee] || doc.responsible_employee;
}
```

---

## Tree View (Древовидный вид)

### Структура данных

```javascript
treeData = {
    "FST-001": {
        name: "Корневая папка",
        children: {
            "FST-002": {
                name: "Подпапка",
                children: {},
                documents: [
                    { name: "DOC-001", readiness_status: "approved", ... }
                ]
            }
        },
        documents: []
    }
}
```

### renderTreeView()

```javascript
renderTreeView() {
    let html = '<div class="pd-tree">';
    Object.entries(this.treeData).forEach(([fstId, folder]) => {
        html += this.renderTreeNode(fstId, folder, 0);
    });
    html += '</div>';
    return html;
}
```

### renderTreeNode() - рекурсивный метод

```javascript
renderTreeNode(fstId, node, level) {
    const folderName = node.name || this.folderNames[fstId] || fstId;
    const hasChildren = node.children && Object.keys(node.children).length > 0;
    const hasDocuments = node.documents && node.documents.length > 0;
    const isEmpty = !hasChildren && !hasDocuments;
    const childCount = this.countNodeItems(node);
    const indent = level * 20; // 20px на уровень вложенности

    let html = '<div class="pd-tree-node" data-fst="' + fstId + '" data-level="' + level + '">';
    html += '<div class="pd-tree-node-content" style="padding-left: ' + (12 + indent) + 'px;">';
    html += '<span class="pd-tree-toggle' + (isEmpty ? ' empty' : '') + '">▶</span>';
    html += '<span class="pd-tree-icon">📁</span>';
    html += '<span class="pd-tree-label">' + folderName + '</span>';
    if (childCount > 0) {
        html += ' <span class="pd-tree-count">[' + childCount + ']</span>';
    }
    html += '</div>';
    html += '<div class="pd-tree-children" style="display: none;">';

    // Рекурсивный рендер дочерних папок
    if (hasChildren) {
        Object.entries(node.children).forEach(([childFstId, childNode]) => {
            html += this.renderTreeNode(childFstId, childNode, level + 1);
        });
    }

    // Рендер документов в папке
    if (hasDocuments) {
        node.documents.forEach(doc => {
            html += this.renderTreeDocument(doc, level + 1);
        });
    }

    html += '</div></div>';
    return html;
}
```

### renderTreeDocument()

```javascript
renderTreeDocument(doc, level) {
    const indent = level * 20;
    const statusLabel = this.getStatusLabel(doc.readiness_status);
    let html = '<div class="pd-tree-document" data-name="' + doc.name + '" style="padding-left: ' + (12 + indent) + 'px;">';
    html += '<span class="pd-tree-toggle empty"></span>';
    html += '<span class="pd-tree-icon">📄</span>';
    html += '<span class="pd-tree-doc-name">' + doc.name + '</span>';
    html += ' <span style="...inline styles...">' + statusLabel + '</span>';
    html += '</div>';
    return html;
}
```

### countNodeItems() - подсчёт элементов рекурсивно

```javascript
countNodeItems(node) {
    let count = node.documents ? node.documents.length : 0;
    if (node.children) {
        Object.values(node.children).forEach(child => {
            count += this.countNodeItems(child);
        });
    }
    return count;
}
```

---

## Статусы документов

### Цветовая схема

| Статус | Метка (RU) | Background | Color |
|--------|------------|------------|-------|
| `missing` | Отсутствует | #fee2e2 | #dc2626 (красный) |
| `partial` | Частично | #ffedd5 | #ea580c (оранжевый) |
| `requested` | Запрошен | #fef3c7 | #d97706 (жёлтый) |
| `in_progress` | В работе | #e0e7ff | #4f46e5 (индиго) |
| `ready_for_review` | На проверке | #dbeafe | #2563eb (синий) |
| `approved` | Утверждён | #dcfce7 | #16a34a (зелёный) |

### getStatusLabel() и getStatusStyle()

```javascript
getStatusLabel(status) {
    const labels = {
        missing: "Отсутствует",
        partial: "Частично", 
        requested: "Запрошен",
        in_progress: "В работе",
        ready_for_review: "На проверке",
        approved: "Утверждён"
    };
    return labels[status] || status || "";
}

getStatusStyle(status) {
    const styles = {
        missing: "background:#fee2e2;color:#dc2626",
        partial: "background:#ffedd5;color:#ea580c",
        requested: "background:#fef3c7;color:#d97706",
        in_progress: "background:#e0e7ff;color:#4f46e5",
        ready_for_review: "background:#dbeafe;color:#2563eb",
        approved: "background:#dcfce7;color:#16a34a"
    };
    return styles[status] || styles.missing;
}
```

---

## CSS стили

### Важно: CSS инъекция

Frappe не всегда загружает CSS из `project_documents.html`. Поэтому все стили дублируются в методе `injectStyles()`.

### Основные классы

```css
/* Контейнер страницы */
.pd-container { padding: 15px; }

/* Выбор проекта */
.pd-project-selector { margin-bottom: 15px; max-width: 400px; }

/* Заголовок с переключателем видов */
.pd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }

/* Кнопки переключения Table/Tree */
.pd-view-btn { padding: 6px 16px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; }
.pd-view-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
.pd-view-btn:first-child { border-radius: 6px 0 0 6px; }
.pd-view-btn:last-child { border-radius: 0 6px 6px 0; }

/* Таблица */
.pd-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pd-table th { background: #f3f4f6; padding: 10px; text-align: left; }
.pd-table td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
.pd-table tbody tr:nth-child(even) { background: #f9fafb; } /* zebra stripes */
.pd-table tbody tr:hover { background: #f3f4f6; }

/* Дерево */
.pd-tree-node-content { display: flex; align-items: center; padding: 6px 12px; cursor: pointer; }
.pd-tree-node-content:hover { background: #f3f4f6; }
.pd-tree-toggle { width: 16px; margin-right: 4px; font-size: 10px; color: #6b7280; }
.pd-tree-toggle.expanded { transform: rotate(90deg); }
.pd-tree-toggle.empty { visibility: hidden; }
.pd-tree-icon { margin-right: 6px; }
.pd-tree-document { cursor: pointer; }
.pd-tree-document:hover { background: #e0e7ff; }
```

---

## API методы

Custom Page использует два API метода из `company_documents/api.py`:

### get_project_document_overview()

Возвращает плоский список документов для Table View:

```python
@frappe.whitelist()
def get_project_document_overview(project: str) -> list:
    """Плоский список документов проекта"""
    return frappe.get_all(
        "Project Documents",
        filters={"project": project},
        fields=[
            "name", "document_name", "readiness_status",
            "due_date", "request_date", "planned_days",
            "responsible_employee", "comment", "files",
            "folder_structure_template"
        ]
    )
```

### get_project_document_tree()

Возвращает вложенную структуру для Tree View:

```python
@frappe.whitelist()
def get_project_document_tree(project: str) -> dict:
    """Иерархическая структура документов"""
    # ... построение дерева ...
    return {
        "tree": tree,
        "folder_names": folder_names,
        "employee_names": employee_names  # Добавлено в v0.0.2.7
    }
```

---

## URL доступа

```
/app/project-documents
```

После выбора проекта в селекторе отображаются документы в выбранном режиме просмотра.

---

## Права доступа

Страница доступна пользователям с ролями:
- **System Manager** - полный доступ
- **Projects User** - доступ к проектам

---

## Зависимости

- Frappe v15.89.0+
- ERPNext v15.83.0+
- DocTypes: `Project Documents`, `Folder Structure Template`, `Project`, `Employee`

---

## Известные ограничения

1. **CSS загрузка** - решено через `injectStyles()`, но CSS в HTML остаётся как fallback
2. **Производительность** - при большом количестве документов (>1000) Tree View может тормозить
3. **Кэширование** - данные загружаются при каждом выборе проекта (без кэша)

---

## История изменений

| Версия | Дата | Изменения |
|--------|------|-----------|
| v0.0.2.6 | 2025-01-20 | Первоначальная реализация Custom Page |
| v0.0.2.7 | 2025-01-21 | Добавлено отображение ФИО сотрудников |
