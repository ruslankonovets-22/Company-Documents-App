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
    "creation": "2025-11-27 08:00:00.000000",
    "docstatus": 0,
    "doctype": "Page",
    "icon": "file-document",
    "modified": "2025-11-27 08:00:00.000000",
    "modified_by": "Administrator",
    "module": "Documents",
    "name": "project-documents",
    "owner": "Administrator",
    "page_name": "project-documents",
    "roles": [
        {"role": "System Manager"},
        {"role": "Projects User"}
    ],
    "standard": "Yes",
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

### Инициализация страницы

```javascript
frappe.pages["project-documents"].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Project Documents",
        single_column: true
    });
    new ProjectDocumentsController(page);
};
```

### Класс ProjectDocumentsController

```javascript
class ProjectDocumentsController {
    constructor(page) {
        this.page = page;
        this.$page = $(page.body);
        this.currentView = "table";
        this.currentProject = null;
        this.treeData = null;
        this.tableData = [];
        this.folderNames = {};
        this.employeeNames = {};
        this.init();
    }
}
```

### Свойства контроллера

| Свойство | Тип | Описание |
|----------|-----|----------|
| `page` | Object | Frappe Page object (передан в constructor) |
| `$page` | jQuery | jQuery-обёртка над `page.body` |
| `currentView` | String | Текущий вид: `"table"` или `"tree"` |
| `currentProject` | String/null | Выбранный проект (name) |
| `treeData` | Object/null | Вложенная структура для Tree View |
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

### setupHeader()

Добавляет кнопку "Обновить" в заголовок страницы:

```javascript
setupHeader() {
    this.page.add_inner_button("Обновить", () => this.loadData());
}
```

### setupContent()

Создаёт основной контейнер для контента:

```javascript
setupContent() {
    this.$page.html('<div id="pd-main-content"></div>');
    this.$content = this.$page.find("#pd-main-content");
}
```

### renderProjectSelector()

Рендерит селектор выбора проекта с использованием Frappe Link Control:

```javascript
renderProjectSelector() {
    let html = '<div class="pd-project-selector">';
    html += '<div class="pd-selector-label">Выберите проект:</div>';
    html += '<div class="pd-selector-field"></div>';
    html += '</div>';
    this.$content.html(html);
    
    this.projectField = frappe.ui.form.make_control({
        df: {
            fieldtype: "Link",
            fieldname: "project",
            options: "Project",
            placeholder: "Выберите проект...",
            change: () => {
                const val = this.projectField.get_value();
                if (val) {
                    this.currentProject = val;
                    this.loadData();
                }
            }
        },
        parent: this.$content.find(".pd-selector-field"),
        render_input: true
    });
    this.projectField.$wrapper.addClass("pd-project-link");
    
    // Поддержка URL параметра для предвыбора
    const urlProject = frappe.utils.get_url_arg("project");
    if (urlProject) {
        this.projectField.set_value(urlProject);
    }
}
```

**Особенности:**
- Использует `frappe.ui.form.make_control` для создания Link поля
- При выборе проекта автоматически вызывает `loadData()`
- Поддерживает URL параметр `?project=PROJ-XXX`

### injectStyles()

**Критически важный метод!** Frappe не всегда корректно загружает CSS из HTML-файла страницы. Решение - динамическая инъекция через JavaScript:

```javascript
injectStyles() {
    if (document.getElementById("pd-custom-styles")) return;
    const style = document.createElement("style");
    style.id = "pd-custom-styles";
    style.textContent = `
        .pd-tree-node:hover > .pd-tree-node-content { background: rgba(0,0,0,0.04); }
        .pd-tree-node:hover > .pd-tree-children { background: rgba(59,130,246,0.06); border-radius: 4px; }
        .pd-tree-document:hover { background: rgba(59,130,246,0.08) !important; }
        .pd-table { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .pd-table th { background: #f9fafb; border-bottom: 2px solid #e5e7eb; padding: 12px 16px !important; }
        .pd-table td { padding: 10px 16px !important; border-bottom: 1px solid #f3f4f6; }
        .pd-table tr:nth-child(even) td { background: #fafafa; }
        .pd-table tr:hover td { background: rgba(59,130,246,0.06) !important; }
        /* ... колонки таблицы ... */
    `;
    document.head.appendChild(style);
}
```

### loadData()

Загружает данные из API параллельно для обоих режимов:

```javascript
loadData() {
    if (!this.currentProject) {
        frappe.show_alert({ message: "Выберите проект", indicator: "orange" });
        return;
    }
    
    this.$content.html('<div class="pd-loading"><span class="spinner-border spinner-border-sm"></span> Загрузка...</div>');
    
    Promise.all([
        frappe.call({ method: "company_documents.api.get_project_document_overview", args: { project: this.currentProject } }),
        frappe.call({ method: "company_documents.api.get_project_document_tree", args: { project: this.currentProject } })
    ]).then(([tableResp, treeResp]) => {
        this.tableData = tableResp.message || [];
        const treeResult = treeResp.message || {};
        this.treeData = treeResult.tree || {};
        this.folderNames = treeResult.folder_names || {};
        this.employeeNames = treeResult.employee_names || {};
        this.render();
    }).catch(err => {
        // Обработка ошибок: логирование в консоль + показ пользователю
        console.error("Load error:", err);
        this.$content.html('<div class="pd-empty"><div class="pd-empty-icon">⚠️</div><div>Ошибка загрузки данных</div></div>');
    });
}
```

#### Обработка ошибок

При ошибке загрузки данных:
1. Ошибка логируется в консоль (`console.error`)
2. Пользователю показывается empty state с иконкой ⚠️
3. Данные сбрасываются (treeData = null, tableData = [])

```javascript
```

### render()

Рендерит интерфейс с заголовком, кнопками переключения и контентом:

```javascript
render() {
    let html = '<div class="pd-header">';
    html += '<div class="pd-project-info" title="Кликни чтобы сменить проект">📁 <strong>' + this.currentProject + '</strong></div>';
    html += '<div class="pd-view-buttons">';
    html += '<button class="pd-view-btn' + (this.currentView === "table" ? " active" : "") + '" data-view="table">📋 Таблица</button>';
    html += '<button class="pd-view-btn' + (this.currentView === "tree" ? " active" : "") + '" data-view="tree">🌲 Дерево</button>';
    html += '</div></div>';
    html += '<div class="pd-content">';
    html += this.currentView === "table" ? this.renderTableView() : this.renderTreeView();
    html += '</div>';
    this.$content.html(html);
    this.bindEvents();
}
```

### bindEvents()

Обработчики событий:

```javascript
bindEvents() {
    // Переключение видов (Table/Tree)
    this.$content.find(".pd-view-btn").on("click", (e) => {
        this.currentView = $(e.currentTarget).data("view");
        this.render();
    });
    
    // Клик по названию проекта - возврат к выбору
    this.$content.find(".pd-project-info").on("click", () => {
        this.renderProjectSelector();
    });
    
    // Сворачивание/разворачивание папок в Tree View
    // Анимация: slideUp/slideDown(150) - 150ms для плавности
    this.$content.find(".pd-tree-node-content").on("click", function(e) {
        e.stopPropagation();
        const $toggle = $(this).find(".pd-tree-toggle");
        if ($toggle.hasClass("empty")) return;
        
        const $node = $(this).closest(".pd-tree-node");
        const $children = $node.find("> .pd-tree-children");
        
        if ($children.is(":visible")) {
            $children.slideUp(150);  // Анимация сворачивания 150ms
            $toggle.removeClass("expanded");
        } else {
            $children.slideDown(150); // Анимация разворачивания 150ms
            $toggle.addClass("expanded");
        }
    });
    
    // Клик по документу - открытие формы
    this.$content.find(".pd-tree-document").on("click", function(e) {
        e.stopPropagation();
        frappe.set_route("Form", "Document", $(this).data("name"));
    });
}
```

---

## Table View (Табличный вид)

### Структура таблицы

9 колонок с фиксированной минимальной шириной:

| # | Колонка | min-width | Описание |
|---|---------|-----------|----------|
| 1 | Документ | 120px | Имя документа (ссылка на форму) |
| 2 | Полный путь | 250px | Путь: `Корень › Подпапка › Папка` |
| 3 | Статус | 90px | Цветной бейдж статуса |
| 4 | Файлы | 50px | Формат: `attached/required` |
| 5 | Начало | 90px | start_date |
| 6 | Окончание | 90px | planned_end_date |
| 7 | Дни | 40px | planned_days |
| 8 | Due Date | 90px | due_date или planned_end_date |
| 9 | Ответственный | 120px | ФИО сотрудника |

### renderTableView()

```javascript
renderTableView() {
    if (!this.tableData.length) {
        return '<div class="pd-empty"><div class="pd-empty-icon">📭</div><div>Нет документов в проекте</div></div>';
    }
    let html = '<div class="pd-table-container"><table class="pd-table">';
    html += '<thead><tr><th>Документ</th><th>Полный путь</th><th>Статус</th><th>Файлы</th><th>Начало</th><th>Окончание</th><th>Дни</th><th>Due Date</th><th>Ответственный</th></tr></thead>';
    html += '<tbody>';
    this.tableData.forEach(doc => {
        const fullPath = this.buildFullPath(doc);
        html += '<tr>';
        html += '<td><a href="/app/document/' + doc.name + '" class="pd-table-link">' + doc.name + '</a></td>';
        html += '<td>' + fullPath + '</td>';
        html += '<td>' + this.renderStatusBadge(doc.readiness_status) + '</td>';
        html += '<td>' + this.renderFilesCell(doc) + '</td>';
        html += '<td>' + this.renderDate(doc.start_date) + '</td>';
        html += '<td>' + this.renderDate(doc.planned_end_date) + '</td>';
        html += '<td>' + this.renderPlannedDays(doc.planned_days) + '</td>';
        html += '<td>' + this.renderDueDate(doc) + '</td>';
        html += '<td>' + this.renderResponsible(doc.responsible_employee) + '</td>';
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
}
```

### buildFullPath()

Строит путь из иерархии папок используя поля `level_1` — `level_5`:

```javascript
buildFullPath(doc) {
    const parts = [];
    for (let i = 1; i <= 5; i++) {
        const fstId = doc["level_" + i];
        if (fstId) {
            const name = this.folderNames[fstId] || fstId;
            parts.push('<span class="pd-path-part">' + name + '</span>');
        }
    }
    return parts.length ? parts.join(' <span class="pd-path-sep">›</span> ') : '-';
}
```

### renderStatusBadge()

Рендерит цветной бейдж статуса документа (используется в Table View):

```javascript
renderStatusBadge(status) {
    const labels = {
        missing: "Отсутствует",
        partial: "Частично",
        requested: "Запрошен",
        in_progress: "В работе",
        ready_for_review: "На проверке",
        approved: "Утверждён"
    };
    const styles = {
        missing: "background:#fee2e2;color:#dc2626",
        partial: "background:#ffedd5;color:#ea580c",
        requested: "background:#fef3c7;color:#d97706",
        in_progress: "background:#e0e7ff;color:#4f46e5",
        ready_for_review: "background:#dbeafe;color:#2563eb",
        approved: "background:#dcfce7;color:#16a34a"
    };
    const style = styles[status] || styles.missing;
    return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500;' + style + '">' + (labels[status] || status || "—") + '</span>';
}
```

### renderDueDate()

Рендерит Due Date с индикацией просрочки:

```javascript
renderDueDate(doc) {
    const dateValue = doc.due_date || doc.planned_end_date;
    if (!dateValue) return '-';
    const date = frappe.datetime.str_to_user(dateValue);
    if (doc.overdue) return '<span style="color:#dc2626;font-weight:600">' + date + ' ⚠️</span>';
    return '<span>' + date + '</span>';
}
```

**Логика:**
- Использует `due_date`, если нет - `planned_end_date`
- Если `doc.overdue === true` - красный цвет + эмодзи ⚠️

### renderDate()

Универсальный рендер даты:

```javascript
renderDate(dateValue) {
    if (!dateValue) return '<span style="color:#9ca3af">—</span>';
    return frappe.datetime.str_to_user(dateValue);
}
```

### renderPlannedDays()

Рендерит количество запланированных дней:

```javascript
renderPlannedDays(days) {
    if (!days && days !== 0) return '<span style="color:#9ca3af">—</span>';
    return '<span style="font-weight:500">' + days + '</span>';
}
```

**Примечание:** Проверка `days !== 0` позволяет отображать 0 дней (а не прочерк).

### renderFilesCell()

Показывает количество прикреплённых файлов к ожидаемому:

```javascript
renderFilesCell(doc) {
    const attached = doc.files_count || 0;
    const required = doc.expected_files || 1;
    const isComplete = attached >= required;
    const textColor = isComplete ? "#16a34a" : "#d97706";
    return '<span style="color:' + textColor + ';font-weight:500">' + attached + '/' + required + '</span>';
}
```

#### Индикатор прогресса файлов (CSS)

В HTML-шаблоне определены стили для визуального прогресс-бара:

```css
/* Прогресс-бар файлов */
.pd-files-progress {
    width: 50px;
    height: 6px;
    background: var(--gray-200);
    border-radius: 3px;
    overflow: hidden;
}
.pd-files-progress-bar {
    height: 100%;
    border-radius: 3px;
}
/* Цветовая градация по заполненности */
.pd-files-progress-bar.low { background: #ef4444; }    /* < 33% - красный */
.pd-files-progress-bar.medium { background: #f59e0b; } /* 33-66% - оранжевый */
.pd-files-progress-bar.high { background: #22c55e; }   /* > 66% - зелёный */
```

**Примечание:** Визуальный прогресс-бар подготовлен в CSS, но в текущей версии JS используется текстовое отображение `attached/required`.

### renderResponsible()

Отображает ФИО сотрудника вместо ID:

```javascript
renderResponsible(employee) {
    if (!employee) return '<span style="color:#9ca3af">—</span>';
    const displayName = this.employeeNames[employee] || employee;
    return '<a href="/app/employee/' + employee + '" style="color:#2563eb;text-decoration:none" title="' + employee + '">' + displayName + '</a>';
}
```

---

## Tree View (Древовидный вид)

### Hover-эффекты

Tree View использует каскадные hover-эффекты для улучшения UX:

```css
/* Hover на папку */
.pd-tree-node-content:hover {
    background: rgba(0, 0, 0, 0.04);
}

/* Hover на папку выделяет всю ветку дочерних элементов */
.pd-tree-node:hover > .pd-tree-children {
    background: rgba(59, 130, 246, 0.04); /* Синеватая подсветка */
    border-radius: 4px;
}

/* Hover на документ */
.pd-tree-document:hover {
    background: #eff6ff; /* Светло-синий */
}
```

### Анимации сворачивания/разворачивания

Для плавности UX используются jQuery-анимации:

| Действие | Метод | Длительность |
|----------|-------|-------------|
| Сворачивание | `slideUp(150)` | 150ms |
| Разворачивание | `slideDown(150)` | 150ms |

### Структура данных

```javascript
treeData = {
    "FST-0001": {
        name: "Корневая папка",
        children: {
            "FST-0004": {
                name: "Подпапка",
                children: {},
                documents: [
                    { name: "DOC-2025-00001", readiness_status: "approved", ... }
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
    if (!this.treeData || !Object.keys(this.treeData).length) {
        return '<div class="pd-empty"><div class="pd-empty-icon">🌲</div><div>Структура пуста</div></div>';
    }
    let html = '<div class="pd-tree-toolbar">';
    html += '<button class="btn btn-xs btn-default pd-btn-expand-all">Развернуть всё</button> ';
    html += '<button class="btn btn-xs btn-default pd-btn-collapse-all">Свернуть всё</button>';
    html += '</div>';
    html += '<div class="pd-tree-container">';
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
    html += ' <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500;' + this.getStatusStyle(doc.readiness_status) + '">(' + statusLabel + ')</span>';
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

### Архитектура CSS (два источника)

CSS стили находятся в **двух местах**:

| Источник | Файл | Назначение |
|----------|------|------------|
| `injectStyles()` | project_documents.js | Динамическая инъекция (гарантированная загрузка) |
| `<style>` блок | project_documents.html | Fallback / полные стили (276 строк) |

**Причина дублирования:** Frappe не всегда корректно загружает CSS из HTML-файла страницы. Решение - динамическая инъекция критических стилей через JavaScript.

### Важно: CSS инъекция

Критические стили инжектируются в методе `injectStyles()` с уникальным ID для предотвращения повторной вставки:

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
def get_project_document_overview(project):
    """
    Получить обзор документов проекта в плоском виде.
    Оптимизировано: 2 SQL запроса вместо N+1
    """
    docs = frappe.get_all(
        "Document",  # ← DocType называется "Document"
        filters={"project": project},
        fields=[
            "name", "project",
            "level_1", "level_2", "level_3", "level_4", "level_5",
            "readiness_status",
            "start_date", "planned_days", "planned_end_date",
            "due_date", "overdue",
            "expected_files", "files_count",
            "responsible_employee"
        ],
        order_by="creation desc"
    )
    
    # ... загрузка файлов отдельным запросом ...
    
    return docs  # list с files[] для каждого документа
```

### get_project_document_tree()

Возвращает вложенную структуру для Tree View:

```python
@frappe.whitelist()
def get_project_document_tree(project):
    """Получить документы проекта в виде дерева папок."""
    # ... построение дерева по level_1 → level_2 → ... ...
    return {
        "tree": tree,               # Иерархическая структура
        "folder_names": folder_names,    # {fst_id: folder_name}
        "employee_names": employee_names # {emp_id: full_name}
    }
```

---

## URL доступа

```
/app/project-documents
```

После выбора проекта в селекторе отображаются документы в выбранном режиме просмотра.

### URL параметр для предвыбора проекта

Страница поддерживает передачу проекта через URL параметр:

```
/app/project-documents?project=PROJ-00001
```

Реализация в `renderProjectSelector()`:

```javascript
const urlProject = frappe.utils.get_url_arg("project");
if (urlProject) {
    this.projectField.set_value(urlProject);
}
```

При наличии параметра `project` в URL, проект автоматически выбирается в селекторе и загружаются его документы.

---

## Права доступа

Страница доступна пользователям с ролями:
- **System Manager** - полный доступ
- **Projects User** - доступ к проектам

---

## Зависимости

- Frappe v15.89.0+
- ERPNext v15.83.0+
- DocTypes: `Document`, `Folder Structure Template`, `Project`, `Employee`

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
