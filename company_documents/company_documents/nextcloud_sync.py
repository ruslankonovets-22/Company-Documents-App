# -*- coding: utf-8 -*-
import frappe
import requests
from requests.auth import HTTPBasicAuth
from urllib.parse import quote
from frappe.utils.password import get_decrypted_password
import os


def get_nextcloud_config():
    """Получить конфигурацию NextCloud из NextCloud Sync Settings"""
    try:
        settings = frappe.get_single("NextCloud Sync Settings")
        
        if not settings.enabled:
            return None
        
        if not settings.nc_url or not settings.nc_username:
            return None
        
        # Расшифровываем пароль
        nc_password = get_decrypted_password(
            "NextCloud Sync Settings", 
            "NextCloud Sync Settings", 
            "nc_password", 
            raise_exception=False
        )
        
        if not nc_password:
            return None
        
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


def sanitize_path(name):
    """Очистить имя папки от недопустимых символов"""
    return name.replace('/', '_').replace('\\', '_').strip()


def create_nextcloud_folder(path, config):
    """Создать папку в NextCloud (если не существует)"""
    try:
        full_path = f"{config.get('root_path', '').rstrip('/')}/{path}" if config.get('root_path') and config['root_path'] != '/' else path
        safe_path = quote(full_path.encode('utf-8'))
        url = f"{config['url']}/remote.php/dav/files/{config['user']}/{safe_path}"
        
        response = requests.request(
            'MKCOL',
            url,
            auth=HTTPBasicAuth(config['user'], config['password']),
            timeout=30
        )
        
        return response.status_code in [201, 405]
    except Exception as e:
        frappe.log_error(title='NextCloud Create Folder Error', message=str(e))
        return False


def get_folder_path(doc):
    """
    Генерирует путь к папке на основе иерархии level_1...level_5.
    Возвращает путь вида: Projects/ProjectName/Level1/Level2/.../Level5
    """
    if not doc.project:
        return None
    
    try:
        project = frappe.get_doc('Project', doc.project)
        path_parts = ['Projects', sanitize_path(project.project_name)]
        
        for i in range(1, 6):
            level_field = f'level_{i}'
            level_value = doc.get(level_field)
            
            if level_value:
                try:
                    template = frappe.get_doc('Folder Structure Template', level_value)
                    path_parts.append(sanitize_path(template.folder_name))
                except Exception:
                    pass
            else:
                break
        
        return '/'.join(path_parts) if len(path_parts) > 2 else None
    
    except Exception as e:
        frappe.log_error(title='Get Folder Path Error', message=str(e))
        return None


def track_folder_changes(doc, method=None):
    """Отслеживает изменения полей level_1...level_5 для перемещения файлов"""
    if doc.is_new():
        return
    
    old_doc = doc.get_doc_before_save()
    if not old_doc:
        return
    
    old_path = get_folder_path(old_doc)
    new_path = get_folder_path(doc)
    
    if old_path and new_path and old_path != new_path:
        doc._folder_changed = True
        doc._old_folder_path = old_path
        move_files_in_nextcloud(doc, old_path)


def track_file_deletions(doc, method=None):
    """Отслеживает удаление строк из таблицы files"""
    old_doc = doc.get_doc_before_save()
    if not old_doc:
        return
    
    old_files = {f.file for f in old_doc.files if f.file}
    new_files = {f.file for f in doc.files if f.file}
    
    deleted_files = old_files - new_files
    
    if deleted_files:
        doc._deleted_files = list(deleted_files)


def upload_to_nextcloud(doc, method=None):
    """Загрузка новых файлов в NextCloud"""
    folder_path = get_folder_path(doc)
    if not folder_path:
        return
    
    config = get_nextcloud_config()
    if not config:
        return
    
    project = frappe.get_doc('Project', doc.project)
    create_nextcloud_folder('Projects', config)
    create_nextcloud_folder(f"Projects/{sanitize_path(project.project_name)}", config)
    
    path_parts = folder_path.split('/')
    for i in range(1, len(path_parts) + 1):
        partial_path = '/'.join(path_parts[:i])
        create_nextcloud_folder(partial_path, config)
    
    folder_url = f"{config['url']}/apps/files/?dir={quote(folder_path)}"
    
    for file_row in doc.files:
        if file_row.is_synced:
            continue
        
        if not file_row.file:
            continue
        
        try:
            from frappe.utils.file_manager import get_file_path
            local_path = get_file_path(file_row.file)
            
            if not os.path.exists(local_path):
                continue
            
            remote_path = f"{folder_path}/{os.path.basename(local_path)}"
            
            full_path = f"{config.get('root_path', '').rstrip('/')}/{remote_path}" if config.get('root_path') and config['root_path'] != '/' else remote_path
            safe_path = quote(full_path.encode('utf-8'))
            url = f"{config['url']}/remote.php/dav/files/{config['user']}/{safe_path}"
            
            with open(local_path, 'rb') as f:
                response = requests.put(
                    url,
                    data=f,
                    auth=HTTPBasicAuth(config['user'], config['password']),
                    timeout=120
                )
            
            if response.status_code in [200, 201, 204]:
                file_row.file_url = folder_url
                file_row.is_synced = 1
        
        except Exception as e:
            frappe.log_error(title='File Upload Error', message=str(e))


def delete_empty_folders_in_nextcloud(folder_path, config):
    """
    Рекурсивно удаляет пустые папки в NextCloud.
    Начинает с самой глубокой папки и идёт вверх.
    """
    import requests
    from requests.auth import HTTPBasicAuth
    from urllib.parse import quote
    
    # Разбиваем путь на части
    parts = folder_path.split('/')
    
    # Начинаем с конца (самая глубокая папка)
    for i in range(len(parts), 0, -1):
        current_path = '/'.join(parts[:i])
        
        # Не удаляем корневую папку "Projects"!
        if current_path == 'Projects':
            break
        
        try:
            # Проверяем содержимое папки через WebDAV PROPFIND
            safe_path = quote(current_path.encode('utf-8'))
            url = f"{config['webdav_url']}/{safe_path}"
            
            response = requests.request(
                'PROPFIND',
                url,
                headers={'Depth': '1'},
                auth=HTTPBasicAuth(config['username'], config['password']),
                timeout=10
            )
            
            if response.status_code != 207:
                # Папка не существует или ошибка
                continue
            
            # Парсим ответ (XML)
            import xml.etree.ElementTree as ET
            root = ET.fromstring(response.content)
            
            # Считаем элементы (первый элемент = сама папка)
            items = root.findall('.//{DAV:}response')
            
            # Если только 1 элемент = папка пустая!
            if len(items) <= 1:
                # Удаляем пустую папку
                response = requests.delete(
                    url,
                    auth=HTTPBasicAuth(config['username'], config['password']),
                    timeout=10
                )
                
                if response.status_code in [204, 404]:
                    frappe.msgprint(f"🗑️ Удалена пустая папка: {current_path}", indicator="orange")
                else:
                    frappe.log_error(
                        title="Delete Empty Folder Error",
                        message=f"Path: {current_path}, Status: {response.status_code}"
                    )
            else:
                # Папка НЕ пустая, останавливаемся
                break
        
        except Exception as e:
            frappe.log_error(title="Delete Empty Folder Error", message=str(e))
            break


def delete_from_nextcloud(doc, method=None):
    """Удаление файлов из NextCloud при удалении из Document"""
    if doc.doctype != "Document":
        return
    
    if not hasattr(doc, '_deleted_files') or not doc._deleted_files:
        return
    
    config = get_nextcloud_config()
    folder_path = get_folder_path(doc)
    
    if not folder_path:
        return
    
    if not config:
        return
    
    for file_path in doc._deleted_files:
        try:
            filename = os.path.basename(file_path)
            remote_path = f"{folder_path}/{filename}"
            file_url = f"{config['webdav_url']}/{quote(remote_path)}"
            
            response = requests.delete(
                file_url,
                auth=HTTPBasicAuth(config['username'], config['password'])
            )
            
            if response.status_code in [204, 404]:
                frappe.msgprint(f"Файл удалён из NextCloud: {filename}", indicator="orange")
        
        except Exception as e:
            frappe.log_error(title="NextCloud Delete Error", message=str(e))



    
    # Удаляем пустые папки после удаления файлов
    try:
        delete_empty_folders_in_nextcloud(folder_path, config)
    except Exception as e:
        frappe.log_error(title='Delete Empty Folders Error (Delete)', message=str(e))


def move_files_in_nextcloud(doc, old_folder_path):
    """Перемещение файлов при изменении пути"""
    config = get_nextcloud_config()
    if not config:
        return
    
    new_folder_path = get_folder_path(doc)
    if not new_folder_path:
        return
    
    path_parts = new_folder_path.split('/')
    for i in range(1, len(path_parts) + 1):
        partial_path = '/'.join(path_parts[:i])
        create_nextcloud_folder(partial_path, config)
    
    for file_row in doc.files:
        if not file_row.file:
            continue
        
        try:
            file_name = os.path.basename(file_row.file)
            old_remote = f"{old_folder_path}/{file_name}"
            new_remote = f"{new_folder_path}/{file_name}"
            
            old_full = f"{config.get('root_path', '').rstrip('/')}/{old_remote}" if config.get('root_path') and config['root_path'] != '/' else old_remote
            new_full = f"{config.get('root_path', '').rstrip('/')}/{new_remote}" if config.get('root_path') and config['root_path'] != '/' else new_remote
            
            old_safe = quote(old_full.encode('utf-8'))
            new_safe = quote(new_full.encode('utf-8'))
            
            source_url = f"{config['url']}/remote.php/dav/files/{config['user']}/{old_safe}"
            dest_url = f"{config['url']}/remote.php/dav/files/{config['user']}/{new_safe}"
            
            response = requests.request(
                'MOVE',
                source_url,
                headers={'Destination': dest_url},
                auth=HTTPBasicAuth(config['user'], config['password']),
                timeout=30
            )
            
            if response.status_code in [201, 204]:
                file_row.file_url = f"{config['url']}/apps/files/?dir={quote(new_folder_path)}"
        
        except Exception as e:
            frappe.log_error(title='Move File Error', message=str(e))
    
    # Удаляем пустые папки после перемещения
    try:
        delete_empty_folders_in_nextcloud(old_folder_path, config)
    except Exception as e:
        frappe.log_error(title='Delete Empty Folders Error (Move)', message=str(e))


def upload_file_to_nextcloud(local_path, remote_path, config):
    """
    Загружает ОДИН файл в NextCloud.
    Используется функцией sync_document_to_nextcloud() (вызов из UI).
    """

    try:
        full_path = f"{config.get('root_path', '').rstrip('/')}/{remote_path}" if config.get('root_path') and config['root_path'] != '/' else remote_path
        safe_path = quote(full_path.encode('utf-8'))
        url = f"{config['url']}/remote.php/dav/files/{config['user']}/{safe_path}"
        
        with open(local_path, 'rb') as f:
            response = requests.put(
                url,
                data=f,
                auth=HTTPBasicAuth(config['user'], config['password']),
                timeout=120
            )
        
        return response.status_code in [200, 201, 204]
    except Exception as e:
        frappe.log_error(title='NextCloud Upload File Error', message=str(e))
        return False


@frappe.whitelist()
def sync_document_to_nextcloud(docname):
    """
    Загружает все несинхронизированные файлы из Document в NextCloud.
    Работает с НОВОЙ логикой level_1...level_5!
    """
    try:
        doc = frappe.get_doc('Document', docname)
        
        folder_path = get_folder_path(doc)
        if not folder_path:
            frappe.msgprint('Заполните Project и Level 1', indicator='orange')
            return {'success': False}
        
        if not doc.files:
            frappe.msgprint('Нет файлов для загрузки', indicator='orange')
            return {'success': False}
        
        config = get_nextcloud_config()
        if not config:
            frappe.msgprint('NextCloud не настроен', indicator='red')
            return {'success': False}
        
        project = frappe.get_doc('Project', doc.project)
        create_nextcloud_folder('Projects', config)
        create_nextcloud_folder(f"Projects/{sanitize_path(project.project_name)}", config)
        
        path_parts = folder_path.split('/')
        for i in range(1, len(path_parts) + 1):
            partial_path = '/'.join(path_parts[:i])
            create_nextcloud_folder(partial_path, config)
        
        folder_url = f"{config['url']}/apps/files/?dir={quote(folder_path)}"
        
        uploaded = 0
        
        for f in doc.files:
            if f.is_synced:
                continue
            
            if not f.file:
                continue
            
            try:
                from frappe.utils.file_manager import get_file_path
                local = get_file_path(f.file)
                
                if not os.path.exists(local):
                    frappe.msgprint(f'Файл не найден: {f.file_name}', indicator='orange')
                    continue
                
                remote = f"{folder_path}/{os.path.basename(local)}"
                
                if upload_file_to_nextcloud(local, remote, config):
                    f.file_url = folder_url
                    f.is_synced = 1
                    uploaded += 1
                    frappe.msgprint(f'OK {os.path.basename(local)}', indicator='green')
                else:
                    frappe.msgprint(f'Ошибка загрузки: {os.path.basename(local)}', indicator='red')
            
            except Exception as e:
                frappe.log_error(title='File Upload Error', message=str(e))
                frappe.msgprint(f'Ошибка: {str(e)}', indicator='red')
        
        if uploaded > 0:
            doc.flags.ignore_version = True
            doc.flags.ignore_permissions = True
            doc.save()
            frappe.db.commit()
            frappe.msgprint(f'Выгружено {uploaded} файл(ов)', indicator='blue')
            return {'success': True, 'uploaded': uploaded}
        
        return {'success': False}
    
    except Exception as e:
        frappe.log_error(title='Sync Document Error', message=str(e))
        return {'success': False, 'error': str(e)}


@frappe.whitelist()
def test_nextcloud_connection():
    """Тестирует подключение к NextCloud"""
    try:
        config = get_nextcloud_config()
        if not config:
            return {'success': False, 'message': 'NextCloud не настроен'}
        
        test_path = f"test_{frappe.utils.now_datetime().strftime('%Y%m%d_%H%M%S')}"
        
        if create_nextcloud_folder(test_path, config):
            return {'success': True, 'message': 'Подключение успешно! ✓'}
        
        return {'success': False, 'message': 'Ошибка создания папки'}
    
    except Exception as e:
        frappe.log_error(title='NextCloud Test Error', message=str(e))
        return {'success': False, 'message': str(e)}
