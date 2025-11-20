app_name = "company_documents"
app_title = "Company Documents"
app_publisher = "Your Company"
app_description = "Document management system with NextCloud sync"
app_email = "support@example.com"
app_license = "mit"
app_version = "0.0.2"

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
    {
        "dt": "DocType",
        "filters": [
            ["module", "=", "Documents"],
            ["custom", "=", 1]
        ]
    },
    {
        "dt": "DocType",
        "filters": [
            ["module", "=", "Projects"],
            ["custom", "=", 1]
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
    {
        "dt": "Workspace",
        "filters": [["title", "=", "Documents app"]]
    }
]
