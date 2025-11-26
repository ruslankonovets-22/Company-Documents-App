# ☁️ NextCloud Sync - Подробная документация

**Версия:** v0.0.2.6  
**Дата:** 2025-11-26  
**Файл:** company_documents/nextcloud_sync.py  
**Размер:** ~620 строк

---

## 1. Обзор

**NextCloud Sync** - кастомная реализация WebDAV синхронизации для автоматической загрузки файлов из Frappe в NextCloud.

### 1.1 Особенности реализации

- ✅ **Самописный WebDAV** - НЕ использует pibidav код
- ✅ **Прямые HTTP запросы** - через `requests` библиотеку
- ✅ **Шифрование паролей** - AES-256 через Frappe
- ✅ **Single DocType** - настройки в `tabSingles`
- ✅ **Автоматические hooks** - синхронизация при сохранении

---

## 2. Архитектура

### 2.1 Основные компоненты

```python
# nextcloud_sync.py (~620 строк)

# 1. Конфигурация
get_nextcloud_config()              # Получение настроек

# 2. Получение file_id (v0.0.2.6+)
get_nextcloud_file_id()             # PROPFIND для file_id

# 3. Управление папками
get_folder_path()                   # Построение пути
create_nextcloud_folder()           # Создание папок (MKCOL)

# 4. Управление файлами
upload_to_nextcloud()               # Загрузка (PUT) + file_id
delete_from_nextcloud()             # Удаление (DELETE)
move_file_in_nextcloud()            # Перемещение (MOVE)

# 5. Отслеживание изменений
track_folder_changes()              # Изменения структуры
track_file_deletions()              # Удаленные файлы

# 6. Ручная синхронизация
sync_document_to_nextcloud()        # @frappe.whitelist()
```

### 2.2 Диаграмма потока

```mermaid
sequenceDiagram
    participant User
    participant Frappe
    participant NextCloudSync
    participant NextCloud

    User->>Frappe: Save Document
    Frappe->>NextCloudSync: Hook: on_update
    NextCloudSync->>NextCloudSync: get_nextcloud_config()
    NextCloudSync->>NextCloudSync: get_folder_path()
    NextCloudSync->>NextCloud: MKCOL (create folders)
    NextCloudSync->>NextCloud: PUT (upload files)
    NextCloud-->>NextCloudSync: Success
    NextCloudSync->>Frappe: Set is_synced=1
    Frappe-->>User: Document saved
```

---

## 3. Функция get_nextcloud_config()

### 3.1 Назначение

Получить и расшифровать настройки NextCloud из Single DocType.

### 3.2 Исходный код

```python
def get_nextcloud_config():
    """Получить конфигурацию NextCloud из NextCloud Sync Settings"""
    try:
        # Получаем Single DocType
        settings = frappe.get_single("NextCloud Sync Settings")
        
        # Проверка: включена ли синхронизация
        if not settings.enabled:
            return None
        
        # Проверка: заполнены ли обязательные поля
        if not settings.nc_url or not settings.nc_username:
            return None
        
        # Расшифровываем пароль из tabSingles
        nc_password = get_decrypted_password(
            "NextCloud Sync Settings",   # doctype
            "NextCloud Sync Settings",   # name (для Single = doctype)
            "nc_password",               # fieldname
            raise_exception=False
        )
        
        if not nc_password:
            return None
        
        # Построение URL
        base_url = settings.nc_url.rstrip('/')
        username = settings.nc_username
        root_path = (settings.nc_root_path or '').rstrip('/')
        
        webdav_url = f"{base_url}/remote.php/dav/files/{username}"
        
        return {
            'url': base_url,
            'user': username,
            'username': username,
            'password': nc_password,
            'root_path': root_path if root_path != '' else None,
            'webdav_url': webdav_url
        }
    except Exception as e:
        frappe.log_error(title='NextCloud Config Error', message=str(e))
        return None
```

### 3.3 Возвращаемые данные

```python
{
    'url': 'https://cloud.example.com',
    'user': 'admin',
    'username': 'admin',
    'password': 'decrypted_password',
    'root_path': '/Company Documents',  # или None
    'webdav_url': 'https://cloud.example.com/remote.php/dav/files/admin'
}
```

---

## 4. WebDAV операции

### 4.1 MKCOL - Создание папки

**Метод:** `create_nextcloud_folder()`

```python
def create_nextcloud_folder(folder_path, config):
    """
    Создать папку в NextCloud
    
    Args:
        folder_path: Путь папки, например "Projects/MyProject/Documents"
        config: Конфигурация из get_nextcloud_config()
    """
    auth = HTTPBasicAuth(config['username'], config['password'])
    
    # Полный URL папки
    if config['root_path']:
        full_path = f"{config['root_path']}/{folder_path}"
    else:
        full_path = folder_path
    
    folder_url = f"{config['webdav_url']}/{quote(full_path)}/"
    
    # WebDAV MKCOL запрос
    response = requests.request('MKCOL', folder_url, auth=auth)
    
    # 201 = Created, 405 = Already exists
    if response.status_code in [201, 405]:
        return True
    else:
        frappe.log_error(
            title='NextCloud Folder Creation Failed',
            message=f"Status: {response.status_code}, URL: {folder_url}"
        )
        return False
```

**HTTP запрос:**
```http
MKCOL /remote.php/dav/files/admin/Projects/MyProject/ HTTP/1.1
Host: cloud.example.com
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
```

### 4.2 PUT - Загрузка файла

**Метод:** `upload_to_nextcloud()`

```python
def upload_to_nextcloud(doc, method=None):
    """
    Загрузить файлы документа в NextCloud
    
    Args:
        doc: Объект Document
        method: Frappe event method
    """
    config = get_nextcloud_config()
    if not config:
        return
    
    auth = HTTPBasicAuth(config['username'], config['password'])
    
    # Получить путь папки
    folder_path = get_folder_path(doc)
    
    # Создать папку если нужно
    create_nextcloud_folder(folder_path, config)
    
    # Загрузить каждый файл
    for file_row in doc.files:
        if file_row.is_synced:
            continue  # Уже загружен
        
        # Получить физический файл
        file_doc = frappe.get_doc("File", {"file_url": file_row.file})
        file_path = file_doc.get_full_path()
        
        # URL файла в NextCloud
        if config['root_path']:
            full_path = f"{config['root_path']}/{folder_path}/{file_doc.file_name}"
        else:
            full_path = f"{folder_path}/{file_doc.file_name}"
        
        file_url = f"{config['webdav_url']}/{quote(full_path)}"
        
        # Загрузка через PUT
        with open(file_path, 'rb') as f:
            response = requests.put(file_url, data=f, auth=auth)
        
        if response.status_code in [201, 204]:
            # Успешно загружено
            file_row.file_url = file_url
            file_row.is_synced = 1
        else:
            frappe.log_error(
                title='NextCloud Upload Failed',
                message=f"File: {file_doc.file_name}, Status: {response.status_code}"
            )
    
    # Сохранить изменения
    doc.save(ignore_permissions=True)
```

**HTTP запрос:**
```http
PUT /remote.php/dav/files/admin/Projects/MyProject/document.pdf HTTP/1.1
Host: cloud.example.com
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
Content-Type: application/pdf
Content-Length: 123456

[binary file data]
```

### 4.3 MOVE - Перемещение файла

```python
def move_file_in_nextcloud(old_path, new_path, config):
    """
    Переместить файл в NextCloud
    
    Args:
        old_path: Старый путь
        new_path: Новый путь
        config: Конфигурация
    """
    auth = HTTPBasicAuth(config['username'], config['password'])
    
    old_url = f"{config['webdav_url']}/{quote(old_path)}"
    new_url = f"{config['webdav_url']}/{quote(new_path)}"
    
    # WebDAV MOVE запрос
    headers = {'Destination': new_url}
    response = requests.request('MOVE', old_url, headers=headers, auth=auth)
    
    return response.status_code in [201, 204]
```

**HTTP запрос:**
```http
MOVE /remote.php/dav/files/admin/old/file.pdf HTTP/1.1
Host: cloud.example.com
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
Destination: https://cloud.example.com/remote.php/dav/files/admin/new/file.pdf
```

### 4.4 DELETE - Удаление файла

**Метод:** `delete_from_nextcloud()`

```python
def delete_from_nextcloud(doc, method=None):
    """
    Удалить файлы из NextCloud если они удалены из документа
    
    Args:
        doc: Объект Document
        method: Frappe event method
    """
    config = get_nextcloud_config()
    if not config:
        return
    
    auth = HTTPBasicAuth(config['username'], config['password'])
    
    # Получить список текущих файлов
    current_files = {row.file for row in doc.files}
    
    # Проверить предыдущую версию документа
    if hasattr(doc, '_doc_before_save'):
        old_doc = doc._doc_before_save
        old_files = {row.file for row in old_doc.files}
        
        # Найти удаленные файлы
        deleted_files = old_files - current_files
        
        for file_url in deleted_files:
            # URL файла в NextCloud
            file_url_nc = file_url.replace('/files/', '/remote.php/dav/files/')
            
            # WebDAV DELETE запрос
            response = requests.delete(file_url_nc, auth=auth)
            
            if response.status_code not in [204, 404]:
                frappe.log_error(
                    title='NextCloud Delete Failed',
                    message=f"File: {file_url}, Status: {response.status_code}"
                )
```

**HTTP запрос:**
```http
DELETE /remote.php/dav/files/admin/Projects/MyProject/file.pdf HTTP/1.1
Host: cloud.example.com
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
```

---

## 5. Структура путей файлов

### 5.1 Построение пути - get_folder_path()

```python
def get_folder_path(doc):
    """
    Построить путь папки для документа
    
    Args:
        doc: Объект Document
    
    Returns:
        str: Путь, например "Projects/MyProject/Level1/Level2"
    """
    parts = ["Projects"]
    
    # Добавить название проекта
    if doc.project:
        project = frappe.get_doc("Project", doc.project)
        parts.append(project.project_name)
    else:
        parts.append("No Project")
    
    # Добавить уровни
    for i in range(1, 6):
        level = getattr(doc, f'level_{i}', None)
        if level:
            parts.append(level)
    
    return "/".join(parts)
```

### 5.2 Примеры путей

**Пример 1: Полная структура**
```
Input:
  project = "Website Redesign"
  level_1 = "Design"
  level_2 = "Mockups"
  level_3 = "Homepage"
  level_4 = "Desktop"
  level_5 = "Final"

Output:
  Projects/Website Redesign/Design/Mockups/Homepage/Desktop/Final
```

**Пример 2: Частичная структура**
```
Input:
  project = "Marketing Campaign"
  level_1 = "Content"
  level_2 = "Blog Posts"
  level_3 = None
  level_4 = None
  level_5 = None

Output:
  Projects/Marketing Campaign/Content/Blog Posts
```

**Пример 3: Без проекта**
```
Input:
  project = None
  level_1 = "General"
  level_2 = "Templates"

Output:
  Projects/No Project/General/Templates
```

### 5.3 Полный путь в NextCloud

```
https://cloud.example.com/remote.php/dav/files/USERNAME/[ROOT_PATH]/Projects/ProjectName/Level1/file.pdf
```

**Компоненты:**
1. `base_url` - https://cloud.example.com
2. `/remote.php/dav/files/` - WebDAV endpoint
3. `USERNAME` - имя пользователя NextCloud
4. `[ROOT_PATH]` - опциональный корневой путь
5. `Projects/ProjectName/Level1` - структура из get_folder_path()
6. `file.pdf` - имя файла

---

## 6. Single DocType для настроек

### 6.1 Что такое Single DocType?

**Single DocType** - специальный тип DocType для хранения одной записи (настроек).

**Особенности:**
- Хранится в таблице `tabSingles`, НЕ в отдельной таблице
- Нет поля `name` - используется имя DocType
- Используется для глобальных настроек

### 6.2 Структура tabSingles

```sql
CREATE TABLE `tabSingles` (
  `doctype` varchar(255) NOT NULL,
  `field` varchar(255) NOT NULL,
  `value` text,
  PRIMARY KEY (`doctype`, `field`)
);
```

### 6.3 Данные NextCloud Sync Settings

```sql
SELECT * FROM tabSingles WHERE doctype = 'NextCloud Sync Settings';
```

**Результат:**
```
+---------------------------+--------------+----------------------------------+
| doctype                   | field        | value                            |
+---------------------------+--------------+----------------------------------+
| NextCloud Sync Settings   | enabled      | 1                                |
| NextCloud Sync Settings   | nc_url       | https://cloud.example.com        |
| NextCloud Sync Settings   | nc_username  | admin                            |
| NextCloud Sync Settings   | nc_password  | $pbkdf2-sha256$29000$...         |
| NextCloud Sync Settings   | nc_root_path | /Company Documents               |
+---------------------------+--------------+----------------------------------+
```

### 6.4 Получение настроек в коде

```python
# Способ 1: frappe.get_single()
settings = frappe.get_single("NextCloud Sync Settings")
print(settings.nc_url)

# Способ 2: frappe.get_doc()
settings = frappe.get_doc("NextCloud Sync Settings", "NextCloud Sync Settings")
print(settings.nc_url)

# Способ 3: SQL
value = frappe.db.get_single_value("NextCloud Sync Settings", "nc_url")
print(value)
```

---

## 7. Шифрование паролей

### 7.1 Как работает шифрование

**Frappe использует AES-256:**
1. Пароль шифруется при сохранении
2. Хранится в формате: `$pbkdf2-sha256$...`
3. Расшифровывается при чтении

### 7.2 Сохранение пароля

```python
# Автоматически шифруется при сохранении
settings = frappe.get_single("NextCloud Sync Settings")
settings.nc_password = "my_secure_password"
settings.save()

# В БД сохраняется зашифрованный хэш
```

### 7.3 Расшифровка пароля

```python
from frappe.utils.password import get_decrypted_password

# Для Single DocType: name = doctype
password = get_decrypted_password(
    "NextCloud Sync Settings",   # doctype
    "NextCloud Sync Settings",   # name
    "nc_password",               # fieldname
    raise_exception=False
)

print(password)  # "my_secure_password"
```

---

## 8. Отслеживание изменений

### 8.1 track_folder_changes()

**Назначение:** Обнаружить изменения структуры папок и переместить файлы

```python
def track_folder_changes(doc, method=None):
    """
    Отследить изменения level_1 - level_5 и переместить файлы в NextCloud
    """
    if not hasattr(doc, '_doc_before_save'):
        return
    
    old_doc = doc._doc_before_save
    config = get_nextcloud_config()
    
    if not config:
        return
    
    # Сравнить пути
    old_path = get_folder_path(old_doc)
    new_path = get_folder_path(doc)
    
    if old_path != new_path:
        # Создать новую папку
        create_nextcloud_folder(new_path, config)
        
        # Переместить файлы
        for file_row in doc.files:
            if file_row.is_synced:
                old_file_path = f"{old_path}/{file_row.file_name}"
                new_file_path = f"{new_path}/{file_row.file_name}"
                
                move_file_in_nextcloud(old_file_path, new_file_path, config)
```

### 8.2 track_file_deletions()

**Назначение:** Удалить файлы из NextCloud если они удалены из таблицы files

```python
def track_file_deletions(doc, method=None):
    """
    Отследить удаленные файлы и удалить их из NextCloud
    """
    if not hasattr(doc, '_doc_before_save'):
        return
    
    old_doc = doc._doc_before_save
    config = get_nextcloud_config()
    
    if not config:
        return
    
    # Найти удаленные файлы
    old_files = {row.file for row in old_doc.files}
    current_files = {row.file for row in doc.files}
    deleted_files = old_files - current_files
    
    # Удалить из NextCloud
    for file_url in deleted_files:
        # Конвертировать URL
        # /files/file.pdf -> /remote.php/dav/files/username/path/file.pdf
        delete_file_from_nextcloud(file_url, config)
```

---

## 9. Обработка ошибок

### 9.1 Логирование ошибок

```python
try:
    response = requests.put(file_url, data=f, auth=auth)
    if response.status_code not in [201, 204]:
        raise Exception(f"Upload failed: {response.status_code}")
except Exception as e:
    frappe.log_error(
        title='NextCloud Sync Error',
        message=frappe.get_traceback()
    )
```

### 9.2 Просмотр логов

**В интерфейсе:**
```
Desk → Error Log
Фильтр: Method = "nextcloud_sync.*"
```

**В базе данных:**
```sql
SELECT * FROM `tabError Log` 
WHERE error LIKE '%NextCloud%' 
ORDER BY creation DESC 
LIMIT 10;
```

---

## 10. Производительность

### 10.1 Оптимизации

**1. Пакетная загрузка:**
```python
# Загружать несколько файлов за раз
for file_row in doc.files:
    if not file_row.is_synced:
        upload_file(file_row)
```

**2. Кэширование конфигурации:**
```python
# Кэш на 5 минут
@frappe.whitelist()
@frappe.cache().ttl(300)
def get_nextcloud_config():
    # ...
```

**3. Асинхронная загрузка (будущее):**
```python
# Использовать Frappe background jobs
frappe.enqueue(
    'company_documents.nextcloud_sync.upload_to_nextcloud',
    doc=doc,
    queue='default'
)
```

---

## 11. Безопасность

### 11.1 Аутентификация

**Basic Auth:**
```python
from requests.auth import HTTPBasicAuth
auth = HTTPBasicAuth(username, password)
```

**⚠️ Важно:** Используйте HTTPS для защиты credentials!

### 11.2 Права доступа

**NextCloud:**
- Создайте отдельного пользователя для Frappe
- Ограничьте доступ к определенной папке
- Используйте App Password вместо основного пароля

**Frappe:**
- Только администраторы могут изменять NextCloud Sync Settings
- Пароли зашифрованы в базе данных

---

## 12. Troubleshooting

### 12.1 Синхронизация не работает

**Проверка 1: Включена ли синхронизация**
```python
settings = frappe.get_single("NextCloud Sync Settings")
print(settings.enabled)  # Должно быть 1
```

**Проверка 2: Правильный ли URL**
```python
print(settings.nc_url)  # https://cloud.example.com (без / в конце)
```

**Проверка 3: Работает ли NextCloud**
```bash
curl -u username:password https://cloud.example.com/remote.php/dav/files/username/
```

### 12.2 Файлы не загружаются

**Проверка: Права на файл**
```python
file_doc = frappe.get_doc("File", {"file_url": file_row.file})
file_path = file_doc.get_full_path()
print(os.path.exists(file_path))  # Должно быть True
```

**Проверка: Размер файла**
```bash
# В NextCloud может быть ограничение
# Проверить в config.php:
'upload_max_filesize' => '512M'
```

---

## Ссылки

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - общая архитектура
- **[DOCUMENT_LOGIC.md](DOCUMENT_LOGIC.md)** - логика работы Document
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - разработка
- **[../knowledge.md](../knowledge.md)** - база знаний WebDAV

**Официальная документация:**
- [NextCloud WebDAV API](https://docs.nextcloud.com/server/stable/developer_manual/client_apis/WebDAV/)

---

## 13. Новое в v0.0.2.6: Direct File Links

### 13.1 Проблема до v0.0.2.6

**Старый формат file_url:**
```
https://cloud.example.com/apps/files/?dir=/Projects/Test
```
❌ Открывает **папку** - пользователь должен искать файл вручную

### 13.2 Решение: get_nextcloud_file_id()

**Новая функция:**
```python
def get_nextcloud_file_id(file_path, config):
    """
    Получить file_id файла в NextCloud через WebDAV PROPFIND.
    
    Args:
        file_path: Путь к файлу (Projects/TEST/file.jpg)
        config: NextCloud конфигурация
    
    Returns:
        file_id (str) или None
    """
    propfind_xml = '''<?xml version="1.0"?>
    <d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
      <d:prop>
        <oc:fileid/>
        <nc:fileid/>
      </d:prop>
    </d:propfind>'''
    
    response = requests.request('PROPFIND', url, data=propfind_xml, 
                                headers={'Depth': '0'}, auth=auth)
    
    # Парсинг XML - поддержка oc:fileid и nc:fileid
    ...
```

### 13.3 Новый формат file_url

**С v0.0.2.6:**
```
https://cloud.example.com/apps/files/files/123456?dir=/Projects/Test&openfile=true
```
✅ Открывает **файл напрямую** благодаря:
- `files/123456` - file_id из PROPFIND
- `openfile=true` - параметр для прямого открытия

### 13.4 Где используется file_id

| Функция | Использование |
|---------|--------------|
| `upload_to_nextcloud()` | После PUT → PROPFIND → file_url с file_id |
| `sync_document_to_nextcloud()` | После загрузки → PROPFIND → file_url с file_id |
| `move_files_in_nextcloud()` | После MOVE → PROPFIND → обновление file_url |

### 13.5 Поддержка namespace

NextCloud использует разные namespace в зависимости от версии:

| Версия | Namespace | Элемент |
|--------|-----------|---------|
| OwnCloud / старый NextCloud | `http://owncloud.org/ns` | `<oc:fileid>` |
| NextCloud 25+ | `http://nextcloud.org/ns` | `<nc:fileid>` |

Функция `get_nextcloud_file_id()` пробует оба варианта.

---

**Последнее обновление:** 2025-11-26
- [RFC 4918 - WebDAV](https://datatracker.ietf.org/doc/html/rfc4918)

---

**Последнее обновление:** 2025-11-20
