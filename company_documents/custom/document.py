# -*- coding: utf-8 -*-
import frappe
from frappe.model.document import Document as BaseDocument
from company_documents.nextcloud_sync import sync_document_to_nextcloud

class DocumentController(BaseDocument):
    """Custom controller for Document DocType"""
    
    def after_insert(self):
        """Вызывается после создания документа"""
        sync_document_to_nextcloud(self, method="after_insert")
    
    def on_update(self):
        """Вызывается после обновления документа"""
        sync_document_to_nextcloud(self, method="on_update")
