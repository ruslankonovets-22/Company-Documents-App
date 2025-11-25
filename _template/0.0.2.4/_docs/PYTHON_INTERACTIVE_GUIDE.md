# Справочник: Корректная работа с интерактивным Python в Frappe Framework

**Дата создания:** 2025-11-25  
**Версия:** 1.0  
**Назначение:** Полное руководство для избежания типовых ошибок при работе с Bench Console и Python скриптами в Frappe

---

## 🎯 Оглавление
1. Введение: Почему важен правильный подход
2. Методы работы с Python в Frappe: Сравнение
3. Bench Console: Правильное использование
4. Bench Execute: Рекомендуемый метод
5. Типовые ошибки и их решения
6. Работа с NestedSet через Python
7. Лучшие практики и чек-листы
8. Примеры реальных сценариев
9. Источники и ссылки

---

## 1. Введение: Почему важен правильный подход

### 1.1 Контекст выполнения в Frappe
Frappe Framework требует специального контекста для корректной работы Python кода:
- **Site context** — привязка к конкретному сайту
- **Database connection** — активное соединение с БД
- **User context** — текущий пользователь и права доступа
- **Request context** — информация о запросе (если применимо)

**КРИТИЧНО:** Неправильная инициализация контекста приводит к ошибкам типа:
```
AttributeError: 'NoneType' object has no attribute 'site'
TypeError: cannot unpack non-iterable NoneType object
frappe.DoesNotExistError: Site not found
```

### 1.2 Три основных метода работы

| Метод | Когда использовать | Автоматическая инициализация | Подходит для скриптов |
|-------|-------------------|------------------------------|----------------------|
| **bench console** | Интерактивная отладка, тестирование | ✅ Да | ❌ Нет (IPython shell) |
| **bench execute** | Автоматизация, импорт данных | ✅ Да | ✅ Да |
| **Python script** | Standalone скрипты | ❌ Нет (нужна ручная инициализация) | ⚠️ Сложно |

---

## 2. Методы работы с Python в Frappe: Сравнение

### 2.1 Метод 1: bench console (Интерактивный)

**Источник:** https://docs.frappe.io/framework/user/en/bench/frappe-commands

**Описание:**  
Запускает интерактивную IPython оболочку с предварительно инициализированным Frappe контекстом. Доступна опция `--autoreload` для автоматической перезагрузки изменений в коде.

**Команда:**
```bash
bench --site <site_name> console
```

**Что происходит внутри:**
```python
# Frappe автоматически выполняет:
import frappe
frappe.init(site='<site_name>')
frappe.connect()
frappe.local.lang = frappe.db.get_default("lang") or "en"
```

**Преимущества:**
- ✅ Автоматическая инициализация контекста
- ✅ Интерактивная отладка с автодополнением
- ✅ Немедленная обратная связь (результаты выполнения)
- ✅ Доступ к истории команд (IPython)

**Недостатки:**
- ❌ Не подходит для heredoc (многострочные скрипты)
- ❌ Не подходит для автоматизации (CI/CD)
- ❌ Сложно передавать большие блоки кода
- ❌ Невозможно использовать через `docker exec` с heredoc

**Пример использования:**
```bash
# Базовая консоль:
bench --site localhost console

# С автоперезагрузкой кода (удобно для разработки):
bench --site localhost console --autoreload

# В консоли:
>>> import frappe
>>> doc = frappe.get_doc("User", "Administrator")
>>> print(doc.email)
>>> frappe.db.commit()
```

**❌ НЕ РАБОТАЕТ (типовая ошибка):**
```bash
# ОШИБКА: heredoc не работает с IPython
docker exec backend bench --site localhost console << 'PYEOF'
import frappe
doc = frappe.get_doc("User", "Administrator")
print(doc.email)
PYEOF
# → IPython не примет heredoc, команда зависнет
```

---

### 2.2 Метод 2: bench execute (Рекомендуется)

**Источник:** https://docs.frappe.io/framework/user/en/bench/frappe-commands (execute command)

**Описание:**  
Выполняет Python функцию в контексте Frappe. Это **рекомендуемый** метод для автоматизации и batch-операций.

**Важно:** Команда называется просто `execute`, а не `bench execute` в списке команд Frappe.

**Команда:**
```bash
bench --site <site_name> execute <module>.<function> --args '<json_args>'
```

**Что происходит внутри:**
> bench execute runs the function in the same process as the web server, ensuring all Frappe context (site, user, db connection) is properly initialized.

**Структура:**
```
apps/
└── your_app/
    └── your_app/
        └── scripts/
            └── my_script.py  # <-- Ваш модуль
```

**ВАЖНО:** Функция должна быть определена на уровне модуля (не внутри класса или другой функции).

**Пример файла `my_script.py`:**
```python
import frappe

def create_users(names):
    """
    Создать пользователей из списка имен
    Args:
        names: list - Список имен пользователей
    """
    # Контекст уже инициализирован bench execute
    # frappe.init() и frappe.connect() НЕ НУЖНЫ!
    
    for name in names:
        if not frappe.db.exists("User", name):
            doc = frappe.get_doc({
                "doctype": "User",
                "email": name,
                "first_name": name.split("@")[0]
            })
            doc.insert(ignore_permissions=True)
            print(f"✅ Created: {doc.name}")
    
    frappe.db.commit()
    print(f"\n✅ Total created: {len(names)}")
```

**Запуск:**
```bash
# Без аргументов:
bench --site localhost execute your_app.scripts.my_script.create_users

# С аргументами (JSON):
bench --site localhost execute your_app.scripts.my_script.create_users \
  --args '["user1@example.com", "user2@example.com"]'
```

**Преимущества:**
- ✅ Автоматическая инициализация контекста
- ✅ Подходит для автоматизации (CI/CD)
- ✅ Логи сохраняются в Error Log
- ✅ Работает через `docker exec`
- ✅ Поддерживает передачу аргументов (JSON)
- ✅ Транзакции автоматически управляются

**Недостатки:**
- ⚠️ Требует создания отдельного файла (не inline код)
- ⚠️ Аргументы передаются только через JSON

---

### 2.3 Метод 3: Standalone Python скрипт

**Описание:**  
Запуск Python скрипта вне Frappe CLI. Требует **ручной** инициализации контекста.

**❌ НЕПРАВИЛЬНО (типовая ошибка):**
```python
# script.py
import frappe

# ОШИБКА: Контекст не инициализирован!
doc = frappe.get_doc("User", "Administrator")
# → AttributeError: 'NoneType' object has no attribute 'site'
```

**✅ ПРАВИЛЬНО:**
```python
# script.py
import frappe

def main():
    # 1. Инициализировать site
    frappe.init(site='localhost')
    
    # 2. Подключиться к БД
    frappe.connect()
    
    # 3. Ваш код
    doc = frappe.get_doc("User", "Administrator")
    print(doc.email)
    
    # 4. Commit транзакции
    frappe.db.commit()
    
    # 5. Закрыть соединение
    frappe.destroy()

if __name__ == "__main__":
    main()
```

**Запуск:**
```bash
# Через bench (рекомендуется):
bench --site localhost run python script.py

# Напрямую (не рекомендуется):
cd frappe-bench
source env/bin/activate
python script.py
```

**Недостатки:**
- ❌ Требует ручной инициализации (можно забыть)
- ❌ Сложнее управлять транзакциями
- ❌ Нет автоматических логов в Error Log
- ❌ Легко допустить ошибку с контекстом

**Вывод:** Используйте `bench execute` вместо standalone скриптов!

---

## 3. Bench Console: Правильное использование

### 3.1 Запуск консоли

**Базовая команда:**
```bash
bench --site <site_name> console
```

**Примеры:**
```bash
# Локальный site:
bench --site localhost console

# Продакшн site:
bench --site mysite.example.com console

# Через Docker:
docker exec -it backend bench --site localhost console
```

### 3.2 Доступные объекты в консоли

После запуска `bench console` автоматически доступны:

```python
>>> import frappe  # ✅ Уже импортирован
>>> frappe.local.site  # ✅ Site инициализирован
'localhost'

>>> frappe.db  # ✅ БД подключена
<frappe.database.Database object at 0x...>

>>> frappe.session.user  # ✅ Текущий пользователь
'Administrator'
```

### 3.3 Типовые операции в консоли

#### 3.3.1 Чтение данных (Read)

```python
# Получить один документ:
>>> doc = frappe.get_doc("User", "Administrator")
>>> print(doc.email)
administrator@example.com

# Получить список документов:
>>> users = frappe.get_all("User", 
...     filters={"enabled": 1},
...     fields=["name", "email"])
>>> len(users)
5

# SQL запрос:
>>> result = frappe.db.sql("""
...     SELECT name, email 
...     FROM `tabUser` 
...     WHERE enabled = 1
... """, as_dict=True)
>>> result[0]
{'name': 'Administrator', 'email': 'administrator@example.com'}
```

#### 3.3.2 Создание данных (Create)

```python
# Создать документ:
>>> doc = frappe.get_doc({
...     "doctype": "ToDo",
...     "description": "Test task",
...     "status": "Open"
... })
>>> doc.insert(ignore_permissions=True)
>>> frappe.db.commit()  # ⚠️ ВАЖНО: Не забыть commit!
>>> print(f"Created: {doc.name}")
Created: TODO-0001
```

**КРИТИЧНО:** Всегда делайте `frappe.db.commit()` после изменений!

#### 3.3.3 Обновление данных (Update)

```python
# Получить и изменить документ:
>>> doc = frappe.get_doc("ToDo", "TODO-0001")
>>> doc.status = "Closed"
>>> doc.save()
>>> frappe.db.commit()

# Быстрое обновление через set_value:
>>> frappe.db.set_value("ToDo", "TODO-0001", "status", "Closed")
>>> frappe.db.commit()
```

#### 3.3.4 Удаление данных (Delete)

```python
# Удалить документ:
>>> frappe.delete_doc("ToDo", "TODO-0001", force=1)
>>> frappe.db.commit()

# Массовое удаление:
>>> todos = frappe.get_all("ToDo", filters={"status": "Closed"})
>>> for todo in todos:
...     frappe.delete_doc("ToDo", todo.name, force=1)
>>> frappe.db.commit()
```

### 3.4 Полный справочник Database API (frappe.db)

#### 3.4.1 frappe.db.get_list() / frappe.get_list()

**Описание:**  
Возвращает список записей из таблицы DocType с применением прав доступа текущего пользователя.

**Сигнатура:**
```python
frappe.db.get_list(doctype, filters, or_filters, fields, order_by, group_by, start, page_length)
```

**Примеры:**
```python
# Только имена документов (по умолчанию):
>>> frappe.db.get_list('Employee')
[{'name': 'HR-EMP-00008'},
 {'name': 'HR-EMP-00006'},
 {'name': 'HR-EMP-00010'}]

# С конкретными полями:
>>> frappe.db.get_list('Task',
...     filters={'status': 'Open'},
...     fields=['subject', 'date'],
...     order_by='date desc',
...     start=10,
...     page_length=20)

# Использование pluck для получения списка значений:
>>> frappe.db.get_list('Employee', pluck='name')
['HR-EMP-00008', 'HR-EMP-00006', 'HR-EMP-00010']

# Фильтры с операторами:
>>> frappe.db.get_list('Task', filters={'date': ['>', '2019-09-08']})

# Диапазон (BETWEEN):
>>> frappe.db.get_list('Task', filters=[
...     ['date', 'between', ['2020-04-01', '2021-03-31']]
... ])

# LIKE поиск:
>>> frappe.db.get_list('Task', filters={'subject': ['like', '%test%']})

# Группировка и агрегация:
>>> frappe.db.get_list('Task',
...     fields=['count(name) as count', 'status'],
...     group_by='status')
[{'count': 1, 'status': 'Working'},
 {'count': 2, 'status': 'Overdue'},
 {'count': 20, 'status': 'Completed'}]

# Возврат в виде списка кортежей:
>>> frappe.db.get_list('Task',
...     fields=['subject', 'date'],
...     as_list=True)
(('Update Branding', '2019-09-04'),
 ('Missing Documentation', '2019-09-02'))
```

**ВАЖНО:** `get_list()` применяет права доступа! Для обхода используйте `get_all()`.

---

#### 3.4.2 frappe.db.get_all() / frappe.get_all()

**Описание:**  
То же что `get_list()`, но **БЕЗ** проверки прав доступа.

```python
# Получить ВСЕ записи независимо от прав:
>>> frappe.db.get_all('User', fields=['name', 'email'])
```

**Когда использовать:**
- В Server Scripts где нужны все записи
- В фоновых задачах
- В административных скриптах

---

#### 3.4.3 frappe.db.get_value() / frappe.get_value()

**Описание:**  
Получить значение поля (или полей) документа.

**Варианты вызова:**
```python
# Одно значение по имени документа:
>>> subject = frappe.db.get_value('Task', 'TASK00002', 'subject')

# Несколько значений:
>>> subject, description = frappe.db.get_value('Task', 'TASK00002', 
...     ['subject', 'description'])

# Как словарь:
>>> task_dict = frappe.db.get_value('Task', 'TASK00002',
...     ['subject', 'description'], as_dict=True)
>>> task_dict.subject
>>> task_dict.description

# С фильтрами (вернет первую найденную запись):
>>> subject, description = frappe.db.get_value('Task',
...     {'status': 'Open'},
...     ['subject', 'description'])
```

**Производительность:** Быстрее чем `get_doc()` когда нужны только значения полей.

---

#### 3.4.4 frappe.db.get_single_value()

**Описание:**  
Получить значение поля из Single DocType.

```python
# Single DocTypes не имеют множественных записей:
>>> timezone = frappe.db.get_single_value('System Settings', 'timezone')
>>> print(timezone)
'Asia/Kolkata'
```

---

#### 3.4.5 frappe.db.set_value() / frappe.db.update()

**Описание:**  
Обновить значение поля в БД напрямую. **НЕ** вызывает ORM триггеры (`validate`, `on_update`).

**Варианты:**
```python
# Одно поле:
>>> frappe.db.set_value('Task', 'TASK00002', 'subject', 'New Subject')

# Несколько полей:
>>> frappe.db.set_value('Task', 'TASK00002', {
...     'subject': 'New Subject',
...     'description': 'New Description'
... })

# Без обновления modified:
>>> frappe.db.set_value('Task', 'TASK00002', 'subject', 'New Subject',
...     update_modified=False)
```

**⚠️ ВНИМАНИЕ:**  
Этот метод НЕ запускает:
- `validate()` — валидацию
- `on_update()` — хуки после сохранения
- `before_save()` — хуки до сохранения

**Когда использовать:**
- Обновление служебных полей
- Массовые обновления для производительности
- Когда точно знаете что делаете

**Когда НЕ использовать:**
- Когда нужна валидация
- Когда есть бизнес-логика в контроллере

---

#### 3.4.6 frappe.db.exists()

**Описание:**  
Проверить существование документа.

**Варианты:**
```python
# Базовый вызов:
>>> frappe.db.exists("User", "jane@example.org")
True

# С кэшированием (быстрее при повторных проверках):
>>> frappe.db.exists("User", "jane@example.org", cache=True)

# С фильтрами (словарь с doctype):
>>> frappe.db.exists({"doctype": "User", "full_name": "Jane Doe"})

# С фильтрами (отдельно doctype и фильтры):
>>> frappe.db.exists("User", {"full_name": "Jane Doe"})
```

**Производительность:** Быстрее чем `get_doc()` в try/except.

---

#### 3.4.7 frappe.db.count()

**Описание:**  
Подсчитать количество записей.

```python
# Общее количество:
>>> frappe.db.count('Task')
145

# С фильтрами:
>>> frappe.db.count('Task', {'status': 'Open'})
23
```

---

#### 3.4.8 frappe.db.delete()

**Описание:**  
Удалить записи по фильтрам. **DML команда** (можно откатить через rollback).

```python
# Удалить с фильтрами:
>>> frappe.db.delete("Route History", {
...     "modified": ("<=", "2024-01-01"),
...     "user": "john@example.com"
... })

# Удалить ВСЕ записи DocType:
>>> frappe.db.delete("Error Log")

# Удалить из внутренней таблицы:
>>> frappe.db.delete("__Test Table")
```

**⚠️ ВНИМАНИЕ:** Без фильтров удалит ВСЕ записи!

---

#### 3.4.9 frappe.db.truncate()

**Описание:**  
Очистить таблицу полностью. **DDL команда** (НЕ откатывается через rollback!).

```python
>>> frappe.db.truncate("Error Log")
>>> frappe.db.truncate("__Test Table")
```

**КРИТИЧНО:**  
- Выполняет `TRUNCATE TABLE` — автоматический commit
- **НЕЛЬЗЯ** откатить через `rollback()`
- Используйте для периодической очистки логов

**Разница с delete():**

| Метод | Команда SQL | Откат | Скорость | Триггеры |
|-------|-------------|-------|----------|----------|
| `delete()` | DELETE | ✅ Да | Медленнее | ✅ Да |
| `truncate()` | TRUNCATE | ❌ Нет | Быстрее | ❌ Нет |

---

#### 3.4.10 frappe.db.commit()

**Описание:**  
Зафиксировать транзакцию. Вызывает SQL `COMMIT`.

```python
>>> doc.insert()
>>> frappe.db.commit()  # Сохранить изменения
```

**ВАЖНО:** В большинстве случаев commit делается автоматически:
- После успешного POST/PUT запроса
- После фоновых задач
- После патчей

**Ручной commit нужен:**
- В `bench console`
- В `bench execute` скриптах
- При необходимости сохранить промежуточное состояние

---

#### 3.4.11 frappe.db.rollback()

**Описание:**  
Откатить транзакцию. Вызывает SQL `ROLLBACK`.

```python
try:
    doc.insert()
    frappe.db.commit()
except Exception as e:
    frappe.db.rollback()  # Откатить при ошибке
    print(f"Error: {e}")
```

**Автоматический rollback:**  
Frappe автоматически делает `rollback()` при исключениях в POST/PUT запросах.

**Rollback с savepoint:**
```python
# Откатить до конкретной точки сохранения:
>>> frappe.db.rollback(save_point="my_savepoint")
```

**⚠️ ВНИМАНИЕ:** Rollback к savepoint НЕ откатывает:
- Изменения в файловой системе
- Внешние API вызовы
- Email отправки

---

#### 3.4.12 frappe.db.savepoint()

**Описание:**  
Создать именованную точку сохранения для частичного отката.

```python
# Создать savepoint:
>>> frappe.db.savepoint("before_risky_operation")

try:
    # Рискованная операция
    risky_operation()
except Exception:
    # Откатить только до savepoint
    frappe.db.rollback(save_point="before_risky_operation")
```

---

#### 3.4.13 frappe.db.sql()

**Описание:**  
Выполнить произвольный SQL запрос.

**Базовое использование:**
```python
# Простой запрос:
>>> data = frappe.db.sql("""
...     SELECT name, email
...     FROM `tabUser`
...     WHERE enabled = 1
... """, as_dict=True)

# С параметрами (защита от SQL injection):
>>> values = {'company': 'Frappe Technologies Inc'}
>>> data = frappe.db.sql("""
...     SELECT acc.account_number, gl.debit, gl.credit
...     FROM `tabGL Entry` gl
...     LEFT JOIN `tabAccount` acc ON gl.account = acc.name
...     WHERE gl.company = %(company)s
... """, values=values, as_dict=True)

# Как список кортежей:
>>> data = frappe.db.sql("SELECT name, email FROM `tabUser`", as_dict=False)
[('Administrator', 'admin@example.com'), ...]
```

**⚠️ ВНИМАНИЕ:**
- Используйте **параметризованные запросы** для защиты от SQL injection
- Названия таблиц: `tabDocType Name` (с префиксом `tab`)
- Избегайте `sql()` где возможно — используйте ORM методы

---

#### 3.4.14 frappe.db.multisql()

**Описание:**  
Выполнить запрос для разных СУБД (MariaDB/Postgres).

```python
>>> frappe.db.multisql({
...     'mariadb': "SELECT * FROM `tabUser` LIMIT 10",
...     'postgres': "SELECT * FROM \"tabUser\" LIMIT 10"
... })
```

**Когда использовать:**  
Когда синтаксис SQL различается между MariaDB и PostgreSQL.

---

#### 3.4.15 Дополнительные методы

**frappe.db.add_index()** — добавить индекс:
```python
>>> frappe.db.add_index("Notes", ["id(10)", "content(500)"], "idx_notes")
```

**frappe.db.add_unique()** — добавить unique constraint:
```python
>>> frappe.db.add_unique("DocType", ["field1", "field2"])
```

**frappe.db.describe()** — описание таблицы:
```python
>>> frappe.db.describe("User")
```

**frappe.db.change_column_type()** — изменить тип колонки:
```python
>>> frappe.db.change_column_type("User", "phone", "varchar(20)")
```

**frappe.db.rename_table()** — переименовать таблицу:
```python
>>> frappe.db.rename_table("__old_table", "__new_table")
```

**⚠️ НЕ используйте** для переименования DocType таблиц! Используйте `frappe.rename_doc()`.

---

#### 3.4.16 Transaction Hooks (Хуки транзакций)

**Описание:**  
Выполнить функции до/после commit/rollback.

**Доступные хуки:**
- `frappe.db.before_commit.add(func)`
- `frappe.db.after_commit.add(func)`
- `frappe.db.before_rollback.add(func)`
- `frappe.db.after_rollback.add(func)`

**Пример:**
```python
def create_file(self):
    self.write_file()
    # Удалить файл при rollback
    frappe.db.after_rollback.add(self.rollback_file)

def rollback_file(self):
    self.delete_file()
```

**Когда использовать:**
- Синхронизация файловой системы с БД
- Отправка уведомлений только при успешном commit
- Очистка ресурсов при rollback

---

### 3.5 Полный справочник Document API

#### 3.5.1 frappe.get_doc()

**Описание:**  
Получить существующий документ или создать новый объект в памяти.

**Варианты вызова:**

```python
# 1. Получить существующий документ:
>>> doc = frappe.get_doc('Task', 'TASK00002')
>>> doc.title = 'Updated Title'
>>> doc.save()

# 2. Получить Single DocType (без name):
>>> doc = frappe.get_doc('System Settings')
>>> print(doc.timezone)  # Asia/Kolkata

# 3. Создать новый документ (словарь):
>>> doc = frappe.get_doc({
...     'doctype': 'Task',
...     'title': 'New Task',
...     'status': 'Open'
... })
>>> doc.insert()

# 4. Создать новый документ (kwargs):
>>> doc = frappe.get_doc(
...     doctype='User',
...     email='test@example.com',
...     first_name='Test'
... )
>>> doc.insert()
```

**Исключения:**
- `frappe.DoesNotExistError` — документ не найден

---

#### 3.5.2 frappe.get_last_doc()

**Описание:**  
Получить последний созданный документ.

```python
# Последний Task:
>>> task = frappe.get_last_doc('Task')

# С фильтрами:
>>> task = frappe.get_last_doc('Task', filters={"status": "Cancelled"})

# С custom сортировкой:
>>> task = frappe.get_last_doc('Task',
...     filters={"status": "Open"},
...     order_by="timestamp desc")
```

**По умолчанию:** Сортировка по `creation desc`.

---

#### 3.5.3 frappe.get_cached_doc()

**Описание:**  
То же что `get_doc()`, но с проверкой кэша перед запросом к БД.

```python
>>> doc = frappe.get_cached_doc('User', 'Administrator')
```

**Когда использовать:**  
- Часто используемые документы (System Settings, User, etc.)
- Документы, которые редко меняются

---

#### 3.5.4 frappe.new_doc()

**Описание:**  
Альтернативный способ создания нового документа.

```python
>>> doc = frappe.new_doc('Task')
>>> doc.title = 'New Task 2'
>>> doc.status = 'Open'
>>> doc.insert()
```

---

#### 3.5.5 frappe.delete_doc()

**Описание:**  
Удалить документ и связанные записи (Comments, Communications, etc.).

```python
# Базовое удаление:
>>> frappe.delete_doc('Task', 'TASK00002')

# С игнорированием прав:
>>> frappe.delete_doc('Task', 'TASK00002',
...     force=1,
...     ignore_permissions=True)
```

**Параметры:**
- `force=1` — игнорировать проверки (submit status, etc.)
- `ignore_permissions=True` — игнорировать права доступа

---

#### 3.5.6 frappe.rename_doc()

**Описание:**  
Переименовать документ (изменить primary key).

```python
# Базовое переименование:
>>> frappe.rename_doc('Task', 'TASK00002', 'TASK00003')

# Со слиянием:
>>> frappe.rename_doc('Task', 'TASK00002', 'TASK00003', merge=True)
```

**⚠️ ВНИМАНИЕ:**  
Работает только если в DocType включено `Allow Rename`.

---

#### 3.5.7 frappe.get_meta()

**Описание:**  
Получить метаинформацию о DocType (включая custom fields).

```python
>>> meta = frappe.get_meta('Task')
>>> meta.has_field('status')  # True
>>> meta.get_custom_fields()  # [field1, field2, ...]
>>> meta.istable  # False
>>> meta.is_tree  # False
```

**Для получения оригинального DocType (без custom fields):**
```python
>>> doctype_doc = frappe.get_doc('DocType', 'Task')
```

---

#### 3.5.8 doc.insert()

**Описание:**  
Вставить новый документ в БД. Вызывает `before_insert`, `validate`, `on_update`, `after_insert`.

```python
>>> doc = frappe.get_doc({'doctype': 'Task', 'title': 'New Task'})
>>> doc.insert(
...     ignore_permissions=True,     # Игнорировать права
...     ignore_links=True,            # Игнорировать Link валидацию
...     ignore_if_duplicate=True,     # Не падать при дубликате
...     ignore_mandatory=True         # Игнорировать обязательные поля
... )
```

---

#### 3.5.9 doc.save()

**Описание:**  
Сохранить изменения в существующем документе. Вызывает `validate`, `on_update`.

```python
>>> doc = frappe.get_doc('Task', 'TASK00002')
>>> doc.status = 'Completed'
>>> doc.save(
...     ignore_permissions=True,  # Игнорировать права
...     ignore_version=True       # Не создавать версию
... )
```

---

#### 3.5.10 doc.delete()

**Описание:**  
Удалить документ. Алиас для `frappe.delete_doc()`.

```python
>>> doc = frappe.get_doc('Task', 'TASK00002')
>>> doc.delete()
```

---

#### 3.5.11 doc.reload()

**Описание:**  
Обновить документ из БД (получить последние изменения).

```python
>>> doc = frappe.get_doc('Task', 'TASK00002')
# ... другой код изменил документ в БД ...
>>> doc.reload()  # Обновить из БД
```

---

#### 3.5.12 doc.get_doc_before_save()

**Описание:**  
Получить версию документа до внесения изменений.

```python
>>> doc = frappe.get_doc('Task', 'TASK00002')
>>> old_doc = doc.get_doc_before_save()
>>> if old_doc.price != doc.price:
...     print("Price changed!")
```

---

#### 3.5.13 doc.db_set()

**Описание:**  
Обновить поле напрямую в БД, обновить `modified`. **НЕ** вызывает валидацию.

```python
# Базовое использование:
>>> doc.db_set('price', 2300)

# С уведомлением:
>>> doc.db_set('price', 2300, notify=True)

# С commit:
>>> doc.db_set('price', 2300, commit=True)

# Без обновления modified:
>>> doc.db_set('price', 2300, update_modified=False)
```

**⚠️ ВНИМАНИЕ:** Не вызывает `validate()` и `on_update()`!

---

#### 3.5.14 doc.append()

**Описание:**  
Добавить строку в child table.

```python
>>> doc = frappe.get_doc('Sales Order', 'SO-0001')
>>> doc.append("items", {
...     "item_code": "ITEM-001",
...     "qty": 5,
...     "rate": 100
... })
>>> doc.save()
```

---

#### 3.5.15 doc.check_permission()

**Описание:**  
Проверить права доступа. Бросает исключение при отсутствии прав.

```python
>>> doc.check_permission(permtype='write')  # Throws если нет прав
```

---

#### 3.5.16 doc.get_url()

**Описание:**  
Получить URL документа в Desk.

```python
>>> doc = frappe.get_doc('Task', 'TASK00002')
>>> url = doc.get_url()  # /app/task/TASK00002
```

---

#### 3.5.17 doc.add_comment()

**Описание:**  
Добавить комментарий (отображается в Timeline).

```python
# Простой комментарий:
>>> doc.add_comment('Comment', text='Test Comment')

# Комментарий типа Edit:
>>> doc.add_comment('Edit', 'Values changed')

# Комментарий типа Shared:
>>> doc.add_comment("Shared",
...     f"{user} shared this document with everyone")
```

---

#### 3.5.18 doc.add_tag()

**Описание:**  
Добавить тег к документу.

```python
>>> doc.add_tag('developer')
>>> doc.add_tag('frontend')
```

---

#### 3.5.19 doc.get_tags()

**Описание:**  
Получить список тегов документа.

```python
>>> tags = doc.get_tags()
>>> print(tags)  # ['developer', 'frontend']
```

---

#### 3.5.20 doc.add_seen() / doc.add_viewed()

**Описание:**  
Отметить документ как просмотренный.

```python
# Добавить текущего пользователя:
>>> doc.add_seen()
>>> doc.add_viewed()

# Добавить конкретного пользователя:
>>> doc.add_seen('john@doe.com')
>>> doc.add_viewed('john@doe.com')
```

**Требования:**  
- `add_seen()` — DocType должен иметь `Track Seen`
- `add_viewed()` — DocType должен иметь `Track Views`

---

#### 3.5.21 doc.run_method()

**Описание:**  
Вызвать метод контроллера, включая хуки.

```python
>>> doc.run_method('validate')
>>> doc.run_method('custom_method', arg1='value1')
```

---

#### 3.5.22 doc.queue_action()

**Описание:**  
Выполнить метод в фоновом режиме.

```python
>>> doc.queue_action('send_emails',
...     emails=email_list,
...     message='Howdy')
```

---

#### 3.5.23 Tree DocType методы

**doc.get_children()** — получить дочерние узлы:
```python
>>> for child_doc in doc.get_children():
...     print(child_doc.name)
...     for grandchild_doc in child_doc.get_children():
...         print(f"  {grandchild_doc.name}")
```

**doc.get_parent()** — получить родительский узел:
```python
>>> parent_doc = doc.get_parent()
>>> grandparent_doc = parent_doc.get_parent()
```

---

#### 3.5.24 Низкоуровневые методы (использовать осторожно)

**doc.db_insert()** — вставить без валидации:
```python
>>> doc = frappe.get_doc(doctype="Test", data="value")
>>> doc.db_insert()  # Без валидации и хуков!
```

**doc.db_update()** — обновить без валидации:
```python
>>> doc = frappe.get_last_doc("User")
>>> doc.last_active = frappe.utils.now()
>>> doc.db_update()  # Без валидации и хуков!
```

**⚠️ КРИТИЧНО:** Эти методы обходят:
- Валидацию (`validate()`)
- Хуки (`before_insert`, `on_update`, etc.)
- Права доступа

Используйте только когда точно знаете что делаете!

---

### 3.6 Типовые ошибки в консоли

#### Ошибка 1: Забыли commit
```python
>>> doc = frappe.get_doc({"doctype": "ToDo", "description": "Test"})
>>> doc.insert()
>>> # ОШИБКА: Забыли frappe.db.commit()
>>> # Выход из консоли → изменения потеряны!
```

**Решение:**
```python
>>> frappe.db.commit()  # ✅ Всегда делать commit
```

#### Ошибка 2: Попытка использовать heredoc

```bash
# ❌ НЕ РАБОТАЕТ:
bench --site localhost console << 'EOF'
print("Hello")
EOF
# → Консоль зависнет, ожидая ввода
```

**Решение:** Используйте `bench execute` для скриптов!

#### Ошибка 3: Неправильный импорт

```python
>>> from frappe import get_doc  # ❌ Может не работать
>>> doc = get_doc("User", "Administrator")  # ❌ Ошибка
```

**Решение:**
```python
>>> import frappe  # ✅ Всегда импортировать frappe целиком
>>> doc = frappe.get_doc("User", "Administrator")  # ✅ Правильно
```

---

## 4. Bench Execute: Рекомендуемый метод

### 4.1 Структура проекта

```
apps/
└── your_app/
    └── your_app/
        ├── __init__.py
        └── scripts/
            ├── __init__.py
            ├── import_data.py
            ├── cleanup.py
            └── utils.py
```

### 4.2 Базовый шаблон скрипта

```python
# apps/your_app/your_app/scripts/import_data.py
import frappe

def import_all():
    """
    Импортировать все данные
    Вызов: bench --site localhost execute your_app.scripts.import_data.import_all
    """
    # Контекст УЖЕ инициализирован bench execute
    # НЕ НУЖНО: frappe.init(), frappe.connect()
    
    print("Starting import...")
    
    # Ваш код здесь
    data = [
        {"name": "Item 1", "status": "Active"},
        {"name": "Item 2", "status": "Active"},
    ]
    
    for item in data:
        create_item(item)
    
    # Commit в конце
    frappe.db.commit()
    print(f"✅ Import completed: {len(data)} items")

def create_item(item_data):
    """Вспомогательная функция"""
    if not frappe.db.exists("Item", item_data["name"]):
        doc = frappe.get_doc({
            "doctype": "Item",
            **item_data
        })
        doc.insert(ignore_permissions=True)
        print(f"  Created: {doc.name}")
```

### 4.3 Скрипт с аргументами

```python
# apps/your_app/your_app/scripts/import_data.py
import frappe
import json

def import_specific(doctype, json_data):
    """
    Импортировать данные для конкретного DocType
    
    Args:
        doctype: str - Имя DocType
        json_data: str - JSON строка с данными
    
    Вызов:
        bench --site localhost execute \
          your_app.scripts.import_data.import_specific \
          --args '["ToDo", "[{\"description\": \"Task 1\"}]"]'
    """
    # Парсить JSON аргумент
    data = json.loads(json_data)
    
    for item in data:
        doc = frappe.get_doc({
            "doctype": doctype,
            **item
        })
        doc.insert(ignore_permissions=True)
        print(f"Created: {doc.name}")
    
    frappe.db.commit()
```

**Запуск:**
```bash
bench --site localhost execute \
  your_app.scripts.import_data.import_specific \
  --args '["ToDo", "[{\"description\": \"Task 1\"}, {\"description\": \"Task 2\"}]"]'
```

### 4.4 Обработка ошибок

```python
import frappe

def safe_import():
    """
    Импорт с обработкой ошибок
    """
    success = 0
    errors = 0
    
    data = get_data()  # Ваша функция получения данных
    
    for item in data:
        try:
            doc = frappe.get_doc({
                "doctype": "Item",
                **item
            })
            doc.insert(ignore_permissions=True)
            success += 1
            
            # Commit после каждого успешного создания
            frappe.db.commit()
            
        except Exception as e:
            errors += 1
            print(f"❌ Error creating {item.get('name')}: {str(e)}")
            
            # Rollback при ошибке
            frappe.db.rollback()
            
            # Логировать в Error Log
            frappe.log_error(
                title=f"Import Error: {item.get('name')}",
                message=frappe.get_traceback()
            )
    
    print(f"\n✅ Success: {success}")
    print(f"❌ Errors: {errors}")
```

---

## 5. Типовые ошибки и их решения

### 5.1 Ошибка: AttributeError - NoneType site

**Ошибка:**
```python
AttributeError: 'NoneType' object has no attribute 'site'
```

**Причина:**  
Frappe контекст не инициализирован.

**Решение:**
```python
# ❌ НЕПРАВИЛЬНО:
import frappe
doc = frappe.get_doc("User", "Administrator")

# ✅ ПРАВИЛЬНО (standalone скрипт):
import frappe
frappe.init(site='localhost')
frappe.connect()
doc = frappe.get_doc("User", "Administrator")

# ✅ ЛУЧШЕ: Используйте bench execute
```

---

### 5.2 Ошибка: TypeError - cannot unpack non-iterable NoneType

**Ошибка:**
```python
TypeError: cannot unpack non-iterable NoneType object
```

**Причина (в контексте NestedSet):**  
Попытка создать дочерний элемент ДО создания родительского.

**Пример:**
```python
# ❌ НЕПРАВИЛЬНО: Родитель FST-0001 не существует
doc = frappe.get_doc({
    "doctype": "Folder Structure Template",
    "name": "FST-0004",
    "parent_folder_structure_template": "FST-0001"  # ← НЕ СОЗДАН!
})
doc.insert()
# → TypeError при вычислении lft/rgt
```

**Решение:**
```python
# ✅ ПРАВИЛЬНО: Сначала создать родителя
parent = frappe.get_doc({
    "doctype": "Folder Structure Template",
    "name": "FST-0001",
    "parent_folder_structure_template": None,
    "is_group": 1
})
parent.insert()
frappe.db.commit()

# Теперь создать дочерний элемент
child = frappe.get_doc({
    "doctype": "Folder Structure Template",
    "name": "FST-0004",
    "parent_folder_structure_template": "FST-0001"  # ← Родитель существует ✅
})
child.insert()
frappe.db.commit()
```

---

### 5.3 Ошибка: Изменения не сохранились

**Проблема:**
```python
>>> doc = frappe.get_doc("User", "Administrator")
>>> doc.email = "new@example.com"
>>> doc.save()
>>> # Выход из консоли
>>> # Вход снова → email не изменился!
```

**Причина:**  
Забыли сделать `frappe.db.commit()`.

**Решение:**
```python
>>> doc = frappe.get_doc("User", "Administrator")
>>> doc.email = "new@example.com"
>>> doc.save()
>>> frappe.db.commit()  # ✅ ОБЯЗАТЕЛЬНО!
```

---

### 5.4 Ошибка: frappe.DoesNotExistError

**Ошибка:**
```python
frappe.exceptions.DoesNotExistError: User not found
```

**Причина:**  
Документ не существует в базе.

**Решение:**
```python
# ❌ НЕПРАВИЛЬНО:
doc = frappe.get_doc("User", "nonexistent@example.com")

# ✅ ПРАВИЛЬНО: Проверить существование
if frappe.db.exists("User", "nonexistent@example.com"):
    doc = frappe.get_doc("User", "nonexistent@example.com")
else:
    print("User does not exist")
```

---

### 5.5 Ошибка: PermissionError

**Ошибка:**
```python
frappe.exceptions.PermissionError: You do not have permission to create User
```

**Причина:**  
Текущий пользователь не имеет прав.

**Решение:**
```python
# ❌ НЕПРАВИЛЬНО:
doc.insert()

# ✅ ПРАВИЛЬНО: Игнорировать проверку прав
doc.insert(ignore_permissions=True)

# Или установить администратора:
frappe.set_user("Administrator")
doc.insert()
```

---

### 5.6 Ошибка: Циклическая зависимость в NestedSet

**Ошибка:**
```python
frappe.exceptions.ValidationError: Cannot create circular reference
```

**Причина:**  
Попытка сделать узел родителем самого себя или его потомка.

**Пример:**
```python
# ❌ НЕПРАВИЛЬНО:
doc = frappe.get_doc("Account", "Assets")
doc.parent_account = "Assets"  # ← Сам себе родитель!
doc.save()
# → ValidationError
```

**Решение:**  
Проверить логику иерархии перед сохранением.

---

## 6. Работа с NestedSet через Python

### 6.1 Принципы работы с NestedSet

**КРИТИЧНО:** При работе с Tree DocTypes (NestedSet) соблюдайте порядок:
- **Создание:** Родители ПЕРЕД детьми (breadth-first)
- **Удаление:** Дети ПЕРЕД родителями (листья → корни)

**Источник:** https://github.com/frappe/frappe/blob/develop/frappe/utils/nestedset.py

### 6.2 Правильное создание иерархии

**КРИТИЧЕСКАЯ ИНФОРМАЦИЯ:** Имя поля родителя в Tree DocType формируется по правилу:
- **По умолчанию:** `parent_{doctype_name_scrubbed}`
- Например: `parent_account`, `parent_item_group`, `parent_folder_structure_template`
- **Или через:** свойство `nsm_parent_field` в классе DocType

```python
import frappe

def create_tree_nodes():
    """
    Создать узлы дерева в правильном порядке
    """
    # Level 0: Корневые элементы (parent = None или пустая строка)
    roots = [
        {"name": "ROOT-1", "parent": None, "is_group": 1},
        {"name": "ROOT-2", "parent": None, "is_group": 1},
    ]
    
    for data in roots:
        create_node("Account", data)
    
    frappe.db.commit()  # Commit после уровня
    
    # Level 1: Дети корневых элементов
    children = [
        {"name": "CHILD-1", "parent": "ROOT-1", "is_group": 1},
        {"name": "CHILD-2", "parent": "ROOT-2", "is_group": 0},
    ]
    
    for data in children:
        create_node("Account", data)
    
    frappe.db.commit()  # Commit после уровня
    
    # Level 2: Внуки
    grandchildren = [
        {"name": "GRANDCHILD-1", "parent": "CHILD-1", "is_group": 0},
    ]
    
    for data in grandchildren:
        create_node("Account", data)
    
    frappe.db.commit()  # Commit после уровня

def create_node(doctype, data):
    """Вспомогательная функция создания узла"""
    if not frappe.db.exists(doctype, data["name"]):
        # Определить поле родителя (соответствует логике nestedset.py)
        parent_field = f"parent_{frappe.scrub(doctype)}"
        # frappe.scrub() преобразует "Item Group" -> "item_group"
        
        doc = frappe.get_doc({
            "doctype": doctype,
            "name": data["name"],
            parent_field: data.get("parent") or "",  # Пустая строка для корня
            "is_group": data.get("is_group", 0)
        })
        doc.insert(ignore_permissions=True)
        print(f"✅ Created: {doc.name}")
```

**Запуск:**
```bash
bench --site localhost execute your_app.scripts.tree.create_tree_nodes
```

**Примечание:** При массовом создании узлов можно установить флаги для ускорения:
```python
# В начале скрипта для импорта данных:
frappe.flags.in_import = True  # Пропустить некоторые проверки
frappe.db.auto_commit_on_many_writes = True  # Автоматический commit

# Ваш код создания узлов...

# В конце:
frappe.flags.in_import = False
```

### 6.3 Правильное удаление иерархии

```python
import frappe

def delete_tree_nodes(doctype):
    """
    Удалить все узлы дерева в правильном порядке (листья → корни)
    
    Args:
        doctype: str - Имя Tree DocType (например, "Account")
    """
    # Получить все записи, отсортированные по rgt DESC
    # rgt (right boundary) больше у листьев, меньше у корней
    records = frappe.db.sql(f"""
        SELECT name, lft, rgt
        FROM `tab{doctype}`
        ORDER BY rgt DESC
    """, as_dict=True)
    
    print(f"Found {len(records)} records to delete")
    
    deleted = 0
    for record in records:
        try:
            frappe.delete_doc(
                doctype, 
                record.name, 
                force=1,  # Игнорировать проверки
                ignore_permissions=True
            )
            deleted += 1
            
            if deleted % 10 == 0:
                print(f"Deleted: {deleted}/{len(records)}")
                
        except Exception as e:
            print(f"❌ Error deleting {record.name}: {str(e)}")
    
    # Commit в конце (не после каждой записи!)
    frappe.db.commit()
    print(f"\n✅ Deleted {deleted} records")
```

**Запуск:**
```bash
bench --site localhost execute \
  your_app.scripts.tree.delete_tree_nodes \
  --args '["Account"]'
```

### 6.4 Rebuild Tree (восстановление lft/rgt)

```python
import frappe
from frappe.utils.nestedset import rebuild_tree

def rebuild_account_tree():
    """
    Перестроить дерево Account (пересчитать lft/rgt)
    Используется когда lft/rgt стали некорректными
    """
    # С версии v15+ параметр parent_field игнорируется
    # Поле определяется автоматически из мета-информации DocType
    rebuild_tree("Account")
    frappe.db.commit()
    print("✅ Tree rebuilt successfully")
```

**ВАЖНО (с версии v15+):**
- Второй параметр `parent_field` теперь **игнорируется** и будет удален в v16+
- Поле родителя определяется автоматически из `meta.nsm_parent_field` или по правилу `parent_{scrubbed_doctype}`
- Функция требует права "System Manager" при вызове через клиентскую сторону

**Когда использовать:**
- После ручного изменения данных в БД
- После импорта из внешних систем
- При ошибках типа "Invalid lft/rgt values"

---

## 7. Дополнительные утилиты и методы Frappe

### 7.1 Управление пользователями и правами

#### 7.1.1 frappe.set_user()

**Описание:**  
Установить текущего пользователя для выполнения операций.

```python
# Переключиться на Administrator:
>>> frappe.set_user("Administrator")

# Теперь все операции выполняются от имени Administrator
>>> doc = frappe.get_doc({'doctype': 'User', 'email': 'test@example.com'})
>>> doc.insert()  # ✅ С правами администратора
```

**Когда использовать:**
- Когда нужны права администратора
- При выполнении системных операций
- В bench console (по умолчанию уже Administrator)

---

#### 7.1.2 frappe.session.user

**Описание:**  
Получить текущего пользователя.

```python
>>> print(frappe.session.user)
'Administrator'
```

---

#### 7.1.3 frappe.has_permission()

**Описание:**  
Проверить наличие прав у пользователя.

```python
# Проверить права на DocType:
>>> frappe.has_permission('User', 'write', user='john@example.com')
True

# Проверить права на конкретный документ:
>>> frappe.has_permission('Task', ptype='write', doc='TASK00002')
```

---

### 7.2 Работа с датами и временем

#### 7.2.1 frappe.utils.now()

```python
>>> from frappe.utils import now
>>> print(now())  # '2025-11-25 14:30:00'
```

#### 7.2.2 frappe.utils.today()

```python
>>> from frappe.utils import today
>>> print(today())  # '2025-11-25'
```

#### 7.2.3 frappe.utils.add_days()

```python
>>> from frappe.utils import add_days, today
>>> tomorrow = add_days(today(), 1)
>>> week_ago = add_days(today(), -7)
```

#### 7.2.4 frappe.utils.getdate()

```python
>>> from frappe.utils import getdate
>>> date = getdate('2025-11-25')  # datetime.date объект
```

---

### 7.3 Логирование и отладка

#### 7.3.1 frappe.log_error()

**Описание:**  
Записать ошибку в Error Log.

```python
try:
    risky_operation()
except Exception as e:
    frappe.log_error(
        title="Risky Operation Failed",
        message=frappe.get_traceback()
    )
```

---

#### 7.3.2 frappe.get_traceback()

**Описание:**  
Получить полный traceback текущего исключения.

```python
try:
    1 / 0
except:
    error_trace = frappe.get_traceback()
    print(error_trace)
```

---

#### 7.3.3 frappe.errprint() / frappe.msgprint()

```python
# Вывод в консоль (для отладки):
>>> frappe.errprint("Debug message")

# Показать сообщение пользователю (в UI):
>>> frappe.msgprint("Operation completed successfully")
```

---

### 7.4 Работа с настройками

#### 7.4.1 frappe.db.get_default()

**Описание:**  
Получить значение по умолчанию.

```python
>>> frappe.db.get_default("currency")
'USD'

>>> frappe.db.get_default("language")
'en'
```

---

#### 7.4.2 frappe.db.set_default()

**Описание:**  
Установить значение по умолчанию.

```python
>>> frappe.db.set_default("currency", "EUR")
```

---

### 7.5 Кэширование

#### 7.5.1 frappe.cache()

**Описание:**  
Работа с Redis кэшем.

```python
# Установить значение:
>>> frappe.cache().set_value("my_key", "my_value")

# Получить значение:
>>> value = frappe.cache().get_value("my_key")

# Удалить значение:
>>> frappe.cache().delete_value("my_key")

# Установить с TTL (время жизни):
>>> frappe.cache().setex("temp_key", "value", 300)  # 300 секунд
```

---

### 7.6 Enqueue (фоновые задачи)

#### 7.6.1 frappe.enqueue()

**Описание:**  
Запустить функцию в фоновом режиме.

```python
# Простой вызов:
>>> frappe.enqueue('myapp.tasks.send_emails')

# С аргументами:
>>> frappe.enqueue(
...     'myapp.tasks.process_data',
...     queue='long',
...     timeout=3600,
...     data={'items': [1, 2, 3]}
... )
```

**Очереди:**
- `short` — быстрые задачи (по умолчанию)
- `default` — обычные задачи
- `long` — долгие задачи

---

### 7.7 Публикация событий (Realtime)

#### 7.7.1 frappe.publish_realtime()

**Описание:**  
Отправить событие в браузер через WebSocket.

```python
# Отправить всем:
>>> frappe.publish_realtime('custom_event', {'message': 'Hello'})

# Отправить конкретному пользователю:
>>> frappe.publish_realtime(
...     'notification',
...     {'message': 'Task completed'},
...     user='john@example.com'
... )
```

---

### 7.8 Работа с файлами

#### 7.8.1 frappe.get_doc() для файлов

```python
# Создать файл:
>>> file_doc = frappe.get_doc({
...     'doctype': 'File',
...     'file_name': 'test.txt',
...     'content': 'Hello World',
...     'is_private': 1
... })
>>> file_doc.save()
```

---

### 7.9 Транслитерация и utils

#### 7.9.1 frappe.scrub()

**Описание:**  
Преобразовать строку в snake_case.

```python
>>> frappe.scrub("My Custom Field")
'my_custom_field'
```

#### 7.9.2 frappe.unscrub()

**Описание:**  
Преобразовать snake_case в Title Case.

```python
>>> frappe.unscrub("my_custom_field")
'My Custom Field'
```

---

### 7.10 Работа с JSON

#### 7.10.1 frappe.as_json()

```python
>>> data = {'name': 'Test', 'value': 123}
>>> json_str = frappe.as_json(data)
>>> print(json_str)  # '{"name": "Test", "value": 123}'
```

#### 7.10.2 frappe.parse_json()

```python
>>> json_str = '{"name": "Test"}'
>>> data = frappe.parse_json(json_str)
>>> print(data['name'])  # 'Test'
```

---

## 8. Лучшие практики и чек-листы

### 8.1 Чек-лист перед выполнением скрипта

**Перед импортом данных:**
- [ ] Проверить тип DocType (обычный или Tree)
- [ ] Если Tree: Проверить порядок (родители ПЕРЕД детьми)
- [ ] Сделать backup базы данных
- [ ] Проверить права доступа текущего пользователя
- [ ] Проверить наличие обязательных полей

**Во время выполнения:**
- [ ] Логировать прогресс (print или logger)
- [ ] Обрабатывать ошибки (try/except)
- [ ] Делать commit регулярно (не только в конце)
- [ ] Использовать `ignore_permissions=True` где нужно

**После выполнения:**
- [ ] Проверить количество созданных записей
- [ ] Проверить данные в UI
- [ ] Проверить Error Log на наличие ошибок
- [ ] Экспортировать fixtures (если нужно)

### 8.2 Шаблон универсального скрипта

```python
import frappe
import traceback

def universal_import(doctype, data_source):
    """
    Универсальный шаблон импорта данных
    
    Args:
        doctype: str - Имя DocType
        data_source: list - Список словарей с данными
    """
    print(f"Starting import for {doctype}...")
    print(f"Total records: {len(data_source)}")
    
    stats = {"success": 0, "skipped": 0, "errors": 0}
    
    for idx, item in enumerate(data_source, 1):
        try:
            # Проверить существование
            if frappe.db.exists(doctype, item.get("name")):
                print(f"  [{idx}/{len(data_source)}] Skipped: {item.get('name')} (already exists)")
                stats["skipped"] += 1
                continue
            
            # Создать документ
            doc = frappe.get_doc({
                "doctype": doctype,
                **item
            })
            doc.insert(ignore_permissions=True)
            
            stats["success"] += 1
            print(f"  [{idx}/{len(data_source)}] Created: {doc.name}")
            
            # Commit каждые 10 записей
            if stats["success"] % 10 == 0:
                frappe.db.commit()
                
        except Exception as e:
            stats["errors"] += 1
            error_msg = f"Error creating {item.get('name')}: {str(e)}"
            print(f"  [{idx}/{len(data_source)}] ❌ {error_msg}")
            
            # Логировать в Error Log
            frappe.log_error(
                title=f"{doctype} Import Error",
                message=f"{error_msg}\n\n{traceback.format_exc()}"
            )
            
            # Rollback при ошибке
            frappe.db.rollback()
    
    # Финальный commit
    frappe.db.commit()
    
    # Вывести статистику
    print("\n" + "="*50)
    print(f"Import completed for {doctype}")
    print(f"✅ Success: {stats['success']}")
    print(f"⚠️  Skipped: {stats['skipped']}")
    print(f"❌ Errors: {stats['errors']}")
    print("="*50)
```

### 8.3 ORM vs SQL: Когда что использовать

| Операция | Используйте ORM | Используйте SQL |
|----------|----------------|----------------|
| Создание документа | ✅ `frappe.get_doc().insert()` | ❌ |
| Обновление документа | ✅ `doc.save()` | ⚠️ Только для простых полей |
| Удаление документа | ✅ `frappe.delete_doc()` | ❌ |
| Массовое чтение | ⚠️ Медленно для больших объемов | ✅ `frappe.db.sql()` |
| Агрегация (COUNT, SUM) | ❌ | ✅ `frappe.db.sql()` |
| Проверка существования | ✅ `frappe.db.exists()` | ✅ Оба подходят |

**Пример ORM (рекомендуется для документов):**
```python
# Создание с валидацией и хуками
doc = frappe.get_doc({"doctype": "User", "email": "test@example.com"})
doc.insert()  # ← Запускает валидацию, before_insert, after_insert
```

**Пример SQL (для производительности):**
```python
# Массовое чтение без ORM overhead
users = frappe.db.sql("""
    SELECT name, email, enabled
    FROM `tabUser`
    WHERE enabled = 1
""", as_dict=True)
```

---

## 9. Примеры реальных сценариев

### 9.1 Импорт Folder Structure Templates (Tree DocType)

```python
import frappe
import json

def import_fst_from_json(json_file_path):
    """
    Импортировать FST из JSON в правильном порядке
    
    Args:
        json_file_path: str - Путь к JSON файлу
    """
    # Загрузить данные
    with open(json_file_path, 'r') as f:
        data = json.load(f)
    
    print(f"Loaded {len(data)} FST records")
    
    # Группировать по уровням (level_0, level_1, ...)
    levels = {}
    for record in data:
        level = determine_level(record)
        if level not in levels:
            levels[level] = []
        levels[level].append(record)
    
    # Создавать по уровням
    for level in sorted(levels.keys()):
        print(f"\nProcessing Level {level} ({len(levels[level])} records)...")
        
        for record in levels[level]:
            create_fst(record)
        
        # Commit после каждого уровня
        frappe.db.commit()
        print(f"✅ Level {level} completed")

def determine_level(record):
    """Определить уровень вложенности"""
    parent = record.get("parent_folder_structure_template")
    if not parent:
        return 0
    
    # Подсчитать уровень по количеству родителей
    level = 1
    current_parent = parent
    
    while current_parent:
        parent_doc = frappe.get_doc("Folder Structure Template", current_parent)
        current_parent = parent_doc.parent_folder_structure_template
        level += 1
    
    return level

def create_fst(data):
    """Создать один FST"""
    if not frappe.db.exists("Folder Structure Template", data["name"]):
        doc = frappe.get_doc({
            "doctype": "Folder Structure Template",
            **data
        })
        doc.insert(ignore_permissions=True)
        print(f"  Created: {doc.name}")
```

### 9.2 Очистка и пересоздание данных

```python
import frappe

def cleanup_and_recreate(doctype, json_data):
    """
    Полная очистка и пересоздание данных
    
    Args:
        doctype: str - Имя DocType
        json_data: list - Новые данные
    """
    print(f"Step 1: Deleting all {doctype} records...")
    
    # Если Tree DocType - удалять по rgt DESC
    is_tree = frappe.db.get_value("DocType", doctype, "is_tree")
    
    if is_tree:
        records = frappe.db.sql(f"""
            SELECT name FROM `tab{doctype}`
            ORDER BY rgt DESC
        """, as_dict=True)
    else:
        records = frappe.get_all(doctype, fields=["name"])
    
    for record in records:
        frappe.delete_doc(doctype, record.name, force=1, ignore_permissions=True)
    
    frappe.db.commit()
    print(f"✅ Deleted {len(records)} records")
    
    print(f"\nStep 2: Creating {len(json_data)} new records...")
    
    for item in json_data:
        doc = frappe.get_doc({
            "doctype": doctype,
            **item
        })
        doc.insert(ignore_permissions=True)
    
    frappe.db.commit()
    print(f"✅ Created {len(json_data)} records")
```

### 9.3 Валидация данных перед импортом

```python
import frappe

def validate_before_import(doctype, data):
    """
    Проверить данные перед импортом
    
    Returns:
        tuple: (is_valid, errors)
    """
    errors = []
    
    # Проверка 1: Обязательные поля
    required_fields = get_required_fields(doctype)
    
    for idx, record in enumerate(data):
        for field in required_fields:
            if not record.get(field):
                errors.append(f"Record {idx+1}: Missing required field '{field}'")
    
    # Проверка 2: Для Tree DocType - порядок родителей
    is_tree = frappe.db.get_value("DocType", doctype, "is_tree")
    
    if is_tree:
        created = set()
        parent_field = f"parent_{doctype.lower().replace(' ', '_')}"
        
        for idx, record in enumerate(data):
            name = record.get("name")
            parent = record.get(parent_field)
            
            if parent and parent not in created:
                errors.append(
                    f"Record {idx+1} ({name}): "
                    f"Parent '{parent}' not created yet. Wrong order!"
                )
            
            created.add(name)
    
    is_valid = len(errors) == 0
    return is_valid, errors

def get_required_fields(doctype):
    """Получить список обязательных полей DocType"""
    fields = frappe.get_meta(doctype).fields
    return [f.fieldname for f in fields if f.reqd]
```

---

## 10. Модель транзакций Frappe

### 10.1 Автоматические commit и rollback

Frappe реализует умную модель транзакций, поэтому в большинстве случаев ручной commit НЕ нужен.

#### 10.1.1 Web запросы

**POST / PUT запросы:**
- ✅ Автоматический `commit()` после успешного завершения
- ✅ Автоматический `rollback()` при любом исключении
- ⚠️ AJAX вызовы через `frappe.call` используют POST по умолчанию

**GET запросы:**
- ❌ НЕ делают автоматический commit
- Только чтение данных

**Пример:**
```python
# В whitelisted методе:
@frappe.whitelist()
def create_task(title):
    doc = frappe.get_doc({'doctype': 'Task', 'title': title})
    doc.insert()
    # НЕ НУЖНО: frappe.db.commit()
    # Frappe сделает commit автоматически
    return doc.name
```

---

#### 10.1.2 Фоновые задачи (Background Jobs)

**Запуск через frappe.enqueue():**
- ✅ Автоматический `commit()` после успешного завершения
- ✅ Автоматический `rollback()` при исключении

**Пример:**
```python
def background_task(items):
    for item in items:
        doc = frappe.get_doc({'doctype': 'Item', **item})
        doc.insert()
    # НЕ НУЖНО: frappe.db.commit()
    # Автоматический commit после завершения
```

---

#### 10.1.3 Scheduled Jobs (Cron задачи)

**Запуск по расписанию:**
- ✅ Автоматический `commit()` после успешного завершения
- ✅ Автоматический `rollback()` при исключении

---

#### 10.1.4 Patches (миграции)

**Выполнение патчей:**
- ✅ Автоматический `commit()` после успешного `execute()`
- ✅ Автоматический `rollback()` при исключении

---

#### 10.1.5 Unit Tests

**Во время тестов:**
- Commit после завершения тестового модуля (файла)
- Commit после завершения всех тестов
- Выход при исключении (без commit)

---

### 10.2 Когда нужен ручной commit

**Обязательно делайте ручной commit в:**

1. **bench console:**
```python
>>> doc.insert()
>>> frappe.db.commit()  # ✅ ОБЯЗАТЕЛЬНО
```

2. **bench execute скриптах:**
```python
def my_script():
    doc.insert()
    frappe.db.commit()  # ✅ ОБЯЗАТЕЛЬНО
```

3. **Standalone Python скриптах:**
```python
import frappe
frappe.init(site='localhost')
frappe.connect()

doc.insert()
frappe.db.commit()  # ✅ ОБЯЗАТЕЛЬНО
```

4. **Промежуточные commit для длительных операций:**
```python
for i in range(1000):
    doc = frappe.get_doc({...})
    doc.insert()
    
    if i % 100 == 0:
        frappe.db.commit()  # Сохранить каждые 100 записей
```

---

### 10.3 Обработка исключений и транзакции

**ВАЖНО:** Если вы перехватываете исключения, вы отвечаете за rollback!

```python
# ❌ НЕПРАВИЛЬНО:
try:
    doc.insert()
except Exception as e:
    print(f"Error: {e}")
    # Frappe не знает об ошибке!
    # Транзакция может быть закоммичена!

# ✅ ПРАВИЛЬНО:
try:
    doc.insert()
    frappe.db.commit()
except Exception as e:
    frappe.db.rollback()  # Явный rollback
    print(f"Error: {e}")
    raise  # Re-raise для логирования
```

---

### 10.4 Savepoints для частичного отката

**Использование savepoints:**

```python
# Создать 100 записей, откатить только проблемные
for i in range(100):
    savepoint_name = f"record_{i}"
    frappe.db.savepoint(savepoint_name)
    
    try:
        doc = frappe.get_doc({'doctype': 'Item', 'name': f'ITEM-{i}'})
        doc.insert()
    except Exception as e:
        # Откатить только эту запись
        frappe.db.rollback(save_point=savepoint_name)
        print(f"Failed: {i}")

# Финальный commit всех успешных записей
frappe.db.commit()
```

**ВНИМАНИЕ:** Rollback к savepoint НЕ откатывает:
- Изменения файлов
- Отправленные email
- Внешние API вызовы

---

### 10.5 Transaction Hooks — продвинутое использование

**Синхронизация файлов с транзакциями:**

```python
class MyDocument(Document):
    def on_update(self):
        # Создать файл
        self.create_pdf_file()
        
        # Удалить файл при rollback
        frappe.db.after_rollback.add(self.cleanup_files)
    
    def create_pdf_file(self):
        # Генерация PDF
        file_path = f"/tmp/{self.name}.pdf"
        generate_pdf(file_path)
        self._temp_file = file_path
    
    def cleanup_files(self):
        # Удалить временный файл если rollback
        if hasattr(self, '_temp_file'):
            os.remove(self._temp_file)
```

**Отправка уведомлений только после commit:**

```python
def send_email_after_commit(doc):
    def send():
        frappe.sendmail(
            recipients=[doc.email],
            subject="Document Created",
            message=f"Document {doc.name} was created"
        )
    
    # Email отправится только если транзакция закоммичена
    frappe.db.after_commit.add(send)

# Использование:
doc = frappe.get_doc({'doctype': 'Task', 'title': 'New'})
doc.insert()
send_email_after_commit(doc)
frappe.db.commit()
```

---

## 11. Источники и ссылки

### 11.1 Официальная документация Frappe

**Основные источники:**
- **Frappe Commands Reference:**  
  https://docs.frappe.io/framework/user/en/bench/frappe-commands
  - `bench console` — интерактивная консоль (с опцией --autoreload)
  - `bench execute` — выполнение функций
  - Полный список site commands, scheduler commands, utility commands

- **Database API Reference:**  
  https://docs.frappe.io/framework/v15/user/en/api/database
  - `frappe.db.get_list()`, `get_all()`, `get_value()`
  - `frappe.db.set_value()`, `exists()`, `count()`
  - `frappe.db.sql()` — прямые SQL запросы
  - Transaction model и hooks

- **Document API Reference:**  
  https://docs.frappe.io/framework/v15/user/en/api/document
  - `frappe.get_doc()` — получение/создание документа
  - `doc.insert()`, `save()`, `delete()`, `reload()`
  - `doc.db_set()`, `append()`, методы для Tree DocTypes

- **NestedSet Implementation (v15):**  
  https://github.com/frappe/frappe/blob/version-15/frappe/utils/nestedset.py
  - Исходный код Tree DocType логики
  - Методы: `rebuild_tree()`, `validate_loop()`, `update_nsm()`
  - Правила именования полей: `parent_{scrubbed_doctype}` или `nsm_parent_field`

### 11.2 Специфика ERPNext v15

**Версия Frappe Framework:** v15.x  
**Версия ERPNext:** v15.x

**Ключевые изменения v15:**
- Параметр `parent_field` в `rebuild_tree()` игнорируется (будет удален в v16)
- Поддержка PostgreSQL наряду с MariaDB
- `frappe.db.multisql()` для кросс-СУБД запросов
- Улучшенная модель транзакций с hooks
- Transaction savepoints для частичного rollback
- Автоматическая очистка user permissions cache в Tree DocTypes

**Tree DocTypes в ERPNext v15:**
- Account (Accounts)
- Cost Center (Cost Centers)
- Item Group (Stock)
- Territory (Selling)
- Sales Person (Selling)
- Customer Group (Selling)
- Supplier Group (Buying)
- Department (HR)

### 11.3 Tree DocType документация

- **Frappe GitHub - NestedSet (v15):**  
  https://github.com/frappe/frappe/blob/version-15/frappe/utils/nestedset.py
  - Официальный исходный код с комментариями
  - Правила создания Tree DocTypes
  > "When importing tree data, ensure that parent nodes are created before their children"

- **Frappe GitHub Wiki:**  
  https://github.com/frappe/frappe/wiki
  - Community documentation и best practices

### 11.4 Сообщество и форумы

- **Frappe Forum:**  
  https://discuss.frappe.io/
  - Реальные кейсы и решения проблем

- **Stack Overflow - Frappe:**  
  https://stackoverflow.com/questions/tagged/frappe

---

## 📝 Заключение

### Ключевые выводы

1. **Используйте `bench execute` для автоматизации** — это самый надежный метод
2. **Используйте `bench console` для отладки** — интерактивная работа
3. **Всегда делайте `frappe.db.commit()`** — иначе изменения потеряются
4. **Для Tree DocTypes соблюдайте порядок** — родители ПЕРЕД детьми
5. **Обрабатывайте ошибки** — используйте try/except и логирование
6. **НЕ используйте heredoc с bench console** — это не работает

### Правило большого пальца

```python
# ✅ Для автоматизации (скрипты, импорт данных):
bench --site localhost execute module.function

# ✅ Для отладки и тестирования:
bench --site localhost console

# ❌ НИКОГДА не делайте:
bench --site localhost console << 'EOF'
# ... код ...
EOF
```

---

---

## 12. Работа в Docker окружении

### 12.1 Специфика Docker exec

**При работе через Docker контейнеры:**

```bash
# ✅ ПРАВИЛЬНО: bench console
docker exec -it backend bench --site localhost console

# ✅ ПРАВИЛЬНО: bench execute
docker exec backend bench --site localhost execute myapp.scripts.import_data.run

# ❌ НЕПРАВИЛЬНО: heredoc с console (не работает с IPython)
docker exec backend bench --site localhost console << 'EOF'
print("Hello")
EOF
```

### 12.2 Передача скриптов в Docker

**Метод 1: Создать файл в apps/**
```bash
# Скопировать скрипт в контейнер
docker cp my_script.py backend:/home/frappe/frappe-bench/apps/myapp/myapp/scripts/

# Выполнить
docker exec backend bench --site localhost execute myapp.scripts.my_script.main
```

**Метод 2: Использовать python -c (для коротких команд)**
```bash
# Короткие однострочные команды
docker exec backend bash -c "cd /home/frappe/frappe-bench && \
  bench --site localhost run python -c \
  'import frappe; frappe.init(\"localhost\"); frappe.connect(); \
   print(frappe.db.count(\"User\")); frappe.db.commit()'"
```

**Метод 3: Монтировать volume со скриптами**
```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - ./scripts:/home/frappe/scripts:ro
```

```bash
# Выполнить смонтированный скрипт
docker exec backend bash -c "cd /home/frappe/frappe-bench && \
  bench --site localhost run python /home/frappe/scripts/import.py"
```

### 12.3 Проверка окружения в Docker

```bash
# Проверить доступные sites
docker exec backend ls -la sites/

# Проверить установленные apps
docker exec backend bench --site localhost list-apps

# Проверить версии
docker exec backend bench version

# Войти в консоль для отладки
docker exec -it backend bash
cd /home/frappe/frappe-bench
bench --site localhost console
```

### 12.4 Типовые ошибки в Docker

**Ошибка 1: Permission denied**
```bash
# Решение: выполнить от правильного пользователя
docker exec -u frappe backend bench --site localhost console
```

**Ошибка 2: Site not found**
```bash
# Проверить имя site (может быть не localhost)
docker exec backend ls sites/
docker exec backend bench --site <correct_site_name> console
```

**Ошибка 3: Apps not found**
```bash
# Убедиться что app установлен
docker exec backend bench --site localhost list-apps

# Установить app если нужно
docker exec backend bench --site localhost install-app <app_name>
```

---

**Документ создан:** 2025-11-25  
**Версия:** 1.1  
**Применимо к:** Frappe Framework v15.x / ERPNext v15.x  
**Docker:** Совместимо с frappe/erpnext:v15  
**Сохранить как:** `docs/guides/PYTHON_INTERACTIVE_GUIDE.md`
