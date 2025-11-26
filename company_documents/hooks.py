app_name = "company_documents"
app_title = "Company Documents"
app_publisher = "Your Company"
app_description = "Document management system with NextCloud sync"
app_email = "ruslankonovets@gmail.com"
app_license = "mit"
app_version = "0.0.2.6"

doc_events = {
    "Document": {
        "validate": [
            "company_documents.custom.document.validate"
        ],
        "on_update": [
            "company_documents.nextcloud_sync.track_folder_changes",
            "company_documents.nextcloud_sync.track_file_deletions",
            "company_documents.nextcloud_sync.upload_to_nextcloud",
            "company_documents.nextcloud_sync.delete_from_nextcloud"
        ]
    }
}

fixtures = [
    # 1. DocTypes (фильтр по app - экспортирует ТОЛЬКО наши 5 DocTypes)
    {
        "dt": "DocType",
        "filters": [["app", "=", "company_documents"]]
    },
    
    # 2.  Server Scripts (фильтр по module - ТОЛЬКО Documents)
    {
        "dt": "Server Script",
        "filters": [["module", "=", "Documents"]]
    },
    
    # 3.  Client Scripts (фильтр по dt - ТОЛЬКО наши DocTypes)
    {
        "dt": "Client Script",
        "filters": [
            ["dt", "in", ["Document", "Document File", "NextCloud Sync Settings", "Folder Structure Template"]]
        ]
    },
    
    # 4. Custom Fields (если есть кастомизации стандартных DocTypes)
    {
        "dt": "Custom Field",
        "filters": [["module", "=", "Documents"]]
    },
    
    # 5. Property Setters (если изменяли свойства полей)
    {
        "dt": "Property Setter",
        "filters": [["module", "=", "Documents"]]
    },
    
    # 6. Folder Structure Templates (все 45 шаблонов)
    {"dt": "Folder Structure Template"},
    
    # 7. Document Naming Rule (правило нумерации DOC-YYYY-#####)
    {
        "dt": "Document Naming Rule",
        "filters": [["document_type", "=", "Document"]]
    },
    
    # 8. Workspace (UI воркспейс "Documents App")
    {
        "dt": "Workspace",
        "filters": [["title", "=", "Documents App"]]
    }
]
