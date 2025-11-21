# Company Documents App: Knowledge Base

**Version:** v0.0.2  
**Target:** Frappe v15 + ERPNext v15.83.0 + NextCloud  
**Last Updated:** 2025-11-20

---

## FRAPPE V15 BREAKING CHANGES

### Server Scripts Configuration

ИЗМЕНИЛОСЬ В V15:

v14 НЕ работает в v15:
  bench set-config server_script_enabled true

v15 ОБЯЗАТЕЛЬНО флаг -g:
  bench set-config -g server_script_enabled 1

Причина: is_safe_exec_enabled() проверяет ТОЛЬКО common_site_config.json

Источник: https://github.com/frappe/frappe/wiki/Migrating-to-Version-15

---

### Удалённые Python зависимости

Удалены из Frappe v15:
- googlemaps
- urllib3
- gitdb
- pypng
- schedule
- pycryptodome

Решение: Добавь в requirements.txt если используешь

---

### Database API изменения

Удалены методы:
- frappe.db.touch()
- frappe.db.clear_table()
- Параметры: as_utf8, formatted

Используй вместо:
  frappe.db.set_value(doctype, name, field, value)

---

## NEXTCLOUD WEBDAV API

### Base URL

https://your-nextcloud.com/remote.php/dav/files/USERNAME/

### Аутентификация

from requests.auth import HTTPBasicAuth
auth = HTTPBasicAuth(username, app_password)

### Загрузка файла PUT

import requests
url = f"{base_url}/folder/file.pdf"
with open(local_path, 'rb') as f:
    response = requests.put(url, data=f, auth=auth)

### Создание папки MKCOL

url = f"{base_url}/newfolder/"
response = requests.request('MKCOL', url, auth=auth)

### Список файлов PROPFIND

url = f"{base_url}/folder/"
headers = {'Depth': '1'}
response = requests.request('PROPFIND', url, headers=headers, auth=auth)

### Перемещение MOVE

old_url = f"{base_url}/old.pdf"
new_url = f"{base_url}/new.pdf"
headers = {'Destination': new_url}
response = requests.request('MOVE', old_url, headers=headers, auth=auth)

### Удаление DELETE

url = f"{base_url}/file.pdf"
response = requests.delete(url, auth=auth)

### Публичная ссылка OCS API

url = "https://your-nextcloud.com/ocs/v2.php/apps/files_sharing/api/v1/shares"
data = {'path': '/file.pdf', 'shareType': 3}
response = requests.post(url, data=data, auth=auth)

Источник: https://docs.nextcloud.com/server/stable/developer_manual/client_apis/WebDAV/

---

## DOCKER: Правильный порядок установки

bench new-site localhost --install-app erpnext --install-app hrms --install-app raven --install-app pibidav --install-app company_documents

КРИТИЧНО: company_documents последним!

---

## ССЫЛКИ

- Frappe v15 Migration: https://github.com/frappe/frappe/wiki/Migrating-to-Version-15
- NextCloud WebDAV: https://docs.nextcloud.com/server/stable/developer_manual/client_apis/WebDAV/
- frappe_docker: https://github.com/frappe/frappe_docker
- pibiDAV examples: https://github.com/pibico/pibidav

---

## Автоматическая очистка пустых папок (v0.0.2+)

**Дата добавления:** 2025-11-21  
**Коммит:** de6cf2a  
**MD5:** b7c2ddbaf639e3b214e9d165ef462bc0

### Файл
`company_documents/company_documents/nextcloud_sync.py`

### Функция
```python
def delete_empty_folders_in_nextcloud(folder_path, config):
    """
    Рекурсивно удаляет пустые папки в NextCloud.
    Начинает с самой глубокой папки и идёт вверх.
    """
