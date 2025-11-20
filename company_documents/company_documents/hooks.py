app_name = "company_documents"
app_title = "Documents"
app_publisher = "Фla Gatta Lunare"
app_description = "App Documents"
app_email = "aurora.argenti.8@gmail.com"
app_license = "mit"

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
