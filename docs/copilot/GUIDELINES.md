# 🤖 GitHub Copilot Guidelines - Company Documents App v0.0.2

**Версия:** v0.0.2  
**Дата:** 2025-11-20  
**Статус:** КРИТИЧНЫЙ ДОКУМЕНТ для GitHub Copilot

---

## ⚠️ ВНИМАНИЕ: Прочитайте перед началом работы!

Этот документ содержит **критичную информацию** для правильной работы с проектом.  
**Не предлагайте решения**, которые противоречат этим правилам!

---

## 1. Уровни уверенности

При ответе на вопросы **ВСЕГДА** указывайте уровень уверенности:

### 1.1 CERTAIN (100%)
**Когда использовать:** Информация из этого файла, официальной документации Frappe v15

**Пример:**
```
CERTAIN: В Frappe v15 для включения Server Scripts нужен флаг -g:
bench set-config -g server_script_enabled 1
```

### 1.2 CONFIDENT (80-99%)
**Когда использовать:** Логический вывод из документации, стандартные практики

**Пример:**
```
CONFIDENT: Для добавления нового поля в DocType нужно:
1. Добавить в JSON определение
2. Запустить bench migrate
Хотя я не вижу конкретного кода в проекте, это стандартный подход Frappe.
```

### 1.3 UNCERTAIN (50-79%)
**Когда использовать:** Предположение на основе похожих случаев

**Пример:**
```
UNCERTAIN: Возможно, проблема в кэше. Попробуйте:
bench clear-cache
Но лучше проверить логи для точной диагностики.
```

### 1.4 DON'T KNOW (<50%)
**Когда использовать:** Нет достаточной информации

**Пример:**
```
DON'T KNOW: Я не знаю точную причину этой ошибки.
Рекомендую проверить:
1. Логи в Error Log
2. bench mariadb для проверки БД
3. Задать вопрос на форуме Frappe
```

**❌ НИКОГДА не выдавайте неуверенные предположения за факты!**

---

## 2. Технический стек (ВЕРСИИ - НЕ ПРЕДЛАГАТЬ ДРУГИЕ!)

### 2.1 Обязательные версии

| Компонент | Версия | Комментарий |
|-----------|--------|-------------|
| **Frappe Framework** | version-15 | ⚠️ НЕ v14, НЕ v16! |
| **ERPNext** | v15.83.0 | Конкретная версия |
| **HRMS** | v15.52.0 | Конкретная версия |
| **Raven** | v2.6.4 | Конкретная версия |
| **pibiDAV** | version-15 | Ветка version-15 |
| **Python** | 3.10+ | Минимум 3.10 |
| **MariaDB** | 10.6 | Совместима с Frappe v15 |
| **Node.js** | 18+ | Для сборки фронтенда |

### 2.2 ❌ НЕ предлагать

- ❌ Frappe v14 - старая версия
- ❌ Frappe v16 - еще не стабильна
- ❌ PostgreSQL - Frappe использует MariaDB
- ❌ Python 2.x - не поддерживается
- ❌ Старые версии ERPNext

---

## 3. Критичные правила (NEVER/ALWAYS)

### 3.1 NEVER (НИКОГДА не делайте это)

#### ❌ NEVER: f-strings в bash
```bash
# ❌ НЕПРАВИЛЬНО
docker compose exec backend bash -c "
python -c 'print(f\"App: {frappe_app}\")'  # bash интерпретирует {}!
"

# ✅ ПРАВИЛЬНО
docker compose exec backend bash -c "
python -c 'print(\"App: {}\".format(\"'$frappe_app'\"))'
"
```

#### ❌ NEVER: bench set-config без -g в v15
```bash
# ❌ НЕПРАВИЛЬНО (работало в v14)
bench set-config server_script_enabled true

# ✅ ПРАВИЛЬНО (v15)
bench set-config -g server_script_enabled 1
```

#### ❌ NEVER: Использовать nano/vim в Docker
```bash
# ❌ НЕПРАВИЛЬНО - nano не установлен
docker compose exec backend nano /path/to/file

# ✅ ПРАВИЛЬНО - heredoc
docker compose exec backend bash -c 'cat > /path/to/file << '\''EOF'\''
content here
EOF'
```

#### ❌ NEVER: Создавать миграции в v0.0.2
```
Причина: ПОЛИГОН - всегда устанавливается с нуля
Миграции будут нужны только с v1.0.0+
```

#### ❌ NEVER: Менять порядок установки приложений
```bash
# ⚠️ ПОРЯДОК КРИТИЧЕН!
bench new-site localhost \
  --install-app erpnext \      # 1
  --install-app hrms \          # 2
  --install-app raven \         # 3
  --install-app pibidav \       # 4
  --install-app company_documents  # 5 - ПОСЛЕДНИМ!
```

### 3.2 ALWAYS (ВСЕГДА делайте это)

#### ✅ ALWAYS: Указывать уровень уверенности
```
Каждый ответ должен начинаться с: CERTAIN/CONFIDENT/UNCERTAIN/DON'T KNOW
```

#### ✅ ALWAYS: Использовать heredoc для редактирования файлов
```bash
docker compose exec backend bash -c 'cat > /path/to/file << '\''EOF'\''
# Содержимое файла
EOF'
```

#### ✅ ALWAYS: Проверять версию перед советом
```bash
# Всегда проверяйте, что совет для правильной версии
bench version  # Должно быть v15.x.x
```

#### ✅ ALWAYS: Использовать фильтр по app для DocTypes
```python
# ❌ НЕПРАВИЛЬНО
{"dt": "DocType", "filters": [["module", "=", "Documents"]]}

# ✅ ПРАВИЛЬНО
{"dt": "DocType", "filters": [["app", "=", "company_documents"]]}
```

#### ✅ ALWAYS: Экспортировать fixtures после изменений
```bash
bench --site localhost export-fixtures
```

---

## 4. Frappe v15 Breaking Changes

### 4.1 Server Scripts Configuration

**v14 (НЕ РАБОТАЕТ в v15):**
```bash
bench set-config server_script_enabled true
```

**v15 (ОБЯЗАТЕЛЬНО):**
```bash
bench set-config -g server_script_enabled 1
```

**Причина:** `is_safe_exec_enabled()` проверяет ТОЛЬКО `common_site_config.json`

### 4.2 Удаленные зависимости

**Удалены из Frappe v15:**
- googlemaps
- urllib3
- gitdb
- pypng
- schedule
- pycryptodome

**Решение:** Добавить в requirements.txt если нужны

### 4.3 Database API

**Удалены:**
- `frappe.db.touch()`
- `frappe.db.clear_table()`
- Параметры: `as_utf8`, `formatted`

**Использовать:**
```python
frappe.db.set_value(doctype, name, field, value)
```

---

## 5. Методы работы

### 5.1 Редактирование файлов (heredoc)

**Шаблон:**
```bash
docker compose exec backend bash -c 'cat > /path/to/file << '\''EOF'\''
# Содержимое файла здесь
# Все спецсимволы работают корректно
# КРОМЕ одиночного '\''EOF'\''
EOF'
```

**Для больших файлов:**
```bash
# 1. Создать локально
cat > /tmp/myfile.py << 'EOF'
# content
EOF

# 2. Скопировать в контейнер
docker compose cp /tmp/myfile.py backend:/workspace/frappe-bench/apps/company_documents/
```

### 5.2 Python команды

**❌ НЕПРАВИЛЬНО:**
```bash
python -c "print(f'Value: {variable}')"  # bash интерпретирует {}
```

**✅ ПРАВИЛЬНО:**
```bash
# Способ 1: .format()
python -c "print('Value: {}'.format('$variable'))"

# Способ 2: heredoc
python << 'PYEOF'
variable = "test"
print(f"Value: {variable}")  # ✅ Работает!
PYEOF
```

### 5.3 Frappe Console

**Интерактивный:**
```bash
docker compose exec backend bash
cd /workspace/frappe-bench
bench --site localhost console

>>> import frappe
>>> doc = frappe.get_doc("Document", "DOC-2025-00001")
>>> print(doc.project)
```

**Неинтерактивный (скрипты):**
```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost console << '\''PYEOF'\''
import frappe
frappe.init()
frappe.connect()

# Ваш код
docs = frappe.get_all("Document")
print(f"Found {len(docs)} documents")
PYEOF'
```

---

## 6. Fixtures Export

### 6.1 Правильный фильтр

```python
# ❌ WRONG (exports 17 DocTypes including ERPNext standard):
{"dt": "DocType", "filters": [["module", "=", "Documents"]]}

# ❌ WRONG (exports only 2 DocTypes with custom=1):
{"dt": "DocType", "filters": [["module", "=", "Documents"], ["custom", "=", 1]]}

# ✅ CORRECT (exports only 5 app DocTypes):
{"dt": "DocType", "filters": [["app", "=", "company_documents"]]}
```

### 6.2 Установка app для DocTypes

```python
import frappe

frappe.init()
frappe.connect()

doctypes = ["Document", "Document File", "Folder Structure Template", 
            "NextCloud Sync Settings", "Task Document Link"]

for dt_name in doctypes:
    dt = frappe.get_doc("DocType", dt_name)
    dt.app = "company_documents"
    dt.save()
    print(f"Set app for {dt_name}")

frappe.db.commit()
```

### 6.3 Команда экспорта

```bash
cd /workspace/frappe-bench
bench --site localhost export-fixtures
```

---

## 7. NextCloud Sync Architecture

### 7.1 Ключевые факты

- **473 строки** самописного кода
- **НЕ использует** pibidav код (только как зависимость)
- **Прямые HTTP запросы** через `requests`
- **WebDAV операции:** MKCOL, PUT, MOVE, DELETE

### 7.2 get_nextcloud_config()

```python
def get_nextcloud_config():
    """
    Получить настройки из Single DocType
    ⚠️ Single = хранится в tabSingles, НЕ в отдельной таблице!
    """
    settings = frappe.get_single("NextCloud Sync Settings")
    
    # Расшифровать пароль (AES-256)
    nc_password = get_decrypted_password(
        "NextCloud Sync Settings",   # doctype
        "NextCloud Sync Settings",   # name (для Single = doctype)
        "nc_password",               # fieldname
        raise_exception=False
    )
    
    return {
        'webdav_url': f"{settings.nc_url}/remote.php/dav/files/{settings.nc_username}",
        'password': nc_password,
        # ...
    }
```

### 7.3 WebDAV операции

```python
from requests.auth import HTTPBasicAuth

auth = HTTPBasicAuth(username, password)

# MKCOL - создать папку
response = requests.request('MKCOL', folder_url, auth=auth)

# PUT - загрузить файл
with open(file_path, 'rb') as f:
    response = requests.put(file_url, data=f, auth=auth)

# MOVE - переместить
headers = {'Destination': new_url}
response = requests.request('MOVE', old_url, headers=headers, auth=auth)

# DELETE - удалить
response = requests.delete(file_url, auth=auth)
```

---

## 8. Docker Setup

### 8.1 apps.json

```json
[
  {"url": "https://github.com/frappe/erpnext", "branch": "v15.83.0"},
  {"url": "https://github.com/frappe/hrms", "branch": "v15.52.0"},
  {"url": "https://github.com/The-Commit-Company/raven", "branch": "v2.6.4"},
  {"url": "https://github.com/pibico/pibidav", "branch": "version-15"}
]
```

**⚠️ company_documents НЕ в apps.json!** Добавляется локально.

### 8.2 Containerfile

**Двухступенчатая сборка:**
1. **Builder** - устанавливает apps из GitHub
2. **Backend** - копирует результат + добавляет company_documents

### 8.3 compose.yaml

**Порты:**
```yaml
ports:
  - "8081:8080"  # Host:Container
```

**Доступ:** http://localhost:8081

---

## 9. Development Approach (ПОЛИГОН)

### 9.1 Что такое ПОЛИГОН?

**ПОЛИГОН** = Тестовый сервер, который **можно полностью пересоздать**

**Принципы:**
- ✅ Можно сломать - не страшно
- ✅ Можно пересоздать - быстро (`docker compose down -v`)
- ✅ Миграции НЕ нужны - всегда чистая установка
- ✅ Пароли хардкодятся - только для разработки

### 9.2 Пароли (DEV ONLY!)

```
Administrator: admin
Database root: 123
MariaDB password: 123
```

**⚠️ Только для разработки! В продакшене используйте безопасные пароли!**

### 9.3 Workflow

```bash
# 1. Внести изменения в код
# 2. Пересоздать окружение
docker compose down -v

# 3. Пересобрать
docker build ... --tag custom-erpnext:v15-0.0.2

# 4. Запустить
docker compose up -d

# 5. Проверить
docker compose logs -f create-site
```

---

## 10. Common Problems and Solutions

### 10.1 Server Scripts не работают

**Проблема:** Server Scripts disabled

**CERTAIN Решение:**
```bash
bench set-config -g server_script_enabled 1
```

**Проверка:**
```bash
cat /workspace/frappe-bench/sites/common_site_config.json
# Должно быть: "server_script_enabled": 1
```

### 10.2 Fixtures экспортируют лишние DocTypes

**Проблема:** 17 DocTypes вместо 5

**CERTAIN Решение:**
```python
# Изменить фильтр в hooks.py
{"dt": "DocType", "filters": [["app", "=", "company_documents"]]}

# Установить app для DocTypes
for dt_name in ["Document", "Document File", ...]:
    dt = frappe.get_doc("DocType", dt_name)
    dt.app = "company_documents"
    dt.save()
```

### 10.3 NextCloud sync не работает

**Проблема:** Файлы не загружаются

**CONFIDENT Решение:**
```python
# 1. Проверить настройки
settings = frappe.get_single("NextCloud Sync Settings")
print(f"Enabled: {settings.enabled}")
print(f"URL: {settings.nc_url}")

# 2. Проверить подключение
curl -u username:password https://cloud.example.com/remote.php/dav/files/username/

# 3. Проверить логи
# Desk → Error Log → Фильтр: "NextCloud"
```

### 10.4 Порт 8081 занят

**Проблема:** `Error: bind: address already in use`

**CERTAIN Решение:**
```yaml
# В compose.yaml изменить
ports:
  - "8082:8080"  # Использовать другой порт
```

---

## 11. Response Format

### 11.1 Структура ответа

```
[УРОВЕНЬ УВЕРЕННОСТИ]: [Краткий ответ]

[Детальное объяснение]

[Код/команды]

[Предупреждения/ссылки]
```

### 11.2 Пример ответа

```
CERTAIN: Для включения Server Scripts в Frappe v15 нужен флаг -g.

В Frappe v15 изменилась логика проверки: функция is_safe_exec_enabled() 
проверяет ТОЛЬКО common_site_config.json (глобальный конфиг).

Команда:
```bash
bench set-config -g server_script_enabled 1
```

Проверка:
```bash
cat sites/common_site_config.json | grep server_script
```

⚠️ Флаг -g критичен! Без него команда запишет в site_config.json 
и Server Scripts не будут работать.

Источник: https://github.com/frappe/frappe/wiki/Migrating-to-Version-15
```

---

## 12. Documentation Links

### 12.1 Внутренняя документация

- **[INDEX.md](../INDEX.md)** - навигация
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - архитектура
- **[DEVELOPMENT.md](../DEVELOPMENT.md)** - разработка
- **[NEXTCLOUD_SYNC.md](../NEXTCLOUD_SYNC.md)** - NextCloud sync
- **[DOCKER_SETUP.md](../DOCKER_SETUP.md)** - Docker setup
- **[FIXTURES.md](../FIXTURES.md)** - Fixtures
- **[COMMON_COMMANDS.md](COMMON_COMMANDS.md)** - частые команды

### 12.2 Внешние ресурсы

- [Frappe v15 Migration](https://github.com/frappe/frappe/wiki/Migrating-to-Version-15)
- [NextCloud WebDAV API](https://docs.nextcloud.com/server/stable/developer_manual/client_apis/WebDAV/)
- [frappe_docker](https://github.com/frappe/frappe_docker)
- [Frappe Framework Docs](https://frappeframework.com/docs)

---

## 13. Changelog

### v0.0.2 (2025-11-20)
- ✅ Добавлена полная документация
- ✅ Создан GUIDELINES.md для Copilot
- ✅ Исправлены фильтры fixtures (app вместо module)
- ✅ Установлен app для всех DocTypes
- ✅ Docker установка из GitHub (не из архива)

### v0.0.1 (2025-09-04)
- Initial development version

---

## 14. Final Checklist

Перед ответом на вопрос проверьте:

- [ ] Указан уровень уверенности?
- [ ] Не нарушены правила NEVER?
- [ ] Соблюдены правила ALWAYS?
- [ ] Использованы правильные версии?
- [ ] Учтены breaking changes v15?
- [ ] Проверен формат ответа?
- [ ] Добавлены предупреждения если нужно?

---

**Последнее обновление:** 2025-11-20

**Помните:** Лучше сказать "DON'T KNOW", чем дать неправильный совет!
