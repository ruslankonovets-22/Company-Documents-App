# 📚 Документация Company Documents App v0.0.2

**Версия:** v0.0.2.6  
**Дата:** 2025-11-26  
**Статус:** Development (Testing Phase)

---

## 🗂️ Навигация по документации

### 📖 Основная документация

1. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Архитектура приложения
   - Обзор проекта и технический стек
   - Структура DocTypes (5 основных + 4 вспомогательных)
   - Структура hooks.py и doc_events
   - Server Scripts и Client Scripts
   - NextCloud Sync Settings (Single DocType)

2. **[API.md](API.md)** - API Reference ⚠️ **НОВЫЙ v0.0.2.6**
   - `get_project_document_overview()` — flat-список для таблиц
   - `get_project_document_tree()` — иерархия для Tree View
   - Примеры использования (Python, JavaScript, curl)
   - Тестирование производительности

3. **[DOCUMENT_LOGIC.md](DOCUMENT_LOGIC.md)** - Логика DocType Document ⚠️ **НОВЫЙ v0.0.2.6**
   - Архитектурные решения и их причины
   - Автоматические расчёты (validate hook)
   - Уровни папок (level_1..5)
   - Связь с Folder Structure Template

4. **[DEVELOPMENT.md](DEVELOPMENT.md)** - Разработка
   - Подход к разработке (ПОЛИГОН)
   - Docker workflow
   - Редактирование файлов в контейнере
   - Python команды и Frappe console
   - Git workflow

5. **[NEXTCLOUD_SYNC.md](NEXTCLOUD_SYNC.md)** - NextCloud синхронизация
   - Архитектура nextcloud_sync.py (473 строки)
   - Функция get_nextcloud_config()
   - WebDAV операции (MKCOL, PUT, MOVE, DELETE)
   - Структура путей файлов в NextCloud
   - Single DocType для хранения настроек

6. **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - Docker установка
   - Структура apps.json
   - Архитектура Containerfile
   - Сервисы compose.yaml
   - Порядок установки приложений
   - Маппинг портов

7. **[FIXTURES.md](FIXTURES.md)** - Конфигурация Fixtures
   - Текущая конфигурация hooks.py
   - Корректный фильтр: `["app", "=", "company_documents"]`
   - Проблемы с фильтрами и их решения
   - Установка app для DocTypes
   - Команда экспорта: `bench export-fixtures`

### 🔧 Внутренние механизмы (Internals)

8. **[internals/FIXTURES_MECHANICS.md](internals/FIXTURES_MECHANICS.md)**
   - Механизм работы fixtures при установке
   - Последовательность импорта (9 типов)
   - Описание каждого fixture (DocType, Server Script, Client Script, FST, Naming Rule)
   - Критичные поля и счётчики (`counter` в Document Naming Rule)
   - Механизм обновления при переустановке
   - Процедуры сброса и управления

9. **[internals/NAMING_MECHANISM.md](internals/NAMING_MECHANISM.md)**
   - Иерархия источников счётчика (Document Naming Rule → tabSeries → cache)
   - Алгоритм генерации номера документа
   - Таблицы БД (tabDocument Naming Rule, tabSeries)
   - Типичные проблемы (нумерация не сбрасывается, fixture импортирует старый счётчик)
   - Процедуры управления (проверка, сброс, установка счётчика)
   - Лучшие практики для development и production

### 🤖 Документация для GitHub Copilot

10. **[copilot/GUIDELINES.md](copilot/GUIDELINES.md)** ⭐ **КРИТИЧНЫЙ ФАЙЛ**
   - Уровни уверенности (CERTAIN, CONFIDENT, UNCERTAIN, DON'T KNOW)
   - Технический стек и версии
   - Критичные правила (NEVER/ALWAYS)
   - Breaking changes в v15
   - Методы работы (heredoc, Python команды, Frappe console)
   - Правила экспорта fixtures
   - Архитектура NextCloud sync
   - Docker setup
   - Подход к разработке (ПОЛИГОН)
   - Типичные проблемы и решения

11. **[copilot/COMMON_COMMANDS.md](copilot/COMMON_COMMANDS.md)**
   - Часто используемые команды
   - Готовые к копированию примеры
   - Редактирование файлов (heredoc)
   - Экспорт fixtures
   - Назначение app для DocTypes
   - Frappe console
   - Docker команды
   - Проверка логов

### 📝 История изменений

12. **[../CHANGELOG.md](../CHANGELOG.md)** - История версий
   - v0.0.2 (2025-11-20) - Текущая версия
   - v0.0.1 (2025-09-04) - Начальная версия

### 🔗 Дополнительно

- **[../README.md](../README.md)** - Главная страница проекта
- **[../knowledge.md](../knowledge.md)** - База знаний (технические детали)
- **[installation.md](installation.md)** - Инструкция по установке (существующая)
- **[configuration.md](configuration.md)** - Настройка NextCloud (существующая)
- **[usage.md](usage.md)** - Использование приложения (существующая)

---

## 🎯 Для кого эта документация

### 👨‍💻 Для разработчиков
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - понимание структуры
- **[API.md](API.md)** - методы API для UI компонентов
- **[DOCUMENT_LOGIC.md](DOCUMENT_LOGIC.md)** - логика DocType Document
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - рабочий процесс
- **[FIXTURES.md](FIXTURES.md)** - работа с данными
- **[internals/FIXTURES_MECHANICS.md](internals/FIXTURES_MECHANICS.md)** - глубокое понимание fixtures
- **[internals/NAMING_MECHANISM.md](internals/NAMING_MECHANISM.md)** - механизм нумерации

### 🤖 Для GitHub Copilot
- **[copilot/GUIDELINES.md](copilot/GUIDELINES.md)** - основные правила
- **[copilot/COMMON_COMMANDS.md](copilot/COMMON_COMMANDS.md)** - быстрые команды

### 🚀 Для новых контрибьюторов
- **[../README.md](../README.md)** - начать здесь
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - быстрый старт
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - процесс разработки

### 🔧 Для DevOps
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - развертывание
- **[NEXTCLOUD_SYNC.md](NEXTCLOUD_SYNC.md)** - интеграция с NextCloud

---

## 📊 Структура проекта

```
Company-Documents-App/
├── README.md                           # Главная страница
├── CHANGELOG.md                        # История версий
├── knowledge.md                        # База знаний
│
├── docs/                               # Документация
│   ├── INDEX.md                        # Этот файл
│   ├── ARCHITECTURE.md                 # Архитектура
│   ├── API.md                          # API Reference (NEW)
│   ├── DOCUMENT_LOGIC.md               # Логика Document (NEW)
│   ├── DEVELOPMENT.md                  # Разработка
│   ├── NEXTCLOUD_SYNC.md              # NextCloud sync
│   ├── DOCKER_SETUP.md                # Docker setup
│   ├── FIXTURES.md                    # Fixtures
│   │
│   ├── internals/                     # Внутренние механизмы
│   │   ├── FIXTURES_MECHANICS.md      # Механизм fixtures
│   │   └── NAMING_MECHANISM.md        # Механизм нумерации
│   │
│   ├── copilot/                       # Для GitHub Copilot
│   │   ├── GUIDELINES.md              # Правила для Copilot
│   │   └── COMMON_COMMANDS.md         # Частые команды
│   │
│   ├── installation.md                # Установка (существующая)
│   ├── configuration.md               # Настройка (существующая)
│   ├── usage.md                       # Использование (существующая)
│   └── architecture.md                # Старая версия (будет заменена)
│
└── company_documents/                  # Код приложения
    ├── hooks.py                        # Конфигурация
    ├── api.py                          # API методы (NEW)
    ├── nextcloud_sync.py              # NextCloud интеграция
    └── fixtures/                      # Данные для установки
```

---

## 🚀 Быстрый старт

1. **Установка:** см. [DOCKER_SETUP.md](DOCKER_SETUP.md)
2. **Разработка:** см. [DEVELOPMENT.md](DEVELOPMENT.md)
3. **NextCloud:** см. [NEXTCLOUD_SYNC.md](NEXTCLOUD_SYNC.md)
4. **Помощь Copilot:** см. [copilot/GUIDELINES.md](copilot/GUIDELINES.md)

---

## 📞 Поддержка

- **GitHub Issues:** [Company-Documents-App/issues](https://github.com/ruslankonovets-22/Company-Documents-App/issues)
- **Автор:** [@ruslankonovets-22](https://github.com/ruslankonovets-22)

---

**Последнее обновление:** 2025-11-26

---

## 📌 Недавние изменения

### 2025-11-26: API и документация v0.0.2.6

- ✅ **[API.md](API.md)** - полная документация API методов
  - `get_project_document_overview()` — flat-список с `files[]`
  - `get_project_document_tree()` — иерархия по level_1..5
  - Примеры Python, JavaScript, curl
  - Тестирование производительности
- ✅ **[DOCUMENT_LOGIC.md](DOCUMENT_LOGIC.md)** - логика DocType Document
- ✅ Обновлена ARCHITECTURE.md, FIXTURES.md, NEXTCLOUD_SYNC.md
- ✅ Добавлен `company_documents/api.py`

### 2025-11-23: Добавлена документация по внутренним механизмам

- ✅ **[internals/FIXTURES_MECHANICS.md](internals/FIXTURES_MECHANICS.md)** - полное описание работы fixtures
- ✅ **[internals/NAMING_MECHANISM.md](internals/NAMING_MECHANISM.md)** - механизм автонумерации документов
- ✅ Документация включает:
  - Последовательность импорта fixtures (9 типов)
  - Описание каждого fixture с примерами
  - Критичные поля (особенно `counter` в Document Naming Rule)
  - Иерархия источников счётчика (Document Naming Rule → tabSeries → cache)
  - Типичные проблемы и их решения
  - Процедуры управления и лучшие практики
