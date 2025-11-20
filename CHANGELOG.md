# Changelog

All notable changes to Company Documents App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.0.2] - 2025-11-20

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

**Последнее обновление:** 2025-11-20
