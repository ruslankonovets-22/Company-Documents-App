// Project Documents Page v0.0.3.0 - Fixed tree indentation + path
frappe.pages["project-documents"].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Project Documents",
        single_column: true
    });
    new ProjectDocumentsController(page);
};

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
            .pd-tree-node:hover > .pd-tree-node-content { background: rgba(0,0,0,0.04); }
            .pd-tree-node:hover > .pd-tree-children { background: rgba(59,130,246,0.06); border-radius: 4px; }
            .pd-tree-document:hover { background: rgba(59,130,246,0.08) !important; }
            .pd-table { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
            .pd-table th { background: #f9fafb; border-bottom: 2px solid #e5e7eb; padding: 12px 16px !important; }
            .pd-table td { padding: 10px 16px !important; border-bottom: 1px solid #f3f4f6; }
            .pd-table tr:nth-child(even) td { background: #fafafa; }
            .pd-table tr:hover td { background: rgba(59,130,246,0.06) !important; }
            .pd-table th:nth-child(1), .pd-table td:nth-child(1) { min-width: 120px; }
            .pd-table th:nth-child(2), .pd-table td:nth-child(2) { min-width: 250px; }
            .pd-table th:nth-child(3), .pd-table td:nth-child(3) { min-width: 90px; }
            .pd-table th:nth-child(4), .pd-table td:nth-child(4) { min-width: 50px; text-align: center; }
            .pd-table th:nth-child(5), .pd-table td:nth-child(5) { min-width: 90px; white-space: nowrap; }
            .pd-table th:nth-child(6), .pd-table td:nth-child(6) { min-width: 90px; white-space: nowrap; }
            .pd-table th:nth-child(7), .pd-table td:nth-child(7) { min-width: 40px; text-align: center; }
            .pd-table th:nth-child(8), .pd-table td:nth-child(8) { min-width: 90px; white-space: nowrap; }
            .pd-table th:nth-child(9), .pd-table td:nth-child(9) { min-width: 120px; }
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
            this.render();
        }).catch(err => {
            console.error("Load error:", err);
            this.$content.html('<div class="pd-empty"><div class="pd-empty-icon">⚠️</div><div>Ошибка загрузки данных</div></div>');
        });
    }

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

    bindEvents() {
        // View switch
        this.$content.find(".pd-view-btn").on("click", (e) => {
            this.currentView = $(e.currentTarget).data("view");
            this.render();
        });
        
        // Project change
        this.$content.find(".pd-project-info").on("click", () => {
            this.renderProjectSelector();
        });
        
        // Tree toggle - USE .pd-tree-toggle ONLY to prevent double-fire
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
        
        // Document click
        this.$content.find(".pd-tree-document").on("click", function(e) {
            e.stopPropagation();
            frappe.set_route("Form", "Document", $(this).data("name"));
        });
        
        // Expand/Collapse all
        this.$content.find(".pd-btn-expand-all").on("click", () => {
            this.$content.find(".pd-tree-children").slideDown(150);
            this.$content.find(".pd-tree-toggle").addClass("expanded");
        });
        this.$content.find(".pd-btn-collapse-all").on("click", () => {
            this.$content.find(".pd-tree-children").slideUp(150);
            this.$content.find(".pd-tree-toggle").removeClass("expanded");
        });
    }

    // === TABLE VIEW ===
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
        return '<span>' + date + '</span>';
    }

    renderDate(dateValue) {
        if (!dateValue) return '<span style="color:#9ca3af">—</span>';
        return frappe.datetime.str_to_user(dateValue);
    }

    renderPlannedDays(days) {
        if (!days && days !== 0) return '<span style="color:#9ca3af">—</span>';
        return '<span style="font-weight:500">' + days + '</span>';
    }

    renderResponsible(employee) {
        if (!employee) return '<span style="color:#9ca3af">—</span>';
        const displayName = this.employeeNames[employee] || employee;
        return '<a href="/app/employee/' + employee + '" style="color:#2563eb;text-decoration:none" title="' + employee + '">' + displayName + '</a>';
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
        const indent = level * 20; // 20px per level

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
        html += ' <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500;' + this.getStatusStyle(doc.readiness_status) + '">(' + statusLabel + ')</span>';
        html += '</div>';
        return html;
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

    countNodeItems(node) {
        let count = node.documents ? node.documents.length : 0;
        if (node.children) {
            Object.values(node.children).forEach(child => { count += this.countNodeItems(child); });
        }
        return count;
    }
}
