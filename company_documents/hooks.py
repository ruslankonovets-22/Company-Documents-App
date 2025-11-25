app_name = "company_documents"
app_title = "Company Documents"
app_publisher = "Your Company"
app_description = "Document management system with NextCloud sync"
app_email = "ruslankonovets@gmail.com"
app_license = "mit"
app_version = "0.0.2.5"

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

fixtures = [
    # АКТИВНЫЕ DocTypes (модуль Documents)
    {
        "dt": "DocType",
        "filters": [["module", "=", "Documents"], ["app", "=", "company_documents"]]
    },
    
    # Server Scripts
    {"dt": "Server Script"},
    
    # Client Scripts
    {"dt": "Client Script"},
    
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
        "filters": [["title", "=", "Documents App"]]
    }
]
