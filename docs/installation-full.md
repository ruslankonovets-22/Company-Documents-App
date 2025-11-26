# 📋 ПОЛНЫЙ МАНУАЛ v0.0.2.6: УСТАНОВКА ERPNext + company_documents

**Дата создания:** 2025-11-20  
**Последнее обновление:** 2025-06-24  
**Версия:** v0.0.2.6 (РАБОЧАЯ, ПРОТЕСТИРОВАННАЯ)  
**Статус:** ✅ РАБОТАЕТ ИЗ КОРОБКИ

---

## 🎯 ЦЕЛЬ

Создать **полностью автоматическую установку** ERPNext + кастомное приложение `company_documents` на **ЧИСТОМ СЕРВЕРЕ**, которая:

- ✅ Работает "из коробки" (без ручных действий после `docker compose up`)
- ✅ Устанавливает все fixtures автоматически (DocTypes, Scripts, Workspace, Templates)
- ✅ Правильно настраивает Server Scripts (`server_script_enabled` в `common_site_config.json`)
- ✅ Автоматически синхронизирует документы с NextCloud
- ✅ НЕ требует доступа к другим серверам после начала установки
- ✅ Автоматически рассчитывает planned_end_date, files_count, overdue (validate hook)
- ✅ Создаёт прямые ссылки на файлы NextCloud через file_id

---

## 📦 СОСТАВ ПРИЛОЖЕНИЙ

| Приложение | Версия | Назначение |
|------------|--------|------------|
| **Frappe** | version-15 | Базовая платформа |
| **ERPNext** | v15.83.0 | ERP система |
| **HRMS** | v15.52.0 | Управление персоналом |
| **Raven** | v2.6.4 | Внутренний чат (realtime) |
| **pibiDAV** | version-15 | WebDAV интеграция |
| **company_documents** | **0.0.2.6** | 🎯 **НАШЕ КАСТОМНОЕ ПРИЛОЖЕНИЕ** |

**❌ Frappe Drive ИСКЛЮЧЁН** (избыточен, требует ffmpeg/libmagic1)

---

## 🧩 КАСТОМНОЕ ПРИЛОЖЕНИЕ: company_documents

### **DocTypes (9 штук):**

1. **Document** — основной DocType (автонумерация DOC-2025-00001)
2. **Folder Structure Template** — 84 шаблона (3 корня, 81 дочерних)
3. **Document File** — Child Table
4. **NextCloud Sync Settings** — настройки синхронизации
5-9. Другие DocTypes (см. README.md)

### **Автоматизация (doc_events):**

**validate:**
- `company_documents.custom.document.validate` — расчёт planned_end_date, files_count, overdue

**on_update:**
- `track_folder_changes` — перемещает файлы при изменении level_1-5
- `track_file_deletions` — удаляет из NextCloud
- `upload_to_nextcloud` — загружает новые файлы
- `delete_from_nextcloud` — удаляет файлы

### **Fixtures (custom: 1):**

Все DocTypes используют `custom: 1`, что означает:
- НЕ требуется developer_mode для импорта
- Fixtures загружаются автоматически при `bench --site ... migrate`
- Фильтр: `[["app", "=", "company_documents"]]`

---

## 📂 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

1. **Docker + Docker Compose**
   ```bash
   docker --version        # >= 20.10
   docker compose version  # >= 2.0
   ```

2. **Интернет-доступ к GitHub** (company_documents берётся напрямую)

---

## 🏗️ УСТАНОВКА

### **Способ 1: Автоматический (SSH_INSTALL_4.sh)**

```bash
# Скачать и запустить
curl -O https://raw.githubusercontent.com/pibiDAV/company_documents/main/_template/0.0.2.4/INSTALL_0.0.2.4/SSH_INSTALL_4.sh
chmod +x SSH_INSTALL_4.sh
./SSH_INSTALL_4.sh
```

Скрипт v0.0.2.7 делает:
1. Проверяет Docker/Docker Compose
2. Клонирует frappe_docker
3. Создаёт apps.json с GitHub-ссылкой на company_documents (main)
4. Собирает Docker-образ с прогрессом (вывод каждые 10 секунд)
5. Запускает контейнеры
6. ⚠️ **Устанавливает developer_mode=1 ПЕРЕД new-site**
7. Создаёт сайт и устанавливает company_documents
8. Импортирует все fixtures (84 FST, DocTypes, Scripts...)

### **Способ 2: Ручная установка**

### **Шаг 1: Создаём директорию**

```bash
TESTDIR="$HOME/frappe_docker_TEST"
mkdir -p "$TESTDIR"
cd "$TESTDIR"
```

### **Шаг 2: Клонируем frappe_docker**

```bash
git clone https://github.com/frappe/frappe_docker .
```

### **Шаг 3: apps.json (с GitHub)**

```bash
cat > apps.json << 'JSON'
[
  {"url": "https://github.com/frappe/erpnext", "branch": "v15.83.0"},
  {"url": "https://github.com/frappe/hrms", "branch": "v15.52.0"},
  {"url": "https://github.com/The-Commit-Company/raven", "branch": "v2.6.4"},
  {"url": "https://github.com/pibico/pibidav", "branch": "version-15"},
  {"url": "https://github.com/pibiDAV/company_documents", "branch": "main"}
]
JSON
```

> **📌 Важно:** company_documents теперь берётся напрямую из GitHub (branch: main)!

---

## 🐳 Containerfile

```dockerfile
ARG FRAPPE_BRANCH=version-15
FROM frappe/build:${FRAPPE_BRANCH} AS builder

ARG APPS_JSON_BASE64
USER root
RUN if [ -n "${APPS_JSON_BASE64}" ]; then \
    mkdir -p /opt/frappe && \
    echo "${APPS_JSON_BASE64}" | base64 -d > /opt/frappe/apps.json; \
  fi

USER frappe
RUN bench init --apps_path=/opt/frappe/apps.json --no-procfile /home/frappe/frappe-bench
RUN cd /home/frappe/frappe-bench && bench build --apps frappe,erpnext

FROM frappe/base:${FRAPPE_BRANCH} AS backend
COPY --from=builder --chown=frappe:frappe /home/frappe/frappe-bench /home/frappe/frappe-bench
```

> **Примечание:** company_documents теперь входит в apps.json и устанавливается из GitHub автоматически.

---

## 🐋 compose.yaml (критичные моменты)

```yaml
services:
  configurator:
    image: custom-erpnext:v15-0.0.2.6
    command: >
      bash -c "
      echo frappe > sites/apps.txt;
      echo erpnext >> sites/apps.txt;
      echo hrms >> sites/apps.txt;
      echo raven >> sites/apps.txt;
      echo pibidav >> sites/apps.txt;
      echo company_documents >> sites/apps.txt;
      bench set-config -g db_host db;
      "
  
  create-site:
    image: custom-erpnext:v15-0.0.2.6
    command: >
      bash -c "
      # ⚠️ КРИТИЧНО: developer_mode ПЕРЕД new-site!
      bench set-config -gp developer_mode 1;
      bench new-site localhost --install-app company_documents;
      bench set-config -g server_script_enabled true;
      bench build --apps hrms,raven,pibidav;
      "
  
  backend:
    image: custom-erpnext:v15-0.0.2.6
  
  websocket:
    image: custom-erpnext:v15-0.0.2.6
    environment:
      FRAPPE_REDIS_CACHE: redis://redis-cache:6379
      FRAPPE_REDIS_QUEUE: redis://redis-queue:6379
```

**⚠️ КРИТИЧНО:** `developer_mode` должен быть установлен **ДО** `bench new-site`!

---

## 🚀 ЗАПУСК

```bash
export APPS_JSON_BASE64=$(base64 -w 0 apps.json)
docker build --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" --tag custom-erpnext:v15-0.0.2.6 --file images/custom/Containerfile .
docker compose up -d
docker compose logs -f create-site
```

---

## ✅ ПРОВЕРКА

**URL:** http://localhost:8081  
**Логин:** Administrator  
**Пароль:** admin

### **1. Проверка Server Scripts:**

\`\`\`bash
docker exec -it backend bench --site localhost console
\`\`\`

\`\`\`python
import frappe
from frappe.utils.safe_exec import is_safe_exec_enabled
frappe.init(site='localhost')
frappe.connect()
print(is_safe_exec_enabled())  # True ✅
\`\`\`

### **2. Проверка Document:**

1. Documents app → New Document
2. Заполнить Project, Level 1
3. Save

→ Имя: `DOC-2025-00001` ✅
→ planned_end_date рассчитан автоматически ✅
→ overdue = 0 (если не просрочен) ✅

### **3. Проверка Folder Structure Template:**

```bash
docker exec -it backend bench --site localhost console
```

```python
import frappe
frappe.init(site='localhost')
frappe.connect()
print(frappe.db.count('Folder Structure Template'))  # 84 ✅
```

---

## 🧠 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### **1. developer_mode (КРИТИЧНО!)**

```bash
# ПРАВИЛЬНО - ДО создания сайта:
bench set-config -gp developer_mode 1
bench new-site localhost --install-app company_documents

# НЕПРАВИЛЬНО - после создания:
bench new-site localhost --install-app company_documents
bench set-config -gp developer_mode 1  # Fixtures уже пропущены!
```

### **2. server_script_enabled (КРИТИЧНО!)**

```bash
bench set-config -g server_script_enabled true
```

**Флаг `-g`** = `common_site_config.json` (НЕ `site_config.json`!)

**БЕЗ `-g`** Server Scripts НЕ РАБОТАЮТ в Frappe v15!

### **3. Порядок установки:**

```
erpnext → hrms → raven → pibidav → company_documents (ПОСЛЕДНИМ!)
```

### **4. Frontend assets:**

```bash
bench build --apps hrms,raven,pibidav
```

НЕ включаем `company_documents` (нет frontend-кода).

### **5. WebSocket для Raven:**

```yaml
environment:
  FRAPPE_REDIS_CACHE: redis://redis-cache:6379
  FRAPPE_REDIS_QUEUE: redis://redis-queue:6379
```

**БЕЗ ЭТОГО** Raven не работает в realtime!

### **6. Nested Set порядок (FST):**

Folder Structure Template использует Nested Set. В JSON родители **ДОЛЖНЫ** быть перед дочерними:

```json
[
  {"name": "FST-0001", "parent_folder_structure_template": null},  // root
  {"name": "FST-0004", "parent_folder_structure_template": "FST-0001"},  // child
  ...
]
```

Валидация: `scripts/validate_fst_order.py`, pre-commit hook

---

## 🛠️ УСТРАНЕНИЕ ПРОБЛЕМ

### **"CannotCreateStandardDoctypeError: Not in Developer Mode!"**

**Причина:** developer_mode установлен ПОСЛЕ создания сайта.

**Решение:**
```bash
docker exec -it backend bash
cd /home/frappe/frappe-bench
bench set-config -gp developer_mode 1
bench --site localhost migrate
```

### **"cannot unpack non-iterable NoneType" при импорте FST**

**Причина:** Неправильный порядок в folder_structure_template.json (дочерние перед родителями).

**Решение:** Запустить `scripts/validate_fst_order.py` и исправить порядок.

### **"Server Scripts are disabled"**

```bash
docker exec backend cat /home/frappe/frappe-bench/sites/common_site_config.json | grep server_script
```

Должно быть: `"server_script_enabled": true`

**Исправление:**

```bash
docker exec backend bench set-config -g server_script_enabled true
docker compose restart backend websocket
```

### **WebSocket не работает**

```bash
docker compose logs websocket | grep -i error
```

Проверь переменные `FRAPPE_REDIS_CACHE` и `FRAPPE_REDIS_QUEUE`.

### **Fixtures не импортируются**

Проверить фильтр в hooks.py:
```python
fixtures = [
    {"dt": "DocType", "filters": [["app", "=", "company_documents"]]},
    ...
]
```

---

## 📊 МОНИТОРИНГ

```bash
docker compose logs -f
docker compose ps
docker stats
```

---

## 📝 Что нового в v0.0.2.6

| Изменение | Описание |
|-----------|----------|
| **custom: 1** | Все DocTypes используют custom:1 (не требует developer_mode для fixtures) |
| **84 FST** | Folder Structure Template увеличен с 45 до 84 записей |
| **validate hook** | Авторасчёт planned_end_date, files_count, overdue |
| **file_id** | Прямые ссылки на файлы NextCloud (не папки) |
| **GitHub install** | company_documents устанавливается из GitHub main |
| **Pre-commit** | Валидация nested set порядка FST |

---

## 🎯 ГОТОВО!

**URL:** http://localhost:8081  
**Версия:** v0.0.2.6  
**Статус:** ✅ РАБОТАЕТ

### **Следующие шаги:**

1. Настроить NextCloud Sync Settings
2. Создать проекты
3. Загрузить документы
4. Проверить синхронизацию (прямые ссылки через file_id)

---

## 📚 Связанная документация

- [DOCUMENT_LOGIC.md](DOCUMENT_LOGIC.md) — логика автоматизации Document
- [NEXTCLOUD_SYNC.md](NEXTCLOUD_SYNC.md) — синхронизация с NextCloud
- [FIXTURES.md](FIXTURES.md) — механика fixtures
- [ARCHITECTURE.md](ARCHITECTURE.md) — архитектура приложения
