# 🛠️ Разработка Company Documents App v0.0.2

**Версия:** v0.0.2  
**Дата:** 2025-11-20  
**Подход:** ПОЛИГОН (test server)

---

## 1. Философия разработки: ПОЛИГОН

### 1.1 Что такое ПОЛИГОН?

**ПОЛИГОН** - это тестовый сервер, который можно **полностью пересоздать** в любой момент.

**Принципы:**
- ✅ Можно сломать - не страшно
- ✅ Можно пересоздать - быстро
- ✅ Миграции НЕ нужны - всегда чистая установка
- ✅ Пароли хардкодятся - только для разработки

### 1.2 Стадия разработки v0.0.2

**Текущий статус:**
- Development stage
- Миграции **НЕ используются**
- Установка **всегда с нуля**
- База данных **пересоздается** при необходимости

**Пароли (DEV ONLY!):**
- Administrator: `admin`
- Database root: `123`
- MariaDB password: `123`

⚠️ **ВАЖНО:** Эти пароли только для разработки! В продакшене используйте безопасные пароли!

---

## 2. Docker Workflow

### 2.1 Полный пересоздание окружения

**Когда нужно:**
- После изменения fixtures
- После изменения DocTypes
- После добавления новых зависимостей
- Когда что-то сломалось

**Команды:**
```bash
# 1. Остановить и удалить контейнеры + volumes
docker compose down -v

# 2. Пересобрать образ
export APPS_JSON_BASE64=$(base64 -w 0 apps.json)
docker build \
  --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" \
  --tag custom-erpnext:v15-0.0.2 \
  --file images/custom/Containerfile \
  .

# 3. Запустить заново
docker compose up -d

# 4. Следить за установкой
docker compose logs -f create-site
```

### 2.2 Частичное обновление

**Пересоздание только сайта:**
```bash
# Остановить
docker compose stop

# Удалить только volumes
docker volume rm frappe_docker_TEST_sites

# Запустить
docker compose up -d
docker compose logs -f create-site
```

### 2.3 Проверка статуса

```bash
# Список контейнеров
docker compose ps

# Логи сервисов
docker compose logs backend
docker compose logs create-site

# Проверка здоровья
docker compose exec backend bench --version
```

---

## 3. Редактирование файлов в контейнере

### 3.1 Метод Heredoc (РЕКОМЕНДУЕТСЯ)

**Почему:**
- ✅ Не нужен nano или vim
- ✅ Работает везде
- ✅ Безопасно для больших файлов

**Пример:**
```bash
docker compose exec backend bash -c 'cat > /workspace/frappe-bench/apps/company_documents/company_documents/hooks.py << '\''EOF'\''
app_name = "company_documents"
app_title = "Company Documents"
app_version = "0.0.2"

doc_events = {
    "Document": {
        "on_update": [
            "company_documents.nextcloud_sync.upload_to_nextcloud"
        ]
    }
}
EOF'
```

**Шаблон:**
```bash
docker compose exec backend bash -c 'cat > /path/to/file << '\''EOF'\''
# Содержимое файла здесь
# Можно использовать любые символы
# Кроме одиночных '\''EOF'\''
EOF'
```

### 3.2 Копирование файлов

**Из хоста в контейнер:**
```bash
docker compose cp local_file.py backend:/workspace/frappe-bench/apps/company_documents/
```

**Из контейнера на хост:**
```bash
docker compose cp backend:/workspace/frappe-bench/apps/company_documents/hooks.py ./hooks.py
```

### 3.3 ❌ НЕ использовать nano/vim

**Проблемы:**
- Не установлены по умолчанию
- Требуют интерактивный терминал
- Сложности с копированием больших текстов

---

## 4. Python команды в bash

### 4.1 ❌ НЕПРАВИЛЬНО: f-strings в bash

```bash
# ❌ ЭТО НЕ РАБОТАЕТ!
docker compose exec backend bash -c "
frappe_app='company_documents'
python -c 'print(f\"App: {frappe_app}\")'  # ОШИБКА!
"
```

**Проблема:** bash интерпретирует `${}` как свои переменные!

### 4.2 ✅ ПРАВИЛЬНО: .format() или %

```bash
# ✅ Используем .format()
docker compose exec backend bash -c "
frappe_app='company_documents'
python -c 'print(\"App: {}\".format(\"'$frappe_app'\"))'
"

# ✅ Или % форматирование
docker compose exec backend bash -c "
frappe_app='company_documents'
python -c 'print(\"App: %s\" % \"'$frappe_app'\")'
"
```

### 4.3 ✅ ПРАВИЛЬНО: Heredoc для Python скриптов

```bash
docker compose exec backend bash -c 'python << '\''PYEOF'\''
import frappe

frappe_app = "company_documents"
print(f"App: {frappe_app}")  # ✅ Работает!

frappe.init()
frappe.connect()
docs = frappe.get_all("DocType", filters={"app": frappe_app})
print(f"Found {len(docs)} DocTypes")
PYEOF'
```

---

## 5. Frappe Console

### 5.1 Интерактивный режим

```bash
# Войти в контейнер
docker compose exec backend bash

# Запустить консоль
cd /workspace/frappe-bench
bench --site localhost console
```

**Примеры команд:**
```python
# Получить документ
doc = frappe.get_doc("Document", "DOC-2025-00001")
print(doc.as_dict())

# Получить настройки NextCloud
settings = frappe.get_single("NextCloud Sync Settings")
print(settings.nc_url)

# Получить список DocTypes
doctypes = frappe.get_all("DocType", filters={"app": "company_documents"})
for dt in doctypes:
    print(dt.name)

# Выполнить метод
frappe.get_doc("Document", "DOC-2025-00001").save()
```

### 5.2 Неинтерактивный режим (скрипты)

```bash
# Одна команда
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost console << '\''PYEOF'\''
import frappe
print(frappe.get_all("Document", limit=5))
PYEOF'
```

**Шаблон:**
```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost console << '\''PYEOF'\''
import frappe

# Ваш Python код здесь
frappe.init()
frappe.connect()

# Работа с данными
docs = frappe.get_all("Document")
print(f"Total documents: {len(docs)}")
PYEOF'
```

---

## 6. Работа с Fixtures

### 6.1 Экспорт fixtures

```bash
# Из контейнера
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost export-fixtures
'

# Копировать обратно на хост
docker compose cp backend:/workspace/frappe-bench/apps/company_documents/company_documents/fixtures/ ./company_documents/fixtures/
```

### 6.2 Импорт fixtures

**Происходит автоматически при:**
```bash
bench --install-app company_documents
```

**Или вручную:**
```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost migrate
'
```

### 6.3 Назначение app для DocTypes

```bash
docker compose exec backend bash -c 'cd /workspace/frappe-bench && bench --site localhost console << '\''PYEOF'\''
import frappe

frappe.init()
frappe.connect()

# Установить app для всех DocTypes
doctypes = [
    "Document",
    "Document File", 
    "Folder Structure Template",
    "NextCloud Sync Settings",
    "Task Document Link"
]

for dt_name in doctypes:
    dt = frappe.get_doc("DocType", dt_name)
    dt.app = "company_documents"
    dt.save()
    print(f"Set app for {dt_name}")

frappe.db.commit()
print("Done!")
PYEOF'
```

---

## 7. Git Workflow

### 7.1 Ветки

**Структура:**
- `main` - продакшен
- `develop` - разработка
- `feature/*` - новые функции
- `fix/*` - исправления

### 7.2 Коммиты

**Формат:**
```
<type>(<scope>): <subject>

<body>
```

**Типы:**
- `feat` - новая функция
- `fix` - исправление
- `docs` - документация
- `refactor` - рефакторинг
- `test` - тесты

**Примеры:**
```bash
git commit -m "feat(nextcloud): add WebDAV sync"
git commit -m "fix(document): resolve numbering issue"
git commit -m "docs(readme): update installation guide"
```

### 7.3 Релизы

**Версионирование:** Semantic Versioning (MAJOR.MINOR.PATCH)

**Создание релиза:**
```bash
# 1. Обновить версию в hooks.py
app_version = "0.0.3"

# 2. Обновить CHANGELOG.md
## [0.0.3] - YYYY-MM-DD
### Added
- Feature X

# 3. Создать тег
git tag -a v0.0.3 -m "Release v0.0.3"
git push origin v0.0.3
```

---

## 8. Отладка

### 8.1 Логи Frappe

```bash
# Все логи
docker compose logs backend

# Следить за логами
docker compose logs -f backend

# Логи конкретного процесса
docker compose exec backend tail -f /workspace/frappe-bench/logs/bench-start.log
```

### 8.2 Логи NextCloud sync

```python
# В коде
frappe.log_error(title='NextCloud Sync Error', message=str(e))
```

```bash
# Просмотр в интерфейсе
# Перейти в: Desk → Error Log
```

### 8.3 SQL запросы

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost mariadb
'
```

```sql
-- Проверить структуру
SHOW TABLES;
DESCRIBE tabDocument;

-- Проверить данные
SELECT * FROM tabDocument LIMIT 5;
SELECT * FROM tabSingles WHERE doctype = "NextCloud Sync Settings";

-- Проверить индексы
SHOW INDEX FROM tabDocument;
```

---

## 9. Тестирование

### 9.1 Ручное тестирование

**Чек-лист:**
- [ ] Создать новый Document
- [ ] Прикрепить файл
- [ ] Проверить синхронизацию с NextCloud
- [ ] Изменить уровни папок
- [ ] Проверить перемещение файлов
- [ ] Удалить файл
- [ ] Проверить удаление в NextCloud

### 9.2 Автоматические тесты

**Пока не реализованы в v0.0.2**

Планируется:
```python
# tests/test_nextcloud_sync.py
def test_upload_to_nextcloud():
    doc = frappe.get_doc("Document", "TEST-DOC-001")
    # Test logic
```

---

## 10. Производительность

### 10.1 Мониторинг

```bash
# Использование ресурсов
docker stats

# Размер volumes
docker system df -v

# Логи производительности
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost mariadb -e "SHOW PROCESSLIST;"
'
```

### 10.2 Оптимизация

**Docker:**
```yaml
# compose.yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
```

**Frappe:**
```bash
# Увеличить workers
bench set-config -g background_workers 4
bench set-config -g gunicorn_workers 4
```

---

## 11. Порядок установки приложений

### 11.1 ⚠️ КРИТИЧНО: Правильный порядок

```bash
bench new-site localhost \
  --install-app erpnext \
  --install-app hrms \
  --install-app raven \
  --install-app pibidav \
  --install-app company_documents  # ← ПОСЛЕДНИМ!
```

**Почему важен порядок:**
1. `erpnext` - базовые DocTypes (Project, Task)
2. `hrms` - HR функциональность
3. `raven` - чат
4. `pibidav` - базовая WebDAV интеграция
5. `company_documents` - зависит от всех предыдущих

### 11.2 apps.json структура

```json
[
  {"url": "https://github.com/frappe/erpnext", "branch": "v15.83.0"},
  {"url": "https://github.com/frappe/hrms", "branch": "v15.52.0"},
  {"url": "https://github.com/The-Commit-Company/raven", "branch": "v2.6.4"},
  {"url": "https://github.com/pibico/pibidav", "branch": "version-15"}
]
```

**Особенности:**
- ✅ Установка из GitHub (не из архива!)
- ✅ Указаны конкретные версии (tags/branches)
- ✅ company_documents добавляется отдельно (не в apps.json)

---

## 12. Типичные проблемы

### 12.1 Server Scripts не работают

**Проблема:** Server Scripts disabled

**Решение:**
```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost set-config -g server_script_enabled 1
'
```

⚠️ **В v15 флаг `-g` обязателен!**

### 12.2 Fixtures не экспортируются

**Проблема:** Неправильный фильтр в hooks.py

**Решение:** См. [FIXTURES.md](FIXTURES.md)

```python
# ❌ НЕПРАВИЛЬНО
{"dt": "DocType", "filters": [["module", "=", "Documents"]]}

# ✅ ПРАВИЛЬНО
{"dt": "DocType", "filters": [["app", "=", "company_documents"]]}
```

### 12.3 NextCloud sync не работает

**Проблема:** Настройки не сохранены

**Проверка:**
```python
settings = frappe.get_single("NextCloud Sync Settings")
print(settings.enabled)
print(settings.nc_url)
```

**Решение:** Заполнить NextCloud Sync Settings через UI

### 12.4 Порт 8081 занят

**Проблема:** Порт уже используется

**Решение:**
```bash
# Изменить в compose.yaml
ports:
  - "8082:8080"  # Использовать 8082 вместо 8081
```

---

## 13. Best Practices

### 13.1 Разработка

- ✅ Используйте ПОЛИГОН для экспериментов
- ✅ Коммитьте часто, маленькими изменениями
- ✅ Пишите понятные commit messages
- ✅ Тестируйте после каждого изменения
- ✅ Документируйте нестандартные решения

### 13.2 Fixtures

- ✅ Экспортируйте fixtures после изменений
- ✅ Проверяйте фильтры перед экспортом
- ✅ Коммитьте fixtures вместе с кодом

### 13.3 Docker

- ✅ Пересоздавайте окружение при сомнениях
- ✅ Используйте `docker compose down -v` для чистки
- ✅ Следите за размером volumes

---

## 14. Полезные команды

### 14.1 Быстрые проверки

```bash
# Версия приложения
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench version
'

# Список установленных apps
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost list-apps
'

# Проверка fixtures
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
ls -la apps/company_documents/company_documents/fixtures/
'
```

### 14.2 Резервное копирование

```bash
# Backup сайта
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost backup --with-files
'

# Копировать backup на хост
docker compose cp backend:/workspace/frappe-bench/sites/localhost/private/backups/ ./backups/
```

### 14.3 Восстановление

```bash
# Restore из backup
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost restore /path/to/backup.sql.gz
'
```

---

## Ссылки

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - архитектура приложения
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - детали Docker setup
- **[FIXTURES.md](FIXTURES.md)** - работа с fixtures
- **[copilot/GUIDELINES.md](copilot/GUIDELINES.md)** - правила для Copilot

---

**Последнее обновление:** 2025-11-20
