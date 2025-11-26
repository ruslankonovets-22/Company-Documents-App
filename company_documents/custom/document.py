# -*- coding: utf-8 -*-
import frappe
from frappe.utils import add_days, today, getdate


def validate(doc, method):
    """
    Вызывается перед сохранением Document.
    Хук: company_documents.custom.document.validate
    """
    # Auto-calculate planned_end_date
    if doc.start_date and doc.planned_days:
        doc.planned_end_date = add_days(doc.start_date, doc.planned_days)
    
    # Recalculate files_count
    doc.files_count = len(doc.files) if doc.files else 0
    
    # Recalculate overdue
    effective_due = doc.due_date or doc.planned_end_date
    if effective_due:
        is_overdue = (getdate(today()) > getdate(effective_due) 
                     and doc.readiness_status != "approved")
        doc.overdue = 1 if is_overdue else 0
    else:
        doc.overdue = 0
