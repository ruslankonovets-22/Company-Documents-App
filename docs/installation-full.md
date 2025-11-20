# 📋 ПОЛНЫЙ МАНУАЛ v0.0.2: УСТАНОВКА ERPNext + company_documents

**Дата создания:** 2025-11-20  
**Версия:** v0.0.2 (РАБОЧАЯ, ПРОТЕСТИРОВАННАЯ)  
**Статус:** ✅ РАБОТАЕТ ИЗ КОРОБКИ

---

## 🎯 ЦЕЛЬ

Создать **полностью автоматическую установку** ERPNext + кастомное приложение \`company_documents\` на **ЧИСТОМ СЕРВЕРЕ**, которая:

- ✅ Работает "из коробки" (без ручных действий после \`docker compose up\`)
- ✅ Устанавливает все fixtures автоматически (DocTypes, Scripts, Workspace, Templates)
- ✅ Правильно настраивает Server Scripts (\`server_script_enabled\` в \`common_site_config.json\`)
- ✅ Автоматически синхронизирует документы с NextCloud
- ✅ НЕ требует доступа к другим серверам после начала установки

---

## 📦 СОСТАВ ПРИЛОЖЕНИЙ

| Приложение | Версия | Назначение |
|------------|--------|------------|
| **Frappe** | version-15 | Базовая платформа |
| **ERPNext** | v15.83.0 | ERP система |
| **HRMS** | v15.52.0 | Управление персоналом |
| **Raven** | v2.6.4 | Внутренний чат (realtime) |
| **pibiDAV** | version-15 | WebDAV интеграция |
| **company_documents** | **0.0.2** | 🎯 **НАШЕ КАСТОМНОЕ ПРИЛОЖЕНИЕ** |

**❌ Frappe Drive ИСКЛЮЧЁН** (избыточен, требует ffmpeg/libmagic1)

---

## 🧩 КАСТОМНОЕ ПРИЛОЖЕНИЕ: company_documents

### **DocTypes (9 штук):**

1. **Document** — основной DocType (автонумерация DOC-2025-00001)
2. **Folder Structure Template** — 45 шаблонов
3. **Document File** — Child Table
4. **NextCloud Sync Settings** — настройки
5-9. Другие DocTypes (см. README.md)

### **Автоматизация:**

При сохранении Document вызываются 4 функции:
- \`track_folder_changes\` — перемещает файлы при изменении level_1-5
- \`track_file_deletions\` — удаляет из NextCloud
- \`upload_to_nextcloud\` — загружает новые файлы
- \`delete_from_nextcloud\` — удаляет файлы

---

## 📂 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

1. **Docker + Docker Compose**
   \`\`\`bash
   docker --version        # >= 20.10
   docker compose version  # >= 2.0
   \`\`\`

2. **Архив:** \`~/company_documents_v0.0.2.tar.gz\`

---

## 🏗️ УСТАНОВКА

### **Шаг 1: Создаём директорию**

\`\`\`bash
TESTDIR="$HOME/frappe_docker_TEST"
mkdir -p "$TESTDIR"
cd "$TESTDIR"
\`\`\`

### **Шаг 2: Клонируем frappe_docker**

\`\`\`bash
git clone https://github.com/frappe/frappe_docker .
\`\`\`

### **Шаг 3: Распаковываем company_documents**

\`\`\`bash
mkdir -p company_documents_app
tar -xzf ~/company_documents_v0.0.2.tar.gz -C company_documents_app --strip-components=1
\`\`\`

### **Шаг 4: apps.json**

\`\`\`bash
cat > apps.json << 'JSON'
[
  {"url": "https://github.com/frappe/erpnext", "branch": "v15.83.0"},
  {"url": "https://github.com/frappe/hrms", "branch": "v15.52.0"},
  {"url": "https://github.com/The-Commit-Company/raven", "branch": "v2.6.4"},
  {"url": "https://github.com/pibico/pibidav", "branch": "version-15"}
]
JSON
\`\`\`

---

## 🐳 Containerfile

\`\`\`dockerfile
ARG FRAPPE_BRANCH=version-15
FROM frappe/build:\${FRAPPE_BRANCH} AS builder

ARG APPS_JSON_BASE64
USER root
RUN if [ -n "\${APPS_JSON_BASE64}" ]; then \\
    mkdir -p /opt/frappe && \\
    echo "\${APPS_JSON_BASE64}" | base64 -d > /opt/frappe/apps.json; \\
  fi

USER frappe
RUN bench init --apps_path=/opt/frappe/apps.json --no-procfile /home/frappe/frappe-bench
RUN cd /home/frappe/frappe-bench && bench build --apps frappe,erpnext

FROM frappe/base:\${FRAPPE_BRANCH} AS backend
COPY --from=builder --chown=frappe:frappe /home/frappe/frappe-bench /home/frappe/frappe-bench
COPY --chown=frappe:frappe company_documents_app /home/frappe/frappe-bench/apps/company_documents
RUN cd /home/frappe/frappe-bench/apps/company_documents && pip install -e .
\`\`\`

---

## 🐋 compose.yaml (упрощённая версия)

\`\`\`yaml
services:
  configurator:
    image: custom-erpnext:v15-0.0.2
    command: >
      bash -c "
      echo frappe > sites/apps.txt;
      echo erpnext >> sites/apps.txt;
      echo company_documents >> sites/apps.txt;
      bench set-config -g db_host db;
      "
  
  create-site:
    image: custom-erpnext:v15-0.0.2
    command: >
      bash -c "
      bench new-site localhost --install-app company_documents;
      bench set-config -g server_script_enabled true;
      bench build --apps hrms,raven,pibidav;
      "
  
  backend:
    image: custom-erpnext:v15-0.0.2
  
  websocket:
    image: custom-erpnext:v15-0.0.2
    environment:
      FRAPPE_REDIS_CACHE: redis://redis-cache:6379
      FRAPPE_REDIS_QUEUE: redis://redis-queue:6379
\`\`\`

**Полная версия:** см. \`create_docs.sh\` или Release v0.0.2

---

## 🚀 ЗАПУСК

\`\`\`bash
docker build --tag custom-erpnext:v15-0.0.2 .
docker compose up -d
docker compose logs -f create-site
\`\`\`

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

→ Имя: \`DOC-2025-00001\` ✅

---

## 🧠 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### **1. server_script_enabled (КРИТИЧНО!)**

\`\`\`bash
bench set-config -g server_script_enabled true
\`\`\`

**Флаг \`-g\`** = \`common_site_config.json\` (НЕ \`site_config.json\`!)

**БЕЗ \`-g\`** Server Scripts НЕ РАБОТАЮТ в Frappe v15!

### **2. Порядок установки:**

\`\`\`
erpnext → hrms → raven → pibidav → company_documents (ПОСЛЕДНИМ!)
\`\`\`

### **3. Frontend assets:**

\`\`\`bash
bench build --apps hrms,raven,pibidav
\`\`\`

НЕ включаем \`company_documents\` (нет frontend-кода).

### **4. WebSocket для Raven:**

\`\`\`yaml
environment:
  FRAPPE_REDIS_CACHE: redis://redis-cache:6379
  FRAPPE_REDIS_QUEUE: redis://redis-queue:6379
\`\`\`

**БЕЗ ЭТОГО** Raven не работает в realtime!

---

## 🛠️ УСТРАНЕНИЕ ПРОБЛЕМ

### **"Server Scripts are disabled"**

\`\`\`bash
docker exec backend cat /home/frappe/frappe-bench/sites/common_site_config.json | grep server_script
\`\`\`

Должно быть: \`"server_script_enabled": true\`

**Исправление:**

\`\`\`bash
docker exec backend bench set-config -g server_script_enabled true
docker compose restart backend websocket
\`\`\`

### **WebSocket не работает**

\`\`\`bash
docker compose logs websocket | grep -i error
\`\`\`

Проверь переменные \`FRAPPE_REDIS_CACHE\` и \`FRAPPE_REDIS_QUEUE\`.

---

## 📊 МОНИТОРИНГ

\`\`\`bash
docker compose logs -f
docker compose ps
docker stats
\`\`\`

---

## 🎯 ГОТОВО!

**URL:** http://localhost:8081  
**Версия:** v0.0.2  
**Статус:** ✅ РАБОТАЕТ

### **Следующие шаги:**

1. Настроить NextCloud Sync Settings
2. Создать проекты
3. Загрузить документы
4. Проверить синхронизацию

---

**Полная версия Containerfile и compose.yaml:** см. \`create_docs.sh\` в корне репозитория или Release v0.0.2.
