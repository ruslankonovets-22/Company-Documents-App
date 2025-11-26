# -*- coding: utf-8 -*-
"""
Company Documents API
Канонические методы для UI компонентов

Version: 0.0.2.6

Методы:
-------
1. get_project_document_overview(project)
   - Flat список документов с files[]
   - Для: таблиц, списков, Script Report
   
2. get_project_document_tree(project) 
   - Иерархическая структура по level_1..5
   - Для: Tree View, Custom Page с деревом
"""
import frappe
from frappe import _


# =============================================================================
# МЕТОД 1: FLAT LIST (для таблиц и списков)
# =============================================================================

@frappe.whitelist()
def get_project_document_overview(project):
    """
    Получить все документы проекта с полными данными.
    Возвращает flat-список — подходит для таблиц, DataTable, Script Report.
    
    Оптимизировано: 2 SQL запроса вместо N+1
    
    Args:
        project: str - имя проекта
    
    Returns:
        list: [{name, project, level_1..5, files: [{file_name, file_url}], ...}]
    """
    if not frappe.has_permission("Document", "read"):
        frappe.throw(_("Insufficient permissions"), frappe.PermissionError)
    
    if not project:
        frappe.throw(_("Project parameter is required"))
    
    # Запрос 1: Документы
    docs = frappe.get_all(
        "Document",
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
    
    if not docs:
        return []
    
    # Запрос 2: ВСЕ файлы одним запросом
    doc_names = [d.name for d in docs]
    all_files = frappe.db.sql("""
        SELECT parent, file_name, file_url
        FROM `tabDocument File`
        WHERE parent IN %(names)s
        ORDER BY parent, uploaded_on DESC
    """, {"names": doc_names}, as_dict=True)
    
    # Группируем файлы по документу
    files_map = {}
    for f in all_files:
        if f.parent not in files_map:
            files_map[f.parent] = []
        files_map[f.parent].append({
            "file_name": f.file_name,
            "file_url": f.file_url
        })
    
    # Добавляем files[] к каждому документу
    for doc in docs:
        doc["files"] = files_map.get(doc.name, [])
    
    return docs


# =============================================================================
# МЕТОД 2: TREE STRUCTURE (для древовидного отображения)
# =============================================================================

@frappe.whitelist()
def get_project_document_tree(project):
    """
    Получить документы проекта в виде дерева папок.
    Группирует по level_1 → level_2 → ... → document → files
    
    Для: Custom Page с Tree View, интерактивное дерево папок.
    
    Args:
        project: str - имя проекта
    
    Returns:
        dict: {
            "project": "PROJ-0001",
            "tree": {
                "FST-0001": {                    # level_1
                    "name": "Progettazione",
                    "children": {
                        "FST-0004": {            # level_2
                            "name": "Preliminare",
                            "documents": [...]
                        }
                    }
                }
            },
            "folder_names": {"FST-0001": "Progettazione", ...}
        }
    """
    if not frappe.has_permission("Document", "read"):
        frappe.throw(_("Insufficient permissions"), frappe.PermissionError)
    
    if not project:
        frappe.throw(_("Project parameter is required"))
    
    # Получаем flat-данные (переиспользуем оптимизированный метод)
    docs = get_project_document_overview(project)
    
    if not docs:
        return {"project": project, "tree": {}, "folder_names": {}}
    
    # Собираем все FST ID для получения названий папок
    fst_ids = set()
    for doc in docs:
        for i in range(1, 6):
            fst = doc.get(f"level_{i}")
            if fst:
                fst_ids.add(fst)
    
    # Получаем названия папок одним запросом
    folder_names = {}
    if fst_ids:
        fst_data = frappe.get_all(
            "Folder Structure Template",
            filters={"name": ["in", list(fst_ids)]},
            fields=["name", "folder_name"]
        )
        folder_names = {f.name: f.folder_name for f in fst_data}
    
    # Строим дерево
    tree = {}
    
    for doc in docs:
        # Находим путь документа (level_1 → level_2 → ...)
        path = []
        for i in range(1, 6):
            level = doc.get(f"level_{i}")
            if level:
                path.append(level)
            else:
                break
        
        if not path:
            # Документ без папки — в корень
            path = ["_root"]
            folder_names["_root"] = "(Без папки)"
        
        # Вставляем в дерево
        current = tree
        for i, fst_id in enumerate(path):
            if fst_id not in current:
                current[fst_id] = {
                    "name": folder_names.get(fst_id, fst_id),
                    "children": {},
                    "documents": []
                }
            
            if i == len(path) - 1:
                # Последний уровень — добавляем документ
                current[fst_id]["documents"].append({
                    "name": doc["name"],
                    "readiness_status": doc.get("readiness_status"),
                    "files_count": doc.get("files_count", 0),
                    "files": doc.get("files", [])
                })
            else:
                current = current[fst_id]["children"]
    
    return {
        "project": project,
        "tree": tree,
        "folder_names": folder_names
    }


# =============================================================================
# УТИЛИТЫ ДЛЯ ТЕСТИРОВАНИЯ
# =============================================================================

@frappe.whitelist()
def create_test_data(project_name="TEST-PROJECT", doc_count=50):
    """Создать тестовые данные для проверки производительности."""
    import random
    from frappe.utils import today
    
    # Создать проект если не существует
    if not frappe.db.exists("Project", project_name):
        project = frappe.get_doc({
            "doctype": "Project",
            "project_name": project_name,
            "status": "Open"
        })
        project.insert(ignore_permissions=True)
        frappe.db.commit()
    
    # Получить FST для уровней
    fst_roots = frappe.get_all(
        "Folder Structure Template",
        filters={"parent_folder_structure_template": ["is", "not set"]},
        fields=["name"],
        limit=3
    )
    
    fst_children = frappe.get_all(
        "Folder Structure Template",
        filters={"parent_folder_structure_template": ["is", "set"]},
        fields=["name", "parent_folder_structure_template"],
        limit=10
    )
    
    if not fst_roots:
        return {"error": "No Folder Structure Templates found"}
    
    statuses = ["missing", "partial", "requested", "in_progress", "ready_for_review", "approved"]
    created_docs = []
    
    for i in range(int(doc_count)):
        # Выбираем level_1 и опционально level_2
        level_1 = random.choice(fst_roots).name
        level_2 = None
        
        # 70% документов имеют level_2
        matching_children = [f for f in fst_children if f.parent_folder_structure_template == level_1]
        if matching_children and random.random() > 0.3:
            level_2 = random.choice(matching_children).name
        
        doc = frappe.get_doc({
            "doctype": "Document",
            "project": project_name,
            "level_1": level_1,
            "level_2": level_2,
            "readiness_status": random.choice(statuses),
            "start_date": today(),
            "planned_days": random.randint(5, 30),
            "expected_files": random.randint(1, 5)
        })
        doc.insert(ignore_permissions=True)
        
        # Добавить файлы (1-3)
        file_count = random.randint(1, 3)
        for j in range(file_count):
            doc.append("files", {
                "file_name": f"test_file_{i}_{j}.pdf",
                "file_url": f"https://example.com/files/{doc.name}/file_{j}.pdf",
                "file_synced": 0
            })
        
        doc.save(ignore_permissions=True)
        created_docs.append(doc.name)
    
    frappe.db.commit()
    
    return {
        "project": project_name,
        "documents_created": len(created_docs),
        "document_names": created_docs[:5]
    }


@frappe.whitelist()
def cleanup_test_data(project_name="TEST-PROJECT"):
    """Удалить тестовые данные."""
    docs = frappe.get_all("Document", filters={"project": project_name})
    for d in docs:
        frappe.delete_doc("Document", d.name, force=True)
    
    if frappe.db.exists("Project", project_name):
        frappe.delete_doc("Project", project_name, force=True)
    
    frappe.db.commit()
    return {"deleted_documents": len(docs), "project_deleted": project_name}
