# 🎯 Common Commands - Частые команды

**Версия:** v0.0.2  
**Дата:** 2025-11-20  
**Назначение:** Готовые к копированию команды

---

## 1. Редактирование файлов (Heredoc)

### 1.1 Редактировать hooks.py

```bash
docker compose exec backend bash -c 'cat > /workspace/frappe-bench/apps/company_documents/company_documents/hooks.py << '\''EOF'\''
app_name = "company_documents"
app_title = "Company Documents"
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
    {"dt": "DocType", "filters": [["app", "=", "company_documents"]]},
    {"dt": "Server Script"},
    {"dt": "Client Script"},
    {"dt": "Custom Field", "filters": [["module", "in", ["Documents", "Projects"]]]},
    {"dt": "Property Setter", "filters": [["module", "in", ["Documents", "Projects"]]]},
    {"dt": "Folder Structure Template"},
    {"dt": "Document Naming Rule", "filters": [["document_type", "=", "Document"]]},
    {"dt": "Workspace", "filters": [["title", "=", "Documents app"]]}
]
EOF'
```

### 1.2 Создать новый Python файл

```bash
docker compose exec backend bash -c 'cat > /workspace/frappe-bench/apps/company_documents/company_documents/new_module.py << '\''EOF'\''
# -*- coding: utf-8 -*-
import frappe

def my_function():
    """Описание функции"""
    return "Hello World"
EOF'
```

### 1.3 Редактировать произвольный файл

```bash
docker compose exec backend bash -c 'cat > /path/to/file << '\''EOF'\''
# Содержимое файла
# Можно использовать любые символы
# КРОМЕ одиночного '\''EOF'\''
EOF'
```

---

## 2. Fixtures Export

### 2.1 Экспортировать fixtures

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost export-fixtures
'
```

### 2.2 Экспортировать и скопировать на хост

```bash
# 1. Экспорт
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost export-fixtures
'

# 2. Копирование
docker compose cp backend:/workspace/frappe-bench/apps/company_documents/company_documents/fixtures/ \
  ./company_documents/fixtures/
```

### 2.3 Проверить экспортированные DocTypes

```bash
docker compose exec backend bash -c '
cat /workspace/frappe-bench/apps/company_documents/company_documents/fixtures/doctype.json | \
python3 -c "import sys, json; data = json.load(sys.stdin); print(f\"Total: {len(data)}\"); [print(f\"- {d[\"name\"]}\") for d in data]"
'
```

---

## 3. Назначение app для DocTypes

### 3.1 Установить app для всех DocTypes

```bash
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost console << '\''PYEOF'\''
import frappe

frappe.init()
frappe.connect()

# Список DocTypes
doctypes = [
    "Document",
    "Document File",
    "Folder Structure Template",
    "NextCloud Sync Settings",
    "Task Document Link",
    "Project Document Type",
    "Task Employee",
    "CILA Document Row",
    "Task Workspace Row"
]

# Установить app
for dt_name in doctypes:
    try:
        dt = frappe.get_doc("DocType", dt_name)
        dt.app = "company_documents"
        dt.save()
        print(f"✓ Set app for {dt_name}")
    except Exception as e:
        print(f"✗ Error for {dt_name}: {str(e)}")

frappe.db.commit()
print("\nDone! Now run: bench export-fixtures")
PYEOF'
```

### 3.2 Проверить app для DocTypes

```bash
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost console << '\''PYEOF'\''
import frappe

frappe.init()
frappe.connect()

doctypes = frappe.get_all("DocType", 
    filters={"module": ["in", ["Documents", "Projects"]]},
    fields=["name", "app", "module", "custom"])

for dt in doctypes:
    print(f"{dt.name:30} app={dt.app or \"NOT SET\":20} module={dt.module:15} custom={dt.custom}")
PYEOF'
```

---

## 4. Frappe Console

### 4.1 Интерактивная консоль

```bash
docker compose exec backend bash
cd /workspace/frappe-bench
bench --site localhost console
```

### 4.2 Получить документ

```bash
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost console << '\''PYEOF'\''
import frappe

frappe.init()
frappe.connect()

doc = frappe.get_doc("Document", "DOC-2025-00001")
print(f"Project: {doc.project}")
print(f"Files: {len(doc.files)}")
PYEOF'
```

### 4.3 Получить настройки NextCloud

```bash
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost console << '\''PYEOF'\''
import frappe

frappe.init()
frappe.connect()

settings = frappe.get_single("NextCloud Sync Settings")
print(f"Enabled: {settings.enabled}")
print(f"URL: {settings.nc_url}")
print(f"Username: {settings.nc_username}")
PYEOF'
```

### 4.4 Получить список документов

```bash
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost console << '\''PYEOF'\''
import frappe

frappe.init()
frappe.connect()

docs = frappe.get_all("Document", 
    fields=["name", "project", "creation"],
    limit=10)

for doc in docs:
    print(f"{doc.name} - {doc.project} - {doc.creation}")
    
print(f"\nTotal: {len(docs)}")
PYEOF'
```

---

## 5. Docker Commands

### 5.1 Полное пересоздание окружения

```bash
# 1. Остановить и удалить все
docker compose down -v

# 2. Пересобрать образ
export APPS_JSON_BASE64=$(base64 -w 0 apps.json)
docker build \
  --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" \
  --tag custom-erpnext:v15-0.0.2 \
  --file images/custom/Containerfile \
  .

# 3. Запустить
docker compose up -d

# 4. Следить за установкой
docker compose logs -f create-site
```

### 5.2 Перезапуск сервисов

```bash
# Перезапустить все
docker compose restart

# Перезапустить только backend
docker compose restart backend

# Остановить все
docker compose stop

# Запустить все
docker compose start
```

### 5.3 Просмотр логов

```bash
# Все логи
docker compose logs

# Последние 100 строк
docker compose logs --tail=100

# Следить в реальном времени
docker compose logs -f backend

# Логи конкретного сервиса
docker compose logs create-site
docker compose logs database
```

### 5.4 Вход в контейнер

```bash
# Bash в backend
docker compose exec backend bash

# Выполнить команду
docker compose exec backend bench --version

# Выполнить команду как root
docker compose exec -u root backend apt-get update
```

---

## 6. Включение Server Scripts

### 6.1 Включить Server Scripts (v15)

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost set-config -g server_script_enabled 1
'
```

### 6.2 Проверить настройку

```bash
docker compose exec backend cat /workspace/frappe-bench/sites/common_site_config.json
```

**Ожидаемый вывод:**
```json
{
  "server_script_enabled": 1
}
```

---

## 7. Проверка установки

### 7.1 Список установленных приложений

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost list-apps
'
```

**Ожидаемый вывод:**
```
frappe
erpnext
hrms
raven
pibidav
company_documents
```

### 7.2 Версия Frappe

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench version
'
```

### 7.3 Проверка статуса контейнеров

```bash
# Список контейнеров
docker compose ps

# Детальная информация
docker compose ps -a

# Использование ресурсов
docker stats
```

---

## 8. База данных

### 8.1 Подключиться к MariaDB

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost mariadb
'
```

### 8.2 Проверить таблицы

```sql
-- Показать базы данных
SHOW DATABASES;

-- Использовать БД сайта (имя может отличаться)
USE `_2d5e1f4d823e3e60`;

-- Показать таблицы
SHOW TABLES;

-- Проверить структуру
DESCRIBE tabDocument;

-- Проверить данные
SELECT * FROM tabDocument LIMIT 5;
```

### 8.3 Проверить Single DocType

```sql
-- NextCloud Sync Settings
SELECT * FROM tabSingles WHERE doctype = 'NextCloud Sync Settings';
```

### 8.4 Выполнить SQL из bash

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost mariadb -e "SELECT name, project FROM tabDocument LIMIT 5;"
'
```

---

## 9. Файлы и копирование

### 9.1 Скопировать из контейнера

```bash
# Скопировать файл
docker compose cp backend:/workspace/frappe-bench/apps/company_documents/hooks.py ./hooks.py

# Скопировать папку
docker compose cp backend:/workspace/frappe-bench/apps/company_documents/fixtures/ ./fixtures/
```

### 9.2 Скопировать в контейнер

```bash
# Скопировать файл
docker compose cp ./local_file.py backend:/workspace/frappe-bench/apps/company_documents/

# Скопировать папку
docker compose cp ./local_folder/ backend:/workspace/frappe-bench/apps/company_documents/
```

### 9.3 Просмотр содержимого файла

```bash
docker compose exec backend cat /workspace/frappe-bench/apps/company_documents/hooks.py
```

### 9.4 Список файлов

```bash
docker compose exec backend ls -la /workspace/frappe-bench/apps/company_documents/
```

---

## 10. Миграции (если нужны в будущем)

### 10.1 Запустить миграции

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost migrate
'
```

### 10.2 Пропустить поврежденные миграции (осторожно!)

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost migrate --skip-failing
'
```

---

## 11. Backup и Restore

### 11.1 Создать backup

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost backup --with-files
'
```

### 11.2 Скопировать backup на хост

```bash
docker compose cp backend:/workspace/frappe-bench/sites/localhost/private/backups/ ./backups/
```

### 11.3 Восстановить из backup

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost restore /path/to/backup.sql.gz
'
```

---

## 12. Отладка NextCloud Sync

### 12.1 Проверить настройки

```bash
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost console << '\''PYEOF'\''
import frappe
from company_documents.nextcloud_sync import get_nextcloud_config

frappe.init()
frappe.connect()

config = get_nextcloud_config()
if config:
    print("✓ NextCloud config loaded")
    print(f"URL: {config[\"url\"]}")
    print(f"User: {config[\"user\"]}")
    print(f"WebDAV URL: {config[\"webdav_url\"]}")
else:
    print("✗ NextCloud config not found or disabled")
PYEOF'
```

### 12.2 Тест подключения к NextCloud

```bash
# Замените на ваши данные
NC_URL="https://cloud.example.com"
NC_USER="admin"
NC_PASS="password"

curl -u "$NC_USER:$NC_PASS" "$NC_URL/remote.php/dav/files/$NC_USER/"
```

### 12.3 Просмотр логов ошибок

```bash
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost console << '\''PYEOF'\''
import frappe

frappe.init()
frappe.connect()

errors = frappe.get_all("Error Log", 
    filters={"error": ["like", "%NextCloud%"]},
    fields=["name", "creation", "error"],
    limit=5,
    order_by="creation desc")

for error in errors:
    print(f"\n=== {error.name} - {error.creation} ===")
    print(error.error[:500])
PYEOF'
```

---

## 13. Очистка

### 13.1 Очистить кэш

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost clear-cache
'
```

### 13.2 Удалить неиспользуемые Docker данные

```bash
# Удалить остановленные контейнеры
docker container prune

# Удалить неиспользуемые образы
docker image prune

# Удалить неиспользуемые volumes
docker volume prune

# Удалить все неиспользуемое (осторожно!)
docker system prune -a --volumes
```

### 13.3 Проверить размер Docker данных

```bash
docker system df

docker system df -v
```

---

## 14. Мониторинг

### 14.1 Использование ресурсов

```bash
# Реальное время
docker stats

# Один снимок
docker stats --no-stream
```

### 14.2 Проверка здоровья сервисов

```bash
# Ping backend
curl http://localhost:8081

# Healthcheck
docker inspect --format='{{json .State.Health}}' <container_id>
```

### 14.3 Процессы в контейнере

```bash
docker compose exec backend ps aux
```

---

## 15. Git Operations

### 15.1 Проверить статус

```bash
cd /path/to/Company-Documents-App
git status
```

### 15.2 Добавить и закоммитить изменения

```bash
# Добавить fixtures
git add company_documents/fixtures/

# Коммит
git commit -m "feat(fixtures): update DocTypes"

# Пуш
git push origin main
```

### 15.3 Просмотр изменений

```bash
# Diff fixtures
git diff company_documents/fixtures/

# Diff конкретного файла
git diff company_documents/hooks.py
```

---

## 16. Полезные комбинации

### 16.1 Установить app и экспортировать fixtures

```bash
# 1. Установить app для DocTypes
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost console << '\''PYEOF'\''
import frappe
frappe.init()
frappe.connect()
for dt_name in ["Document", "Document File", "Folder Structure Template", "NextCloud Sync Settings", "Task Document Link"]:
    dt = frappe.get_doc("DocType", dt_name)
    dt.app = "company_documents"
    dt.save()
    print(f"Set app for {dt_name}")
frappe.db.commit()
PYEOF'

# 2. Экспортировать fixtures
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost export-fixtures'

# 3. Скопировать на хост
docker compose cp backend:/workspace/frappe-bench/apps/company_documents/company_documents/fixtures/ ./company_documents/fixtures/
```

### 16.2 Проверить установку полностью

```bash
echo "=== Версия Frappe ==="
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench version'

echo -e "\n=== Установленные приложения ==="
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost list-apps'

echo -e "\n=== Server Scripts enabled ==="
docker compose exec backend cat /workspace/frappe-bench/sites/common_site_config.json | grep server_script

echo -e "\n=== DocTypes count ==="
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost console << '\''PYEOF'\''
import frappe
frappe.init()
frappe.connect()
docs = frappe.get_all("DocType", filters={"app": "company_documents"})
print(f"Found {len(docs)} DocTypes")
PYEOF'
```

---

## Ссылки

- **[GUIDELINES.md](GUIDELINES.md)** - Правила для GitHub Copilot
- **[../DEVELOPMENT.md](../DEVELOPMENT.md)** - Процесс разработки
- **[../INDEX.md](../INDEX.md)** - Навигация по документации

---

**Последнее обновление:** 2025-11-20

**Совет:** Добавьте эти команды в закладки для быстрого доступа!
