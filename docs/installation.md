# 📋 ФИНАЛЬНЫЙ МАНУАЛ v0.0.2: ПОЛНАЯ УСТАНОВКА ERPNext + company_documents

**Дата создания:** 2025-11-20 14:47:17  
**Версия:** v0.0.2 (РАБОЧАЯ, ПРОТЕСТИРОВАННАЯ)  
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
| **company_documents** | **0.0.2** | Наше приложение |

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
  {"url": "https://github.com/pibico/pibidav", "branch": "version-15"}
]
JSON
```

### **Шаг 5: Сборка образа**

```bash
export APPS_JSON_BASE64=$(base64 -w 0 apps.json)

docker build \
  --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" \
  --tag custom-erpnext:v15-0.0.2 \
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

**Полная версия:** см. Release v0.0.2 на GitHub
