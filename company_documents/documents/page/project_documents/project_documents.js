// Project Documents Page v0.0.3.9 - Native Frappe Select Controls
// ============================================================================
// Улучшения:
// - Нативные Frappe Select контролы в sidebar (frappe.ui.form.make_control)
// - Выглядит как стандартные поля ERPNext
// - Каскадная логика: выбрал Level 1 → появляется Level 2
// - Темизация через CSS переменные Frappe
// ============================================================================

frappe.pages["project-documents"].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Project Documents",
        single_column: true
    });
    new ProjectDocumentsController(page);
};

// ============================================================================
// FOLDER FILTER MANAGER - Нативные Frappe Select контролы
// ============================================================================
class FolderFilterManager {
    constructor(controller) {
        this.controller = controller;
        this.selectedFolders = {
            level_1: null,
            level_2: null,
            level_3: null,
            level_4: null,
            level_5: null
        };
        this.controls = {}; // Frappe контролы
    }

    // Получить уникальные папки для уровня с учётом выбора на предыдущих уровнях
    getFoldersForLevel(level) {
        const folders = new Map();
        const data = this.controller.tableData;

        data.forEach(doc => {
            let matches = true;
            for (let i = 1; i < level; i++) {
                const selectedId = this.selectedFolders["level_" + i];
                if (selectedId && doc["level_" + i] !== selectedId) {
                    matches = false;
                    break;
                }
            }

            if (matches && doc["level_" + level]) {
                const fstId = doc["level_" + level];
                if (!folders.has(fstId)) {
                    const name = this.controller.folderNames[fstId] || fstId;
                    folders.set(fstId, { id: fstId, name: name });
                }
            }
        });

        return Array.from(folders.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    // Получить ID папки по имени
    getFolderIdByName(name, level) {
        const folders = this.getFoldersForLevel(level);
        const found = folders.find(f => f.name === name);
        return found ? found.id : null;
    }

    // Выбрать папку на уровне
    selectFolder(level, fstId) {
        this.selectedFolders["level_" + level] = fstId;
        
        // Сбросить выбор на более глубоких уровнях
        for (let i = level + 1; i <= 5; i++) {
            this.selectedFolders["level_" + i] = null;
        }
    }

    // Сбросить все выборы
    reset() {
        for (let i = 1; i <= 5; i++) {
            this.selectedFolders["level_" + i] = null;
        }
        this.controls = {};
    }

    // Проверить есть ли активный фильтр папок
    hasActiveFilter() {
        for (let i = 1; i <= 5; i++) {
            if (this.selectedFolders["level_" + i]) return true;
        }
        return false;
    }

    // Получить текущий путь выбора
    getSelectedPath() {
        const parts = [];
        for (let i = 1; i <= 5; i++) {
            const fstId = this.selectedFolders["level_" + i];
            if (fstId) {
                parts.push(this.controller.folderNames[fstId] || fstId);
            }
        }
        return parts;
    }

    // Фильтровать данные по выбранным папкам
    applyFilter(data) {
        return data.filter(doc => {
            for (let i = 1; i <= 5; i++) {
                const selectedId = this.selectedFolders["level_" + i];
                if (selectedId && doc["level_" + i] !== selectedId) {
                    return false;
                }
            }
            return true;
        });
    }

    // Рендер боковой панели (только контейнер, контролы создаются отдельно)
    render() {
        const isCollapsed = this.controller.sidebarCollapsed;
        let html = '<div class="pd-sidebar' + (isCollapsed ? ' collapsed' : '') + '">';
        html += '<div class="pd-sidebar-header">';
        html += '<span class="pd-sidebar-title">📁 Фильтр папок</span>';
        html += '<button type="button" class="pd-sidebar-toggle" title="Свернуть/Развернуть">';
        html += '<span class="toggle-icon">' + (isCollapsed ? '»' : '«') + '</span>';
        html += '</button>';
        html += '</div>';
        html += '<div class="pd-sidebar-body">';
        html += '<div class="pd-sidebar-content">';
        
        // Контейнеры для 5 уровней
        for (let level = 1; level <= 5; level++) {
            html += '<div class="pd-folder-field" data-level="' + level + '"></div>';
        }
        
        html += '</div>';

        // Кнопка сброса
        html += '<div class="pd-sidebar-footer">';
        html += '<button class="btn btn-xs btn-default pd-folder-reset" style="width:100%">✕ Сбросить</button>';
        html += '</div>';
        html += '</div>'; // pd-sidebar-body

        html += '</div>';
        return html;
    }

    // Инициализация Frappe контролов после рендера
    initControls() {
        const self = this;
        
        for (let level = 1; level <= 5; level++) {
            const $container = this.controller.$content.find('.pd-folder-field[data-level="' + level + '"]');
            if (!$container.length) continue;
            
            $container.empty();
            
            const folders = this.getFoldersForLevel(level);
            const prevSelected = level === 1 ? true : this.selectedFolders["level_" + (level - 1)];
            
            // Показываем уровень только если предыдущий выбран (или это level 1)
            if (!prevSelected && level > 1) {
                $container.hide();
                continue;
            }
            
            // Если нет папок на этом уровне - скрыть
            if (folders.length === 0) {
                $container.hide();
                continue;
            }
            
            $container.show();
            
            const currentValue = this.selectedFolders["level_" + level];
            const currentName = currentValue ? (this.controller.folderNames[currentValue] || currentValue) : "";
            
            // Используем Autocomplete для красивого dropdown как в ERPNext Link
            const control = frappe.ui.form.make_control({
                df: {
                    fieldtype: "Autocomplete",
                    fieldname: "folder_level_" + level,
                    label: "Уровень " + level,
                    placeholder: "Выберите папку...",
                    options: folders.map(f => f.name)
                },
                parent: $container,
                render_input: true
            });
            
            this.controls["level_" + level] = control;
            
            // Добавляем кнопку очистки
            const $inputWrapper = $container.find('.control-input-wrapper');
            const $clearBtn = $('<button type="button" class="pd-clear-btn" title="Очистить">×</button>');
            $inputWrapper.append($clearBtn);
            
            // Обработчик очистки
            $clearBtn.on('click', function(e) {
                e.stopPropagation();
                control.set_value('');
                $container.removeClass('has-value');
                self.selectFolder(level, null);
                self.controller.applyAllFilters();
                self.controller.updateTableAndFilters();
            });
            
            // Установить текущее значение
            if (currentName) {
                control.set_value(currentName);
                $container.addClass('has-value');
            }
            
            // Обработчик change
            control.$input.on("change awesomplete-selectcomplete", function() {
                const val = control.get_value();
                const fstId = val ? self.getFolderIdByName(val, level) : null;
                
                // Обновляем класс для показа/скрытия кнопки очистки
                if (val) {
                    $container.addClass('has-value');
                } else {
                    $container.removeClass('has-value');
                }
                
                self.selectFolder(level, fstId);
                self.controller.applyAllFilters();
                self.controller.updateTableAndFilters();
            });
        }
    }
}

// ============================================================================
// TABLE FILTER MANAGER - Фильтры в заголовках таблицы
// ============================================================================
class TableFilterManager {
    constructor(controller) {
        this.controller = controller;
        this.filters = {
            search: "",
            readiness_status: [],
            responsible_employee: "",
            date_range: null
        };
    }

    getStatusOptions() {
        const statuses = new Set();
        this.controller.tableData.forEach(doc => {
            if (doc.readiness_status) statuses.add(doc.readiness_status);
        });
        return Array.from(statuses);
    }

    getEmployeeOptions() {
        const employees = new Map();
        this.controller.tableData.forEach(doc => {
            if (doc.responsible_employee && !employees.has(doc.responsible_employee)) {
                const name = this.controller.employeeNames[doc.responsible_employee] || doc.responsible_employee;
                employees.set(doc.responsible_employee, name);
            }
        });
        return Array.from(employees.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    getStatusLabel(status) {
        const labels = {
            missing: "Отсутствует",
            partial: "Частично",
            requested: "Запрошен",
            in_progress: "В работе",
            ready_for_review: "На проверке",
            approved: "Утверждён"
        };
        return labels[status] || status;
    }

    applyFilters(data) {
        return data.filter(doc => {
            // Поиск по имени
            if (this.filters.search) {
                const searchLower = this.filters.search.toLowerCase();
                const nameMatch = doc.name.toLowerCase().includes(searchLower);
                // Также ищем по полному пути
                let pathMatch = false;
                for (let i = 1; i <= 5; i++) {
                    const fstId = doc["level_" + i];
                    if (fstId) {
                        const folderName = this.controller.folderNames[fstId] || "";
                        if (folderName.toLowerCase().includes(searchLower)) {
                            pathMatch = true;
                            break;
                        }
                    }
                }
                if (!nameMatch && !pathMatch) return false;
            }

            // Статус
            if (this.filters.readiness_status.length > 0) {
                if (!this.filters.readiness_status.includes(doc.readiness_status)) {
                    return false;
                }
            }

            // Ответственный
            if (this.filters.responsible_employee) {
                if (doc.responsible_employee !== this.filters.responsible_employee) {
                    return false;
                }
            }

            // Date Range
            if (this.filters.date_range && this.filters.date_range.length === 2) {
                const [from, to] = this.filters.date_range;
                const dates = [doc.start_date, doc.planned_end_date, doc.due_date].filter(d => d);
                if (dates.length === 0) return false;
                
                const inRange = dates.some(d => {
                    if (from && d < from) return false;
                    if (to && d > to) return false;
                    return true;
                });
                if (!inRange) return false;
            }

            return true;
        });
    }

    hasActiveFilters() {
        return this.filters.search || 
               this.filters.readiness_status.length > 0 || 
               this.filters.responsible_employee ||
               this.filters.date_range;
    }

    reset() {
        this.filters = {
            search: "",
            readiness_status: [],
            responsible_employee: "",
            date_range: null
        };
    }
}

// ============================================================================
// SORT MANAGER
// ============================================================================
class SortManager {
    constructor() {
        this.sortField = null;
        this.sortOrder = "asc";
    }

    getSortableColumns() {
        return {
            0: { field: "name", type: "string" },
            2: { field: "readiness_status", type: "string" },
            3: { field: "files_count", type: "number" },
            4: { field: "start_date", type: "date" },
            5: { field: "planned_end_date", type: "date" },
            6: { field: "planned_days", type: "number" },
            7: { field: "due_date", type: "date" },
            8: { field: "responsible_employee", type: "string" }
        };
    }

    sort(data, columnIndex) {
        const columns = this.getSortableColumns();
        const col = columns[columnIndex];
        if (!col) return data;

        if (this.sortField === col.field) {
            this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
        } else {
            this.sortField = col.field;
            this.sortOrder = "asc";
        }

        return [...data].sort((a, b) => {
            let valA = a[col.field];
            let valB = b[col.field];

            if (valA == null) valA = col.type === "number" ? -Infinity : "";
            if (valB == null) valB = col.type === "number" ? -Infinity : "";

            let result = 0;
            if (col.type === "number") {
                result = Number(valA) - Number(valB);
            } else if (col.type === "date") {
                result = new Date(valA || 0) - new Date(valB || 0);
            } else {
                result = String(valA).localeCompare(String(valB));
            }

            return this.sortOrder === "desc" ? -result : result;
        });
    }

    getSortIndicator(columnIndex) {
        const columns = this.getSortableColumns();
        const col = columns[columnIndex];
        if (!col) return "";
        if (this.sortField === col.field) {
            return this.sortOrder;
        }
        return "";
    }
}

// ============================================================================
// MAIN CONTROLLER
// ============================================================================
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
        
        this.folderFilter = new FolderFilterManager(this);
        this.tableFilter = new TableFilterManager(this);
        this.sortManager = new SortManager();
        this.filteredData = [];
        this.sidebarCollapsed = false;
        
        this.init();
    }

    init() {
        this.injectStyles();
        this.setupHeader();
        this.setupContent();
        this.renderProjectSelector();
    }

    setupHeader() {
        this.page.add_inner_button("Обновить", () => this.loadData());
    }

    injectStyles() {
        if (document.getElementById("pd-custom-styles")) return;
        const style = document.createElement("style");
        style.id = "pd-custom-styles";
        style.textContent = `
            /* === LAYOUT === */
            .pd-layout {
                display: flex;
                gap: 16px;
                min-height: 400px;
            }
            
            /* === SIDEBAR === */
            .pd-sidebar {
                width: 260px;
                min-width: 260px;
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                transition: width 0.3s ease, min-width 0.3s ease;
            }
            .pd-sidebar.collapsed {
                width: 44px;
                min-width: 44px;
            }
            .pd-sidebar-header {
                padding: 10px 12px;
                font-weight: 600;
                border-bottom: 1px solid var(--border-color);
                color: var(--text-color);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            .pd-sidebar-title {
                white-space: nowrap;
                overflow: hidden;
                transition: opacity 0.2s ease;
            }
            .pd-sidebar.collapsed .pd-sidebar-title {
                opacity: 0;
                width: 0;
                padding: 0;
                margin: 0;
                display: none;
            }
            .pd-sidebar.collapsed .pd-sidebar-header {
                justify-content: center;
                padding: 10px 8px;
                gap: 0;
            }
            .pd-sidebar-toggle {
                width: 28px;
                height: 28px;
                padding: 0;
                border: 1px solid var(--border-color);
                background: var(--control-bg);
                color: var(--text-muted);
                cursor: pointer;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: background 0.15s, color 0.15s, border-color 0.15s;
                font-size: 14px;
            }
            .pd-sidebar-toggle:hover {
                background: var(--subtle-accent);
                color: var(--primary);
                border-color: var(--primary);
            }
            .pd-sidebar-toggle .toggle-icon {
                line-height: 1;
            }
            .pd-sidebar-body {
                overflow: visible;
                transition: opacity 0.3s ease;
            }
            .pd-sidebar.collapsed .pd-sidebar-body {
                opacity: 0;
                height: 0;
                pointer-events: none;
                overflow: hidden;
            }
            .pd-sidebar-content {
                padding: 12px 15px;
                overflow: visible;
            }
            .pd-sidebar-footer {
                padding: 10px 15px;
                border-top: 1px solid var(--border-color);
            }
            /* Frappe контролы в sidebar */
            .pd-folder-field {
                margin-bottom: 10px;
                position: relative;
            }
            .pd-folder-field .frappe-control {
                margin-bottom: 0 !important;
            }
            .pd-folder-field .form-group {
                margin-bottom: 0 !important;
            }
            .pd-folder-field label {
                font-size: 11px;
                color: var(--text-muted);
                margin-bottom: 4px;
            }
            /* Awesomplete dropdown (autocomplete) */
            .pd-sidebar .awesomplete > ul {
                z-index: 1100 !important;
            }
            /* Кнопка очистки в Autocomplete */
            .pd-folder-field .control-input-wrapper {
                position: relative;
            }
            .pd-folder-field .pd-clear-btn {
                position: absolute;
                right: 6px;
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                padding: 0;
                border: none;
                background: var(--gray-300);
                color: var(--gray-700);
                border-radius: 50%;
                cursor: pointer;
                font-size: 10px;
                line-height: 1;
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 5;
            }
            .pd-folder-field .pd-clear-btn:hover {
                background: var(--red-100);
                color: var(--red-500);
            }
            .pd-folder-field.has-value .pd-clear-btn {
                display: flex;
            }
            .pd-folder-field.has-value input {
                padding-right: 26px;
            }
            .pd-folder-reset {
                width: 100%;
            }
            
            /* === MAIN CONTENT === */
            .pd-main {
                flex: 1;
                min-width: 0;
            }
            
            /* === TABLE === */
            .pd-table-wrapper {
                border: 1px solid var(--border-color);
                border-radius: 8px;
                overflow: visible;
            }
            .pd-table {
                width: 100%;
                border-collapse: collapse;
            }
            .pd-table thead {
                position: relative;
                z-index: 10;
            }
            .pd-table th {
                background: var(--subtle-fg);
                padding: 10px 12px !important;
                font-size: 12px;
                font-weight: 600;
                color: var(--text-color);
                text-align: left;
                white-space: nowrap;
                border-bottom: 1px solid var(--border-color);
            }
            .pd-table th.sortable {
                cursor: pointer;
                user-select: none;
                position: relative;
                padding-right: 24px !important;
            }
            .pd-table th.sortable:hover {
                background: var(--subtle-accent);
                color: var(--primary);
            }
            .pd-table th .sort-indicator {
                position: absolute;
                right: 6px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 12px;
                line-height: 1;
            }
            .pd-table th .sort-indicator::before {
                content: '▼';
                display: block;
                color: #888888;
            }
            .pd-table th .sort-indicator.asc::before {
                content: '▲';
                color: var(--primary);
            }
            .pd-table th .sort-indicator.desc::before {
                content: '▼';
                color: var(--primary);
            }
            
            /* Filter row */
            .pd-table .filter-row th {
                background: var(--card-bg);
                padding: 6px 8px !important;
                border-bottom: 2px solid var(--border-color);
                overflow: visible;
                position: relative;
                vertical-align: middle;
            }
            /* Унификация высоты всех фильтров в строке */
            .pd-table .filter-row th .frappe-control,
            .pd-table .filter-row th .form-group {
                margin: 0 !important;
                min-height: 28px !important;
            }
            .pd-table .filter-row th input.input-with-feedback,
            .pd-table .filter-row th input[data-fieldtype] {
                height: 28px !important;
                min-height: 28px !important;
                padding: 0 10px !important;
                font-size: 12px !important;
                border-radius: 6px !important;
                box-sizing: border-box !important;
            }
            .pd-filter-input {
                width: 100%;
                height: 28px;
                font-size: 12px;
                padding: 0 10px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--control-bg);
                color: var(--text-color);
                box-sizing: border-box;
            }
            .pd-filter-input:focus {
                border-color: var(--primary);
                box-shadow: 0 0 0 2px var(--primary-light);
                outline: none;
            }
            .pd-filter-input::placeholder {
                color: var(--text-muted);
            }
            
            /* Status dropdown */
            .pd-status-dropdown {
                position: relative;
            }
            .pd-status-toggle {
                width: 100%;
                height: 28px;
                font-size: 12px;
                padding: 0 28px 0 10px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--control-bg);
                color: var(--text-color);
                cursor: pointer;
                display: flex;
                align-items: center;
                position: relative;
                transition: border-color 0.15s, box-shadow 0.15s;
            }
            .pd-status-toggle::after {
                content: '';
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                border: 4px solid transparent;
                border-top-color: var(--text-muted);
                border-bottom: 0;
                transition: transform 0.2s;
            }
            .pd-status-dropdown.open .pd-status-toggle::after {
                transform: translateY(-50%) rotate(180deg);
            }
            .pd-status-toggle:hover {
                border-color: var(--gray-400);
            }
            .pd-status-toggle:focus {
                border-color: var(--primary);
                box-shadow: 0 0 0 2px var(--primary-light);
                outline: none;
            }
            .pd-status-menu {
                position: absolute;
                top: calc(100% + 4px);
                left: 0;
                z-index: 1050;
                min-width: 140px;
                padding: 6px;
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                box-shadow: var(--shadow-lg);
                opacity: 0;
                visibility: hidden;
                transform: translateY(-8px);
                transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
            }
            .pd-status-dropdown.open .pd-status-menu {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            .pd-status-menu label {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                font-size: 12px;
                cursor: pointer;
                border-radius: 4px;
                margin: 0;
                color: var(--text-color);
                transition: background 0.15s;
            }
            .pd-status-menu label:hover {
                background: var(--subtle-accent);
            }
            .pd-status-badge {
                background: var(--primary);
                color: white;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                margin-left: 4px;
            }
            
            /* Employee filter (Autocomplete style) */
            .pd-employee-filter-wrap {
                position: relative;
                height: 28px;
            }
            .pd-employee-filter-wrap .frappe-control {
                margin: 0 !important;
                height: 28px !important;
            }
            .pd-employee-filter-wrap .form-group {
                margin: 0 !important;
                height: 28px !important;
            }
            .pd-employee-filter-wrap input {
                height: 28px !important;
                min-height: 28px !important;
                max-height: 28px !important;
                font-size: 12px !important;
                padding: 0 28px 0 10px !important;
                border-radius: 6px !important;
                box-sizing: border-box !important;
            }
            .pd-employee-filter-wrap .awesomplete > ul {
                z-index: 1100 !important;
                animation: pd-dropdown-in 0.2s ease-out;
                border-radius: 6px !important;
                box-shadow: var(--shadow-lg) !important;
            }
            /* Кнопка очистки для employee */
            .pd-employee-filter-wrap .pd-employee-clear {
                position: absolute;
                right: 6px;
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                padding: 0;
                border: none;
                background: var(--gray-300);
                color: var(--gray-700);
                border-radius: 50%;
                cursor: pointer;
                font-size: 10px;
                line-height: 1;
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 5;
            }
            .pd-employee-filter-wrap .pd-employee-clear:hover {
                background: var(--red-100);
                color: var(--red-500);
            }
            .pd-employee-filter-wrap.has-value .pd-employee-clear {
                display: flex;
            }
            .pd-employee-filter-wrap.has-value input {
                padding-right: 28px !important;
            }
            
            /* Awesomplete animation for all filters */
            .pd-sidebar .awesomplete > ul,
            .pd-employee-filter-wrap .awesomplete > ul {
                animation: pd-dropdown-in 0.2s ease-out;
            }
            
            @keyframes pd-dropdown-in {
                from {
                    opacity: 0;
                    transform: translateY(-8px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* Date range in header */
            .pd-date-filter-wrap {
                display: flex;
                align-items: center;
                height: 28px;
            }
            .pd-date-filter-wrap .frappe-control {
                margin: 0 !important;
                height: 28px !important;
            }
            .pd-date-filter-wrap .form-group {
                margin: 0 !important;
                height: 28px !important;
            }
            .pd-date-filter-wrap input {
                height: 28px !important;
                min-height: 28px !important;
                max-height: 28px !important;
                font-size: 12px !important;
                padding: 0 10px !important;
                border-radius: 6px !important;
                box-sizing: border-box !important;
            }
            .pd-date-reset {
                width: 22px;
                height: 22px;
                padding: 0;
                border: 1px solid var(--border-color);
                background: var(--control-bg);
                color: var(--text-muted);
                border-radius: 4px;
                cursor: pointer;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                transition: all 0.15s;
                margin: 0 auto;
            }
            .pd-date-reset:hover {
                background: var(--red-100);
                border-color: var(--red-300);
                color: var(--red-500);
            }
            .pd-date-reset.visible {
                display: flex;
            }
            
            /* Data rows */
            .pd-table td {
                padding: 8px 12px !important;
                border-bottom: 1px solid var(--border-color);
                font-size: 13px;
                color: var(--text-color);
            }
            .pd-table tbody tr:nth-child(even) td {
                background: var(--subtle-fg);
            }
            .pd-table tbody tr:hover td {
                background: var(--highlight-color) !important;
            }
            
            /* Column widths */
            .pd-table th:nth-child(1), .pd-table td:nth-child(1) { min-width: 100px; }
            .pd-table th:nth-child(2), .pd-table td:nth-child(2) { min-width: 180px; }
            .pd-table th:nth-child(3), .pd-table td:nth-child(3) { min-width: 80px; }
            .pd-table th:nth-child(4), .pd-table td:nth-child(4) { min-width: 45px; text-align: center; }
            .pd-table th:nth-child(5), .pd-table td:nth-child(5) { min-width: 80px; }
            .pd-table th:nth-child(6), .pd-table td:nth-child(6) { min-width: 80px; }
            .pd-table th:nth-child(7), .pd-table td:nth-child(7) { min-width: 35px; text-align: center; }
            .pd-table th:nth-child(8), .pd-table td:nth-child(8) { min-width: 85px; }
            .pd-table th:nth-child(9), .pd-table td:nth-child(9) { min-width: 100px; }
            
            /* === INFO BAR === */
            .pd-info-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                font-size: 12px;
                color: var(--text-muted);
            }
            .pd-info-bar .pd-path {
                color: var(--text-color);
            }
            
            /* === TREE VIEW === */
            .pd-tree-node { position: relative; }
            .pd-tree-node-content { 
                display: flex;
                align-items: center;
                padding: 4px 8px;
                cursor: pointer;
                border-radius: 4px;
            }
            .pd-tree-node:hover > .pd-tree-node-content { background: var(--subtle-accent); }
            .pd-tree-document { 
                display: flex;
                align-items: center;
                padding: 4px 8px;
                cursor: pointer;
                border-radius: 4px;
            }
            .pd-tree-document:hover { background: var(--highlight-color) !important; }
            
            /* Подсветка цепочки папок при наведении на документ - градиент по глубине */
            /* depth-1 = ближайший к документу (самый яркий) */
            .pd-tree-node.in-path.depth-1 > .pd-tree-node-content { background: rgba(59, 130, 246, 0.25); }
            .pd-tree-node.in-path.depth-2 > .pd-tree-node-content { background: rgba(59, 130, 246, 0.20); }
            .pd-tree-node.in-path.depth-3 > .pd-tree-node-content { background: rgba(59, 130, 246, 0.16); }
            .pd-tree-node.in-path.depth-4 > .pd-tree-node-content { background: rgba(59, 130, 246, 0.12); }
            .pd-tree-node.in-path.depth-5 > .pd-tree-node-content { background: rgba(59, 130, 246, 0.10); }
            .pd-tree-node.in-path.depth-6 > .pd-tree-node-content { background: rgba(59, 130, 246, 0.08); }
            .pd-tree-document.hovered { background: rgba(59, 130, 246, 0.30); border-radius: 4px; }
            
            /* === HEADER === */
            .pd-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid var(--border-color);
            }
            .pd-project-info {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 18px;
                font-weight: 600;
                color: var(--heading-color);
            }
            .pd-project-info .pd-project-name {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .pd-project-reset {
                width: 22px;
                height: 22px;
                padding: 0;
                border: 1px solid var(--border-color);
                background: var(--control-bg);
                color: var(--text-muted);
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                transition: all 0.15s;
            }
            .pd-project-reset:hover {
                background: var(--red-100);
                border-color: var(--red-300);
                color: var(--red-500);
            }
            
            /* === VIEW TABS === */
            .pd-view-tabs {
                display: flex;
                background: var(--control-bg);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 4px;
                gap: 4px;
            }
            .pd-view-tab {
                padding: 8px 16px;
                border: none;
                background: transparent;
                color: var(--text-muted);
                font-size: 13px;
                font-weight: 500;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .pd-view-tab:hover:not(.active) {
                background: var(--gray-300);
                color: var(--text-color);
            }
            [data-theme="dark"] .pd-view-tab:hover:not(.active),
            .dark .pd-view-tab:hover:not(.active) {
                background: var(--gray-600);
                color: var(--text-light);
            }
            .pd-view-tab.active {
                background: var(--gray-800);
                color: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            }
            [data-theme="dark"] .pd-view-tab.active,
            .dark .pd-view-tab.active {
                background: var(--gray-100);
                color: var(--gray-900);
            }
            
            /* Employee link */
            .pd-employee-link {
                color: var(--text-color) !important;
                text-decoration: none;
            }
            .pd-employee-link:hover {
                color: var(--primary) !important;
                text-decoration: underline;
            }
            
            /* View transition animation */
            .pd-content-area {
                animation: pd-fade-in 0.25s ease-out;
            }
            @keyframes pd-fade-in {
                from {
                    opacity: 0.3;
                    transform: translateY(4px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* === EMPTY STATE === */
            .pd-empty {
                text-align: center;
                padding: 40px;
                color: var(--text-muted);
            }
            .pd-empty-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }
        `;
        document.head.appendChild(style);
    }

    setupContent() {
        this.$page.html('<div id="pd-main-content"></div>');
        this.$content = this.$page.find("#pd-main-content");
    }

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
        
        const urlProject = frappe.utils.get_url_arg("project");
        if (urlProject) {
            this.projectField.set_value(urlProject);
        }
    }

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
            
            // Сброс фильтров при загрузке нового проекта
            this.folderFilter.reset();
            this.tableFilter.reset();
            
            this.applyAllFilters();
            this.render();
        }).catch(err => {
            console.error("Load error:", err);
            this.$content.html('<div class="pd-empty"><div class="pd-empty-icon">⚠️</div><div>Ошибка загрузки данных</div></div>');
        });
    }

    applyAllFilters() {
        let data = this.tableData;
        data = this.folderFilter.applyFilter(data);
        data = this.tableFilter.applyFilters(data);
        
        // Применить сортировку
        if (this.sortManager.sortField) {
            const columns = this.sortManager.getSortableColumns();
            const colIndex = Object.keys(columns).find(k => columns[k].field === this.sortManager.sortField);
            if (colIndex !== undefined) {
                const savedOrder = this.sortManager.sortOrder;
                this.sortManager.sortField = null;
                data = this.sortManager.sort(data, parseInt(colIndex));
                this.sortManager.sortOrder = savedOrder;
            }
        }
        
        this.filteredData = data;
    }

    // Обновить таблицу и sidebar контролы БЕЗ полного перерендера
    updateTableAndFilters() {
        // Обновить таблицу
        const $tbody = this.$content.find(".pd-table tbody");
        if ($tbody.length) {
            let html = '';
            if (this.filteredData.length === 0) {
                html = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted)">Нет документов по фильтрам</td></tr>';
            } else {
                this.filteredData.forEach(doc => {
                    html += '<tr>';
                    html += '<td><a href="/app/document/' + doc.name + '">' + doc.name + '</a></td>';
                    html += '<td>' + this.buildFullPath(doc) + '</td>';
                    html += '<td>' + this.renderStatusBadge(doc.readiness_status) + '</td>';
                    html += '<td>' + this.renderFilesCell(doc) + '</td>';
                    html += '<td>' + this.renderDate(doc.start_date) + '</td>';
                    html += '<td>' + this.renderDate(doc.planned_end_date) + '</td>';
                    html += '<td>' + this.renderPlannedDays(doc.planned_days) + '</td>';
                    html += '<td>' + this.renderDueDate(doc) + '</td>';
                    html += '<td>' + this.renderResponsible(doc.responsible_employee) + '</td>';
                    html += '</tr>';
                });
            }
            $tbody.html(html);
        }
        
        // Обновить info bar
        this.$content.find(".pd-info-bar").replaceWith(this.renderInfoBar());
        
        // Обновить sidebar контролы (каскад)
        this.folderFilter.initControls();
    }

    render() {
        let html = '<div class="pd-header">';
        html += '<div class="pd-project-info">';
        html += '<span class="pd-project-name">📁 <strong>' + this.currentProject + '</strong></span>';
        html += '<button type="button" class="pd-project-reset" title="Сменить проект">✕</button>';
        html += '</div>';
        html += '<div class="pd-view-tabs">';
        html += '<button class="pd-view-tab' + (this.currentView === "table" ? " active" : "") + '" data-view="table">📋 Таблица</button>';
        html += '<button class="pd-view-tab' + (this.currentView === "tree" ? " active" : "") + '" data-view="tree">🌲 Дерево</button>';
        html += '</div></div>';
        
        if (this.currentView === "table") {
            html += '<div class="pd-content-area">';
            html += '<div class="pd-layout">';
            html += this.folderFilter.render();
            html += '<div class="pd-main">';
            html += this.renderInfoBar();
            html += this.renderTableView();
            html += '</div>';
            html += '</div>';
            html += '</div>';
        } else {
            html += '<div class="pd-content-area">';
            html += '<div class="pd-content">';
            html += this.renderTreeView();
            html += '</div>';
            html += '</div>';
        }
        
        this.$content.html(html);
        this.bindEvents();
        
        if (this.currentView === "table") {
            this.initTableFilters();
            // Инициализация Frappe контролов для sidebar
            this.folderFilter.initControls();
        }
    }

    renderInfoBar() {
        const total = this.tableData.length;
        const filtered = this.filteredData.length;
        const path = this.folderFilter.getSelectedPath();
        
        let html = '<div class="pd-info-bar">';
        html += '<div>';
        if (path.length > 0) {
            html += '<span class="pd-path">📂 ' + path.join(' › ') + '</span>';
        }
        html += '</div>';
        html += '<div>Показано ' + filtered + ' из ' + total + '</div>';
        html += '</div>';
        return html;
    }

    renderTableView() {
        if (!this.tableData.length) {
            return '<div class="pd-empty"><div class="pd-empty-icon">📭</div><div>Нет документов в проекте</div></div>';
        }

        const statuses = this.tableFilter.getStatusOptions();
        const employees = this.tableFilter.getEmployeeOptions();

        let html = '<div class="pd-table-wrapper"><table class="pd-table">';
        
        // Header row 1 - названия с сортировкой
        html += '<thead>';
        html += '<tr class="header-row">';
        html += '<th class="sortable" data-col="0">Документ<span class="sort-indicator ' + this.sortManager.getSortIndicator(0) + '"></span></th>';
        html += '<th>Полный путь</th>';
        html += '<th class="sortable" data-col="2">Статус<span class="sort-indicator ' + this.sortManager.getSortIndicator(2) + '"></span></th>';
        html += '<th class="sortable" data-col="3">Файлы<span class="sort-indicator ' + this.sortManager.getSortIndicator(3) + '"></span></th>';
        html += '<th class="sortable" data-col="4">Начало<span class="sort-indicator ' + this.sortManager.getSortIndicator(4) + '"></span></th>';
        html += '<th class="sortable" data-col="5">Окончание<span class="sort-indicator ' + this.sortManager.getSortIndicator(5) + '"></span></th>';
        html += '<th class="sortable" data-col="6">Дни<span class="sort-indicator ' + this.sortManager.getSortIndicator(6) + '"></span></th>';
        html += '<th class="sortable" data-col="7">Due Date<span class="sort-indicator ' + this.sortManager.getSortIndicator(7) + '"></span></th>';
        html += '<th class="sortable" data-col="8">Ответств.<span class="sort-indicator ' + this.sortManager.getSortIndicator(8) + '"></span></th>';
        html += '</tr>';
        
        // Header row 2 - фильтры
        html += '<tr class="filter-row">';
        
        // Документ - текстовый поиск
        html += '<th><input type="text" class="pd-filter-input" data-filter="search" placeholder="Поиск..." value="' + (this.tableFilter.filters.search || '') + '"></th>';
        
        // Полный путь - пусто (фильтр в sidebar)
        html += '<th></th>';
        
        // Статус - dropdown с чекбоксами
        html += '<th><div class="pd-status-dropdown">';
        html += '<div class="pd-status-toggle" tabindex="0">';
        const statusCount = this.tableFilter.filters.readiness_status.length;
        html += statusCount ? '<span>Выбрано<span class="pd-status-badge">' + statusCount + '</span></span>' : '<span>Все</span>';
        html += '</div>';
        html += '<div class="pd-status-menu">';
        statuses.forEach(s => {
            const checked = this.tableFilter.filters.readiness_status.includes(s) ? ' checked' : '';
            html += '<label><input type="checkbox" value="' + s + '"' + checked + '> ' + this.tableFilter.getStatusLabel(s) + '</label>';
        });
        html += '</div></div></th>';
        
        // Файлы - пусто
        html += '<th></th>';
        
        // Даты - Date Range на 2 колонки (Начало, Окончание)
        html += '<th colspan="2"><div class="pd-date-filter-wrap"></div></th>';
        
        // Дни - кнопка сброса дат
        html += '<th style="text-align:center"><button type="button" class="pd-date-reset" title="Сбросить даты">✕</button></th>';
        
        // Due Date - пусто
        html += '<th></th>';
        
        // Ответственный - Autocomplete
        html += '<th><div class="pd-employee-filter-wrap"></div></th>';
        
        html += '</tr>';
        html += '</thead>';
        
        // Body
        html += '<tbody>';
        if (this.filteredData.length === 0) {
            html += '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted)">Нет документов по фильтрам</td></tr>';
        } else {
            this.filteredData.forEach(doc => {
                html += '<tr>';
                html += '<td><a href="/app/document/' + doc.name + '">' + doc.name + '</a></td>';
                html += '<td>' + this.buildFullPath(doc) + '</td>';
                html += '<td>' + this.renderStatusBadge(doc.readiness_status) + '</td>';
                html += '<td>' + this.renderFilesCell(doc) + '</td>';
                html += '<td>' + this.renderDate(doc.start_date) + '</td>';
                html += '<td>' + this.renderDate(doc.planned_end_date) + '</td>';
                html += '<td>' + this.renderPlannedDays(doc.planned_days) + '</td>';
                html += '<td>' + this.renderDueDate(doc) + '</td>';
                html += '<td>' + this.renderResponsible(doc.responsible_employee) + '</td>';
                html += '</tr>';
            });
        }
        html += '</tbody></table></div>';
        
        return html;
    }

    initTableFilters() {
        const self = this;

        // Текстовый поиск
        let searchTimeout;
        this.$content.find('.pd-filter-input[data-filter="search"]').on("input", function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                self.tableFilter.filters.search = $(this).val().trim();
                self.applyAllFilters();
                self.updateTable();
            }, 300);
        });

        // Status dropdown toggle
        this.$content.find(".pd-status-toggle").on("click", function(e) {
            e.stopPropagation();
            const $dropdown = $(this).closest(".pd-status-dropdown");
            $dropdown.toggleClass("open");
        });

        // Status checkboxes
        this.$content.find(".pd-status-menu input").on("change", function(e) {
            e.stopPropagation();
            const value = $(this).val();
            if ($(this).is(":checked")) {
                if (!self.tableFilter.filters.readiness_status.includes(value)) {
                    self.tableFilter.filters.readiness_status.push(value);
                }
            } else {
                self.tableFilter.filters.readiness_status = self.tableFilter.filters.readiness_status.filter(s => s !== value);
            }
            self.updateStatusToggle();
            self.applyAllFilters();
            self.updateTable();
        });

        // Close dropdown on outside click
        $(document).off("click.pdstatus").on("click.pdstatus", function() {
            self.$content.find(".pd-status-dropdown").removeClass("open");
        });

        // Employee Autocomplete
        const $employeeWrap = this.$content.find(".pd-employee-filter-wrap");
        if ($employeeWrap.length) {
            const employees = this.tableFilter.getEmployeeOptions();
            const employeeOptions = ["Все"].concat(employees.map(e => e.name));
            
            this.employeeControl = frappe.ui.form.make_control({
                df: {
                    fieldtype: "Autocomplete",
                    fieldname: "employee_filter",
                    placeholder: "Все",
                    options: employeeOptions
                },
                parent: $employeeWrap,
                render_input: true
            });
            this.employeeControl.$wrapper.find("label").hide();
            
            // Добавляем кнопку очистки
            const $clearBtn = $('<button type="button" class="pd-employee-clear" title="Очистить">×</button>');
            $employeeWrap.append($clearBtn);
            
            // Установить текущее значение
            if (this.tableFilter.filters.responsible_employee) {
                const emp = employees.find(e => e.id === this.tableFilter.filters.responsible_employee);
                if (emp) {
                    this.employeeControl.set_value(emp.name);
                    $employeeWrap.addClass("has-value");
                }
            }
            
            this.employeeControl.$input.on("change awesomplete-selectcomplete", function() {
                const val = self.employeeControl.get_value();
                if (!val || val === "Все") {
                    self.tableFilter.filters.responsible_employee = "";
                    $employeeWrap.removeClass("has-value");
                } else {
                    const emp = employees.find(e => e.name === val);
                    self.tableFilter.filters.responsible_employee = emp ? emp.id : "";
                    $employeeWrap.addClass("has-value");
                }
                self.applyAllFilters();
                self.updateTable();
            });
            
            // Обработчик очистки
            $clearBtn.on("click", function(e) {
                e.stopPropagation();
                self.employeeControl.set_value("");
                self.tableFilter.filters.responsible_employee = "";
                $employeeWrap.removeClass("has-value");
                self.applyAllFilters();
                self.updateTable();
            });
        }

        // Date Range
        const $dateWrap = this.$content.find(".pd-date-filter-wrap");
        const $dateReset = this.$content.find(".pd-date-reset");
        if ($dateWrap.length) {
            this.dateRangeControl = frappe.ui.form.make_control({
                df: {
                    fieldtype: "Date Range",
                    fieldname: "date_range",
                    placeholder: "Период дат"
                },
                parent: $dateWrap,
                render_input: true
            });
            this.dateRangeControl.$wrapper.find("label").hide();
            this.dateRangeControl.$input.on("change", function() {
                const val = self.dateRangeControl.get_value();
                self.tableFilter.filters.date_range = (val && val.length === 2) ? val : null;
                // Показать/скрыть кнопку сброса
                $dateReset.toggleClass("visible", !!self.tableFilter.filters.date_range);
                self.applyAllFilters();
                self.updateTable();
            });
            
            // Кнопка сброса дат
            $dateReset.on("click", function() {
                self.dateRangeControl.set_value("");
                self.tableFilter.filters.date_range = null;
                $(this).removeClass("visible");
                self.applyAllFilters();
                self.updateTable();
            });
            
            if (this.tableFilter.filters.date_range) {
                this.dateRangeControl.set_value(this.tableFilter.filters.date_range);
                $dateReset.addClass("visible");
            }
        }
    }

    updateStatusToggle() {
        const count = this.tableFilter.filters.readiness_status.length;
        const $toggle = this.$content.find(".pd-status-toggle");
        if (count) {
            $toggle.html('<span>Выбрано<span class="pd-status-badge">' + count + '</span></span>');
        } else {
            $toggle.html('<span>Все</span>');
        }
    }

    updateTable() {
        // Обновить только tbody и info bar
        const $tbody = this.$content.find(".pd-table tbody");
        let html = '';
        
        if (this.filteredData.length === 0) {
            html = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted)">Нет документов по фильтрам</td></tr>';
        } else {
            this.filteredData.forEach(doc => {
                html += '<tr>';
                html += '<td><a href="/app/document/' + doc.name + '">' + doc.name + '</a></td>';
                html += '<td>' + this.buildFullPath(doc) + '</td>';
                html += '<td>' + this.renderStatusBadge(doc.readiness_status) + '</td>';
                html += '<td>' + this.renderFilesCell(doc) + '</td>';
                html += '<td>' + this.renderDate(doc.start_date) + '</td>';
                html += '<td>' + this.renderDate(doc.planned_end_date) + '</td>';
                html += '<td>' + this.renderPlannedDays(doc.planned_days) + '</td>';
                html += '<td>' + this.renderDueDate(doc) + '</td>';
                html += '<td>' + this.renderResponsible(doc.responsible_employee) + '</td>';
                html += '</tr>';
            });
        }
        $tbody.html(html);
        
        // Update info bar
        this.$content.find(".pd-info-bar").replaceWith(this.renderInfoBar());
    }

    bindEvents() {
        const self = this;

        // View switch (новые табы)
        this.$content.find(".pd-view-tab").on("click", function() {
            self.currentView = $(this).data("view");
            self.render();
        });
        
        // Project reset button
        this.$content.find(".pd-project-reset").on("click", () => {
            this.renderProjectSelector();
        });

        // Sidebar toggle
        this.$content.find(".pd-sidebar-toggle").on("click", function() {
            self.sidebarCollapsed = !self.sidebarCollapsed;
            self.$content.find(".pd-sidebar").toggleClass("collapsed", self.sidebarCollapsed);
            // Обновляем иконку: » когда свёрнут (открыть), « когда развёрнут (свернуть)
            $(this).find('.toggle-icon').text(self.sidebarCollapsed ? '»' : '«');
        });

        // Folder reset (контролы обрабатываются через onchange в initControls)
        this.$content.find(".pd-folder-reset").on("click", function() {
            self.folderFilter.reset();
            self.applyAllFilters();
            self.render();
        });

        // Table sort
        this.$content.find(".pd-table th.sortable").on("click", function() {
            const col = parseInt($(this).data("col"));
            self.filteredData = self.sortManager.sort(self.filteredData, col);
            self.render();
        });

        // Tree events
        this.$content.find(".pd-tree-node-content").on("click", function(e) {
            e.stopPropagation();
            const $toggle = $(this).find(".pd-tree-toggle");
            if ($toggle.hasClass("empty")) return;
            const $node = $(this).closest(".pd-tree-node");
            const $children = $node.find("> .pd-tree-children");
            if ($children.is(":visible")) {
                $children.slideUp(150);
                $toggle.removeClass("expanded");
            } else {
                $children.slideDown(150);
                $toggle.addClass("expanded");
            }
        });

        // Hover на документ - подсветка цепочки папок
        this.$content.find(".pd-tree-document").on("mouseenter", function() {
            const $doc = $(this);
            $doc.addClass("hovered");
            
            // Подсветить цепочку родительских папок с градиентом
            const $parents = $doc.parents(".pd-tree-node");
            $parents.each(function(index) {
                const depthClass = "depth-" + Math.min(index + 1, 6);
                $(this).addClass("in-path " + depthClass);
            });
        }).on("mouseleave", function() {
            const $doc = $(this);
            $doc.removeClass("hovered");
            
            // Убрать подсветку с родителей
            $doc.parents(".pd-tree-node").removeClass("in-path depth-1 depth-2 depth-3 depth-4 depth-5 depth-6");
        });
        
        // Клик на документ - переход
        this.$content.find(".pd-tree-document").on("click", function(e) {
            e.stopPropagation();
            frappe.set_route("Form", "Document", $(this).data("name"));
        });

        this.$content.find(".pd-btn-expand-all").on("click", () => {
            this.$content.find(".pd-tree-children").slideDown(150);
            this.$content.find(".pd-tree-toggle").addClass("expanded");
        });
        this.$content.find(".pd-btn-collapse-all").on("click", () => {
            this.$content.find(".pd-tree-children").slideUp(150);
            this.$content.find(".pd-tree-toggle").removeClass("expanded");
        });
    }

    // === RENDER HELPERS ===
    
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

    renderDueDate(doc) {
        const dateValue = doc.due_date || doc.planned_end_date;
        if (!dateValue) return '-';
        const date = frappe.datetime.str_to_user(dateValue);
        if (doc.overdue) return '<span style="color:#dc2626;font-weight:600">' + date + ' ⚠️</span>';
        return date;
    }

    renderDate(dateValue) {
        if (!dateValue) return '<span style="color:var(--text-muted)">—</span>';
        return frappe.datetime.str_to_user(dateValue);
    }

    renderPlannedDays(days) {
        if (!days && days !== 0) return '<span style="color:var(--text-muted)">—</span>';
        return '<span style="font-weight:500">' + days + '</span>';
    }

    renderResponsible(employee) {
        if (!employee) return '<span style="color:var(--text-muted)">—</span>';
        const displayName = this.employeeNames[employee] || employee;
        return '<a href="/app/employee/' + employee + '" class="pd-employee-link" title="' + employee + '">' + displayName + '</a>';
    }

    renderFilesCell(doc) {
        const attached = doc.files_count || 0;
        const required = doc.expected_files || 1;
        const isComplete = attached >= required;
        const textColor = isComplete ? "#16a34a" : "#d97706";
        return '<span style="color:' + textColor + ';font-weight:500">' + attached + '/' + required + '</span>';
    }

    // === TREE VIEW ===
    
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

    renderTreeNode(fstId, node, level) {
        const folderName = node.name || this.folderNames[fstId] || fstId;
        const hasChildren = node.children && Object.keys(node.children).length > 0;
        const hasDocuments = node.documents && node.documents.length > 0;
        const isEmpty = !hasChildren && !hasDocuments;
        const childCount = this.countNodeItems(node);
        const indent = level * 20;

        let html = '<div class="pd-tree-node" data-fst="' + fstId + '">';
        html += '<div class="pd-tree-node-content" style="padding-left: ' + (12 + indent) + 'px;">';
        html += '<span class="pd-tree-toggle' + (isEmpty ? ' empty' : '') + '">▶</span>';
        html += '<span class="pd-tree-icon">📁</span>';
        html += '<span class="pd-tree-label">' + folderName + '</span>';
        if (childCount > 0) html += ' <span class="pd-tree-count">[' + childCount + ']</span>';
        html += '</div>';
        html += '<div class="pd-tree-children" style="display: none;">';

        if (hasChildren) {
            Object.entries(node.children).forEach(([childFstId, childNode]) => {
                html += this.renderTreeNode(childFstId, childNode, level + 1);
            });
        }
        if (hasDocuments) {
            node.documents.forEach(doc => {
                html += this.renderTreeDocument(doc, level + 1);
            });
        }

        html += '</div></div>';
        return html;
    }

    renderTreeDocument(doc, level) {
        const indent = level * 20;
        const statusLabel = this.getStatusLabel(doc.readiness_status);
        let html = '<div class="pd-tree-document" data-name="' + doc.name + '" style="padding-left: ' + (12 + indent) + 'px;">';
        html += '<span class="pd-tree-toggle empty"></span>';
        html += '<span class="pd-tree-icon">📄</span>';
        html += '<span class="pd-tree-doc-name">' + doc.name + '</span>';
        html += ' <span style="' + this.getStatusStyle(doc.readiness_status) + 'display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;">(' + statusLabel + ')</span>';
        html += '</div>';
        return html;
    }

    getStatusLabel(status) {
        const labels = { missing: "Отсутствует", partial: "Частично", requested: "Запрошен", in_progress: "В работе", ready_for_review: "На проверке", approved: "Утверждён" };
        return labels[status] || status || "";
    }

    getStatusStyle(status) {
        const styles = { missing: "background:#fee2e2;color:#dc2626;", partial: "background:#ffedd5;color:#ea580c;", requested: "background:#fef3c7;color:#d97706;", in_progress: "background:#e0e7ff;color:#4f46e5;", ready_for_review: "background:#dbeafe;color:#2563eb;", approved: "background:#dcfce7;color:#16a34a;" };
        return styles[status] || styles.missing;
    }

    countNodeItems(node) {
        let count = node.documents ? node.documents.length : 0;
        if (node.children) {
            Object.values(node.children).forEach(child => { count += this.countNodeItems(child); });
        }
        return count;
    }
}
