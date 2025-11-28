# 📋 ФИНАЛЬНЫЙ МАНУАЛ v0.0.2.7: ПОЛНАЯ УСТАНОВКА ERPNext + company_documents

**Дата создания:** 2025-11-20  
**Последнее обновление:** 2025-11-28  
**Версия:** v0.0.2.7 (РАБОЧАЯ, ПРОТЕСТИРОВАННАЯ)  
**Статус:** ✅ РАБОТАЕТ ИЗ КОРОБКИ

---

## 🎯 ЦЕЛЬ

Создать **полностью автоматическую установку** ERPNext + кастомное приложение `company_documents` на **ЧИСТОМ СЕРВЕРЕ**.

## 📦 СОСТАВ ПРИЛОЖЕНИЙ

| Приложение | Версия | Назначение |
|------------|--------|------------|
| **Frappe** | version-15 | Базовая платформа |
| **ERPNext** | v15.83.0 | ERP система |
| **HRMS** | v15.52.0 | Управление персоналом |
| **Raven** | v2.6.4 | Внутренний чат |
| **pibiDAV** | version-15 | WebDAV интеграция |
| **company_documents** | **0.0.2.6** | Наше приложение |

## 📂 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

1. **Docker + Docker Compose**
   ```bash
   docker --version        # >= 20.10
   docker compose version  # >= 2.0
   ```

2. **Архив приложения:**
   ```bash
   ~/company_documents_v0.0.2.tar.gz
   ```

## 🏗️ УСТАНОВКА

### **Шаг 1: Создаём директорию проекта**

```bash
TESTDIR="$HOME/frappe_docker_TEST"
mkdir -p "$TESTDIR"
cd "$TESTDIR"
```

### **Шаг 2: Клонируем frappe_docker**

```bash
git clone https://github.com/frappe/frappe_docker .
```

### **Шаг 3: Распаковываем company_documents**

```bash
mkdir -p company_documents_app
tar -xzf ~/company_documents_v0.0.2.tar.gz -C company_documents_app --strip-components=1
```

### **Шаг 4: Создаём apps.json**

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

> **📌 Важно:** company_documents теперь берётся напрямую из GitHub!

### **Шаг 5: Сборка образа**

```bash
export APPS_JSON_BASE64=$(base64 -w 0 apps.json)

docker build \
  --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" \
  --tag custom-erpnext:v15-0.0.2.6 \
  --file images/custom/Containerfile \
  .
```

### **Шаг 6: Запуск**

```bash
docker compose up -d
docker compose logs -f create-site
```

## ✅ ПРОВЕРКА

**URL:** http://localhost:8081  
**Логин:** Administrator  
**Пароль:** admin

---

## 🚀 БЫСТРАЯ УСТАНОВКА (SSH-скрипт)

Для автоматической установки используйте скрипт `SSH_INSTALL_4.sh` из `_template/0.0.2.4/INSTALL_0.0.2.4/`:

```bash
# Скачать и запустить
curl -O https://raw.githubusercontent.com/pibiDAV/company_documents/main/_template/0.0.2.4/INSTALL_0.0.2.4/SSH_INSTALL_4.sh
chmod +x SSH_INSTALL_4.sh
./SSH_INSTALL_4.sh
```

Скрипт автоматически:
- Проверяет Docker и Docker Compose
- Клонирует frappe_docker
- Создаёт apps.json с GitHub-ссылкой на company_documents
- Собирает образ с прогрессом
- Запускает контейнеры
- Создаёт сайт с developer_mode (до создания!) и всеми fixtures

---

## ⚠️ КРИТИЧНЫЕ МОМЕНТЫ

### 1. developer_mode ПЕРЕД new-site

```bash
# ПРАВИЛЬНО:
bench set-config -gp developer_mode 1
bench new-site localhost --install-app company_documents

# НЕПРАВИЛЬНО:
bench new-site localhost --install-app company_documents
bench set-config -gp developer_mode 1  # Уже поздно!
```

### 2. server_script_enabled

```bash
bench set-config -g server_script_enabled true
```

### 3. Порядок apps в apps.txt

```
frappe
erpnext
hrms
raven
pibidav
company_documents  # ПОСЛЕДНИМ!
```

---

## 📝 Что нового в v0.0.2.6

- ✅ Все DocTypes используют `custom: 1` (не требует developer_mode для fixtures)
- ✅ 84 записи Folder Structure Template с правильным nested set порядком
- ✅ validate hook: автоматический расчёт planned_end_date, files_count, overdue
- ✅ Прямые ссылки на файлы NextCloud через file_id
- ✅ Валидация FST порядка через pre-commit hook

---

**Полная версия:** см. [DOCUMENT_LOGIC.md](DOCUMENT_LOGIC.md) и [NEXTCLOUD_SYNC.md](NEXTCLOUD_SYNC.md)
