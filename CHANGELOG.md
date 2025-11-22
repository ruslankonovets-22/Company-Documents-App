# Changelog

All notable changes to Company Documents App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---


## [0.0.2.4] - 2025-11-22

### Added
- **NextCloud file_id support**: Новая функция `get_nextcloud_file_id()` для получения file_id через WebDAV PROPFIND
  - Поддержка двух namespace: `oc:fileid` (OwnCloud) и `nc:fileid` (NextCloud 25+)
  - Fallback на поиск без namespace для совместимости
  - Учитывает `root_path` из конфигурации NextCloud

### Fixed
- **Правильное имя поля**: Исправлено `is_synced` → `file_synced` во всех функциях
  - `upload_to_nextcloud()`: теперь использует `file_synced`
  - `sync_document_to_nextcloud()`: исправлена проверка синхронизации
- **Прямые ссылки на файлы**: Вместо ссылки на папку теперь генерируются прямые ссылки на файлы
  - Формат: `/apps/files/files/{file_id}?dir=/path&openfile=true`
  - Fallback на ссылку на папку если file_id недоступен
- **Улучшенный upload_to_nextcloud()**:
  - Автоматическое обновление `file_url` для уже синхронизированных файлов
  - Добавлены поля `uploaded_by` и `uploaded_on` при загрузке
  - Счётчик загруженных файлов и сообщения пользователю
  - Автосохранение изменений с commit
- **Улучшенный move_files_in_nextcloud()**:
  - Обновление `file_url` с file_id после перемещения
  - Счётчик перемещённых файлов
  - Автосохранение изменений после перемещения

### Changed
- Объединены улучшения из дублированной структуры `company_documents/company_documents/`
- Удалена дублированная структура директорий

---


## [0.0.2.3] - 2025-11-22

### Fixed
- **КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ**: Неправильный порядок записей в `folder_structure_template.json`
  - **Проблема**: Дочерние элементы шли ПЕРЕД родительскими (FST-0005 перед FST-0001)
  - **Ошибка при установке**: `TypeError: cannot unpack non-iterable NoneType object`
  - **Причина**: Frappe NestedSet пытался создать child до parent → parent не существует → crash
  - **Решение**: Переупорядочен JSON - сначала root элементы (parent=null), затем children рекурсивно
  - Порядок: FST-0001 (root) → FST-0004 (child) → FST-0015 (grandchild) → ...
  - Теперь fixtures импортируются успешно без ошибок NestedSet
- **ИСПРАВЛЕНО**: Версия в `__init__.py` не обновлялась (осталась 0.0.2.1)
  - Frappe использует `__init__.py` для отображения версии в UI
  - Теперь синхронизировано с `hooks.py`: `0.0.2.3`

### Added
- **Utility scripts** для предотвращения будущих проблем с порядком FST:
  - `scripts/validate_fst_order.py` - проверка правильности порядка
  - `scripts/fix_fst_order.py` - автоматическое исправление с backup
  - `scripts/pre-commit-hook.sh` - Git hook для блокировки неправильных коммитов
  - `scripts/install-hooks.sh` - установка hooks одной командой
  - `scripts/README.md` - полная документация по скриптам

### Technical Details
- **Причина в v0.0.2.2**: Фильтры fixtures были исправлены, но порядок записей остался неправильным
- **NestedSet требования**: Parent должен существовать в БД ПЕРЕД созданием child
- **Решение**: Рекурсивная сортировка по иерархии parent → children → grandchildren
- Всего записей: 45 (3 root + 42 children на разных уровнях)
- **Автоматизация**: Git hooks предотвращают коммиты с неправильным порядком

### Migration Notes
Для обновления с v0.0.2.2:
```bash
cd ~/frappe-bench
bench get-app company_documents --branch main
bench --site {site} install-app company_documents --force
# Или для существующей установки:
bench --site {site} migrate
bench --site {site} clear-cache
bench restart
```

---

## [0.0.2.2] - 2025-11-21

### Fixed
- **КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ**: Fixtures не импортировались при установке приложения
  - Убран фильтр `custom=1` для DocTypes (наши DocTypes имеют `custom=0`)
  - Исправлен title в фильтре Workspace: "Documents app" → "Documents App"
  - Теперь при `bench --install-app company_documents` устанавливаются:
    - ✅ Все 45 Folder Structure Templates
    - ✅ Workspace "Documents App"
    - ✅ Все DocTypes из модулей Documents и Projects
- **Причина проблемы**: DocTypes созданы через код (не через UI), поэтому имеют `custom=0`
- **Проверка регистра**: Workspace title "Documents App" (заглавная A) должен совпадать с фильтром

### Changed
- `company_documents/hooks.py`:
  - Удалён `["custom", "=", 1]` из фильтров DocType
  - Исправлен фильтр Workspace: `["title", "=", "Documents App"]`
- Версия приложения: `0.0.2.1` → `0.0.2.2`

### Technical Details
- **Проблема в v0.0.2.1**: 
  - Фильтр `["custom", "=", 1]` не находил DocTypes с `custom=0`
  - Фильтр `["title", "=", "Documents app"]` не совпадал с `"Documents App"`
- **Решение**: Упрощены фильтры для DocTypes, исправлен регистр в Workspace

### Migration Notes
Для обновления с v0.0.2.1:
```bash
cd ~/frappe-bench
bench get-app company_documents --branch main
bench --site {site} migrate
bench --site {site} clear-cache
bench restart
```

Для новой установки:
```bash
bench --install-app company_documents
# Теперь Folder Structure Templates и Workspace устанавливаются автоматически
```

---

## [0.0.2.1] - 2025-11-21

### Added
- **NextCloud file_id support**: file_url теперь указывает на ФАЙЛ в NextCloud UI (не на папку)
- **get_nextcloud_file_id()**: WebDAV PROPFIND для получения внутреннего file_id файла
- **Поля синхронизации**:
  - `Document File.file_synced` (renamed from `is_synced`)
  - `Document File.uploaded_by` (Link → User) - автор загрузки
  - `Document File.uploaded_on` (Datetime) - timestamp загрузки
- **Server Script "Update Document Synced Status"**: автоматическое обновление `Document.is_synced`
- **show_title_field_in_link**: Level поля показывают имена (не ID)

### Changed
- **upload_to_nextcloud()**: обновляет file_url ВСЕГДА (не только для новых файлов)
  - Получает file_id через PROPFIND после загрузки
  - Устанавливает `file_url = http://.../files/{file_id}?dir=/...&openfile=true`
  - Fallback на ссылку к папке если PROPFIND не вернул file_id
- **move_files_in_nextcloud()**: обновляет file_url с НОВЫМ file_id после перемещения
  - Использует PROPFIND для получения file_id в новой папке
  - Сохраняет изменения через `doc.save()` + `frappe.db.commit()`
- **get_nextcloud_file_id()**: поддержка `oc:fileid` и `nc:fileid` (OwnCloud/NextCloud 25+)
  - Учитывает `root_path` из NextCloud Sync Settings
  - Fallback на поиск без namespace

### Fixed
- file_url не обновлялся для существующих синхронизированных файлов (file_synced=1)
- Database locks при работе в bench console (добавлены commit/rollback)
- Поддержка кириллицы в именах файлов (UTF-8 encoding в quote())

### Technical Details
- **WebDAV PROPFIND**: используется для получения `<oc:fileid>` или `<nc:fileid>`
- **NextCloud Files UI format**: `/apps/files/files/{file_id}?dir={path}&openfile=true`
- **Tested on**: NextCloud 20-27, OwnCloud 10+
- **Frappe v15 compatibility**: server_script_enabled в common_site_config.json

### Known Issues
- В UI file_url может не обновляться сразу (требуется F5 для перезагрузки страницы)
- Debug: если ссылка открывает папку вместо файла → проверить что PROPFIND возвращает file_id

### Migration Notes
**BREAKING CHANGE**: `Document File.is_synced` переименовано в `file_synced`
- Миграция НЕ ТРЕБУЕТСЯ (Frappe автоматически переименует поле при установке)
- Существующие данные сохраняются

**Для обновления с v0.0.2:**
```bash
cd ~/frappe-bench
bench get-app company_documents --branch main
bench --site {site} migrate
bench --site {site} clear-cache
bench restart
```

## [0.0.2] - 2025-11-20
...

## [Unreleased]

### Added
- **Автоматическая очистка пустых папок в NextCloud** после операций с файлами
  - Срабатывает после удаления файлов из Document (вызов в delete_from_nextcloud())
  - Срабатывает после перемещения файлов при изменении level_1..level_5 (вызов в move_files_in_nextcloud())
  - Рекурсивное удаление от самой глубокой папки до корня Projects/
  - Защита через WebDAV PROPFIND с Depth:1 - не удаляет папки с файлами других документов
  - Останавливается на корневой папке Projects/ (никогда не удаляется)

### Changed
- **nextcloud_sync.py** (строки 359-363, 304-308):
  - move_files_in_nextcloud(): добавлен вызов delete_empty_folders_in_nextcloud() после перемещения файлов
  - delete_from_nextcloud(): добавлен вызов delete_empty_folders_in_nextcloud() после удаления файлов
- Удалено избыточное сообщение "Проверены пустые папки" из move_files_in_nextcloud()
  - Было: 2 сообщения (дублирование)
  - Стало: 1 сообщение (только из delete_empty_folders_in_nextcloud())

### Technical
- **Функция delete_empty_folders_in_nextcloud()** (строки 198-264):
  - Теперь используется (была мёртвым кодом с v0.0.1)
  - Все сообщения об удалении папок идут из одного источника
  - Используется WebDAV PROPFIND с Depth:1 для проверки содержимого папки
  - XML парсинг через xml.etree.ElementTree
  - MD5: b7c2ddbaf639e3b214e9d165ef462bc0
  - Size: 18K (482 строки после патча)

### Fixed
- Пустые папки больше не остаются в NextCloud после удаления последнего файла документа
- При изменении структуры (level_1..level_5) старые папки удаляются автоматически
- Устранено дублирование сообщений при перемещении файлов

### Tested
- **Окружение:** localhost:8081 + NextCloud (https://gda.pibico.cloud)
- **Проект:** TESTPROJ
- **Структура:** 5 уровней вложенности
- Тест 1: Удаление файла - 4 папки удалены рекурсивно, Projects/ осталась
- Тест 2: Перемещение файла - старая структура удалена автоматически
- Тест 3: Защита - папка с файлами других документов НЕ удалена

### Commits
- de6cf2a - feat(nextcloud): integrate delete_empty_folders after file operations (2025-11-21)

---

## [0.0.2] - 2025-11-21

### Added

#### DocTypes (9 total)
- **Document** - Основной DocType для управления документами
- **Document File** - Child Table для хранения файлов
- **Folder Structure Template** - Шаблоны структуры папок (45 шаблонов)
- **NextCloud Sync Settings** - Single DocType для настроек синхронизации
- **Task Document Link** - Связь документов с задачами
- **Project Document Type** - Типы документов для проектов
- **Task Employee** - Назначение сотрудников на задачи
- **CILA Document Row** - Строки CILA документов (legacy)
- **Task Workspace Row** - Воркспейсы задач

#### NextCloud Integration
- **nextcloud_sync.py** (473 строки) - Самописная WebDAV реализация
- Функции:
  - `get_nextcloud_config()` - Получение настроек из Single DocType
  - `track_folder_changes()` - Отслеживание изменений структуры папок
  - `track_file_deletions()` - Отслеживание удаленных файлов
  - `upload_to_nextcloud()` - Загрузка файлов (WebDAV PUT)
  - `delete_from_nextcloud()` - Удаление файлов (WebDAV DELETE)
- WebDAV операции: MKCOL, PUT, MOVE, DELETE
- Шифрование паролей (AES-256) через `frappe.utils.password`
- Single DocType для хранения настроек в `tabSingles`

#### Document Events
- `doc_events` в hooks.py - 4 функции на `Document.on_update`:
  1. `track_folder_changes` - отслеживание изменений папок
  2. `track_file_deletions` - отслеживание удалений
  3. `upload_to_nextcloud` - загрузка файлов
  4. `delete_from_nextcloud` - удаление файлов

#### Scripts
- **5 Server Scripts** - серверная логика
- **7 Client Scripts** - клиентская логика в браузере

#### Templates
- **45 Folder Structure Templates** - предопределенные структуры папок для разных типов проектов

#### Naming
- **Автоматическая нумерация** документов: `DOC-.YYYY.-` (например, DOC-2025-00001)
- Document Naming Rule для автоматического присвоения номеров

#### Docker
- **apps.json** - установка приложений из GitHub (не из архива)
  - erpnext v15.83.0
  - hrms v15.52.0
  - raven v2.6.4
  - pibidav version-15
- **Containerfile** - двухступенчатая сборка (builder + backend)
- **compose.yaml** - оркестрация сервисов
- Порт маппинг: 8081 (host) → 8080 (container)

#### Documentation
- **docs/INDEX.md** - Навигация по документации
- **docs/ARCHITECTURE.md** - Архитектура приложения и DocTypes
- **docs/DEVELOPMENT.md** - Процесс разработки (ПОЛИГОН подход)
- **docs/NEXTCLOUD_SYNC.md** - Детали NextCloud синхронизации
- **docs/DOCKER_SETUP.md** - Docker конфигурация и установка
- **docs/FIXTURES.md** - Конфигурация и экспорт fixtures
- **docs/copilot/GUIDELINES.md** - Критичные правила для GitHub Copilot
- **docs/copilot/COMMON_COMMANDS.md** - Частые команды
- **CHANGELOG.md** - История изменений
- Обновлен **README.md** - Quick Start и ссылки на документацию

### Fixed
- **Отключены дублирующие Server Scripts** (#4, #5) - были активны 2 копии одного скрипта
- **Удалены legacy DocTypes**:
  - CILA Document Row (не используется)
  - Task Employee (не используется)
- **Исправлен фильтр fixtures** в hooks.py:
  - Было: `["module", "=", "Documents"]` - экспортировал 17 DocTypes включая стандартные ERPNext
  - Стало: `["app", "=", "company_documents"]` - экспортирует только 5 основных DocTypes приложения
- **Установлен app для всех DocTypes** - теперь все DocTypes имеют `app = "company_documents"`

### Changed
- **Fixtures filter** - изменен с `module + custom` на `app` для корректного экспорта
- **Docker installation** - с установки из архива на установку из GitHub через apps.json
- **Installation order** - подчеркнута критичность порядка (company_documents последним)
- **Server Scripts configuration** - обновлено для Frappe v15 (флаг `-g` обязателен)

### Technical Details
- **Frappe Framework:** version-15
- **ERPNext:** v15.83.0
- **Python:** 3.10+
- **MariaDB:** 10.6
- **Development approach:** ПОЛИГОН (test server, can recreate)
- **Passwords (DEV ONLY!):** Administrator: `admin`, Database: `123`

---

## [0.0.1] - 2025-09-04

### Added
- Начальная версия разработки
- Базовая структура приложения
- Первые DocTypes для управления документами
- Интеграция с NextCloud (прототип)
- Начальная документация

### Technical Details
- **Frappe Framework:** version-15 (initial)
- **Status:** Development/Prototype

---

## Планы на будущее

### [1.0.0] - TBD (Production Release)

#### Planned Features
- [ ] Версионирование документов
- [ ] Шаблоны документов
- [ ] Массовая загрузка файлов
- [ ] Интеграция с электронной подписью
- [ ] REST API для внешних приложений
- [ ] Улучшенные права доступа
- [ ] Аудит логи действий с документами

#### Technical Improvements
- [ ] Миграции для обновлений (сейчас не используются)
- [ ] Автоматические тесты (unit tests, integration tests)
- [ ] CI/CD pipeline
- [ ] Production Docker setup с SSL
- [ ] Monitoring и alerting
- [ ] Backup strategy

---

## Типы изменений

- **Added** - новая функциональность
- **Changed** - изменения в существующей функциональности
- **Deprecated** - функциональность, которая будет удалена в будущем
- **Removed** - удаленная функциональность
- **Fixed** - исправление багов
- **Security** - исправления безопасности

---

## Ссылки

- **Repository:** https://github.com/ruslankonovets-22/Company-Documents-App
- **Releases:** https://github.com/ruslankonovets-22/Company-Documents-App/releases
- **Documentation:** https://github.com/ruslankonovets-22/Company-Documents-App/tree/main/docs
- **Issues:** https://github.com/ruslankonovets-22/Company-Documents-App/issues

---

**Последнее обновление:** 2025-11-21
