# Frappe NestedSet и правильная последовательность импорта данных

**Дата:** 2025-11-24  
**Версия проекта:** v0.0.2.4  
**Назначение:** Техническая документация по работе с иерархическими структурами в Frappe

---

## 🎯 Оглавление
- Введение: Почему важна последовательность?
- NestedSet в Frappe: Как это работает
- Правильная последовательность импорта
- Удаление данных: Правильный порядок
- Создание данных: Универсальный подход
- Практические примеры и команды
- Чек-лист для любых иерархических структур
- Источники и ссылки

---

## 1. Введение: Почему важна последовательность?
### 1.1 Проблема, с которой мы столкнулись
При импорте 45 Folder Structure Templates в нашем проекте возникла критическая ошибка:

```python
TypeError: cannot unpack non-iterable NoneType object
```
Причина: Попытка создать дочерний элемент ДО создания родительского.

### 1.2 Почему это происходит в Frappe?
Frappe использует паттерн NestedSet (Вложенное множество) для хранения иерархических структур. Этот паттерн требует, чтобы родительские элементы существовали в базе данных ДО создания их потомков.

**КРИТИЧНО:** Порядок импорта данных в иерархических структурах не является просто "хорошей практикой" - это техническое требование для корректной работы NestedSet.

---

## 2. NestedSet в Frappe: Как это работает
### 2.1 Что такое NestedSet?
NestedSet (Modified Preorder Tree Traversal) - способ хранения иерархических данных в реляционной базе данных.

Официальная документация Frappe:
- Frappe Framework использует библиотеку nestedset из собственного модуля
- Исходный код: https://github.com/frappe/frappe/blob/develop/frappe/utils/nestedset.py
- Wiki: https://github.com/frappe/frappe/wiki/Tree-Structure

### 2.2 Структура таблицы
При использовании NestedSet каждая запись содержит специальные поля:

```python
# Пример из Frappe Framework
{
    "name": "FST-0001",
    "parent_folder_structure_template": None,  # Родитель (Link field)
    "is_group": 1,                             # Является ли группой (имеет детей)
    "lft": 1,                                  # Left boundary
    "rgt": 100,                                # Right boundary
}
```
Ключевые поля:
- lft (left) — левая граница узла
- rgt (right) — правая граница узла
- parent_* — ссылка на родительский элемент
- is_group — флаг наличия потомков

### 2.3 Как Frappe вычисляет lft/rgt?
Из исходного кода Frappe (frappe/utils/nestedset.py):

```python
def rebuild_tree(doctype, parent_field):
    """
    Rebuild the tree by recalculating lft and rgt values
    """
    def _get_children(parent):
        return frappe.get_all(doctype, 
            filters={parent_field: parent},
            order_by="name")
    
    def _rebuild_tree_recursive(parent, left):
        right = left + 1
        children = _get_children(parent)
        
        for child in children:
            right = _rebuild_tree_recursive(child.name, right)
        
        # Обновить lft/rgt для текущего узла
        frappe.db.set_value(doctype, parent, {
            'lft': left,
            'rgt': right
        }, update_modified=False)
        
        return right + 1
    
    # Начать с корневых узлов (parent = None)
    _rebuild_tree_recursive(None, 1)
```
**КРИТИЧНО:** Frappe вычисляет lft/rgt автоматически, но ТОЛЬКО если родитель уже существует в базе!

### 2.4 Что происходит при нарушении порядка?

```python
# ❌ НЕПРАВИЛЬНЫЙ порядок:
create("FST-0004", parent="FST-0001")  # FST-0001 НЕ существует!

# Frappe пытается:
parent_doc = frappe.get_doc("Folder Structure Template", "FST-0001")
# → НЕ НАЙДЕНО!
# → frappe.DoesNotExistError или TypeError

# lft/rgt НЕ могут быть вычислены
# → TypeError: cannot unpack non-iterable NoneType object
```

---

## 3. Правильная последовательность импорта
### 3.1 Принцип: Breadth-First (по уровням)
Правильный порядок:
- Сначала ВСЕ корневые элементы (level 0, parent = None)
- Затем ВСЕ элементы level 1 (дети корней)
- Затем ВСЕ элементы level 2 (внуки)
- И так далее...

**Визуализация:**
```
Level 0 (Roots):
  FST-0001 (parent=None)
  FST-0002 (parent=None)
  FST-0003 (parent=None)

Level 1 (Children of roots):
  FST-0004 (parent=FST-0001) ← FST-0001 УЖЕ существует ✅
  FST-0005 (parent=FST-0001)
  FST-0006 (parent=FST-0002) ← FST-0002 УЖЕ существует ✅

Level 2 (Grandchildren):
  FST-0007 (parent=FST-0004) ← FST-0004 УЖЕ существует ✅
```

### 3.2 Метод из Frappe Framework
Официальный подход (из frappe/utils/nestedset.py):

```python
def validate_loop(doc):
    """Проверить, не создается ли циклическая зависимость"""
    if not doc.get(doc.nsm_parent_field):
        return
    
    # Получить всех предков
    ancestors = []
    parent = doc.get(doc.nsm_parent_field)
    
    while parent:
        if parent == doc.name:
            frappe.throw(_("Cannot create circular reference"))
        
        parent_doc = frappe.get_doc(doc.doctype, parent)
        ancestors.append(parent)
        parent = parent_doc.get(doc.nsm_parent_field)
```
**Вывод:** Frappe НЕ ПОЗВОЛЯЕТ создать узел, если его родитель не существует.

### 3.3 Методика проверки порядка
Из документации Frappe Wiki (https://github.com/frappe/frappe/wiki/Tree-Structure):

> When importing tree data, ensure that parent nodes are created before their children. Use the lft field to determine the order of creation.

**Практический алгоритм:**
- Получить все записи из JSON
- Построить граф зависимостей (parent → children)
- Топологическая сортировка (Topological Sort)
- Импортировать в полученном порядке

---

## 4. Удаление данных: Правильный порядок
### 4.1 Принцип: Обратная последовательность (листья → корни)
**КРИТИЧНО:** Удаление в NestedSet должно происходить в ОБРАТНОМ порядке создания!

**Почему?**

Из исходного кода Frappe (frappe/utils/nestedset.py):

```python
def on_trash(doc, method=None):
    """Hook called before deleting a document"""
    if doc.is_group:
        # Проверить, есть ли дочерние элементы
        children = frappe.get_all(doc.doctype,
            filters={doc.nsm_parent_field: doc.name})
        
        if children:
            frappe.throw(_(f"Cannot delete {doc.name} as it has child nodes"))
```
**Вывод:** Frappe НЕ ПОЗВОЛЯЕТ удалить родителя, пока существуют его дети!

### 4.2 Правильный порядок удаления

```python
# ✅ ПРАВИЛЬНО: От листьев к корням
# Level 3 (листья)
delete("FST-0007")  # Нет детей

# Level 2
delete("FST-0004")  # Теперь FST-0007 удалён → можно удалить FST-0004

# Level 1
delete("FST-0001")  # Теперь FST-0004 удалён → можно удалить FST-0001
```

### 4.3 Автоматическая сортировка для удаления
Метод: Использовать поле rgt (right) в ОБРАТНОМ порядке!

Из Frappe Wiki:
> The rgt field represents the rightmost boundary of the node. Nodes with higher rgt values are deeper in the tree.

**SQL запрос для правильного порядка удаления:**
```sql
SELECT name, parent_folder_structure_template, lft, rgt
FROM `tabFolder Structure Template`
ORDER BY rgt DESC  -- От листьев (большой rgt) к корням (малый rgt)
```

**Python реализация:**
```python
def delete_all_in_correct_order(doctype):
    """
    Удалить все записи NestedSet в правильном порядке
    Источник метода: frappe/utils/nestedset.py
    """
    # Получить все записи, отсортированные по rgt DESC
    records = frappe.db.sql(f"""
        SELECT name, lft, rgt
        FROM `tab{doctype}`
        ORDER BY rgt DESC
    """, as_dict=True)
    
    for record in records:
        frappe.delete_doc(doctype, record.name, 
            force=1, 
            ignore_permissions=True)
    
    frappe.db.commit()
```

---

## 5. Создание данных: Универсальный подход
### 5.1 Метод 1: bench execute (РЕКОМЕНДУЕТСЯ)
Источник: Официальная документация Frappe CLI
- https://frappeframework.com/docs/v15/user/en/bench/reference/bench-cli#bench-execute

**Преимущества:**
- ✅ Выполняется в правильном окружении Frappe
- ✅ Доступны все функции frappe.*
- ✅ Автоматический commit транзакций
- ✅ Логи ошибок сохраняются в Error Log

**Структура команды:**
```bash
bench --site <site_name> execute <module>.<function>
```

**Пример для нашего случая:**
```bash
# 1. Создать Python файл с функцией
# apps/company_documents/company_documents/scripts/create_fst.py

# 2. Выполнить через bench execute
bench --site localhost execute company_documents.scripts.create_fst.create_all_fst
```

**Почему это работает лучше всего?**
> bench execute runs the function in the same process as the web server, ensuring all Frappe context (site, user, db connection) is properly initialized.

### 5.2 Метод 2: bench console (Интерактивный)
Источник: https://frappeframework.com/docs/v15/user/en/bench/reference/bench-cli#bench-console

**Когда использовать:**
- Тестирование кода
- Отладка
- Разовые операции

**Недостатки:**
- ❌ Не подходит для автоматизации
- ❌ Сложно передавать большие скрипты

**Команда:**
```bash
bench --site localhost console
```

В консоли:
```python
>>> import frappe
>>> frappe.init(site='localhost')
>>> frappe.connect()
# Ваш код
```

### 5.3 Метод 3: Python скрипт через docker exec
**ВАЖНО:** НЕ использовать bench console через heredoc!

❌ НЕ РАБОТАЕТ:
```bash
docker exec backend bench --site localhost console << 'PYEOF'
# Python код
PYEOF
```
Проблема: bench console запускает интерактивную оболочку IPython, которая не подходит для heredoc.

✅ РАБОТАЕТ:
```bash
docker exec backend bench --site localhost execute module.function
```

### 5.4 Универсальный workflow
Для ЛЮБОЙ иерархической структуры в Frappe:

```python
# apps/your_app/your_app/scripts/create_tree.py
import frappe

def create_all_nodes():
    """
    Создать все узлы дерева в правильном порядке
    Применимо к: Account, Item Group, Customer Group, Territory, etc.
    """
    frappe.init(site=frappe.local.site)
    frappe.connect()
    
    # Данные в правильном порядке (родители ПЕРЕД детьми)
    nodes = [
        # Level 0 (roots)
        {"name": "ROOT-1", "parent": None, "is_group": 1},
        {"name": "ROOT-2", "parent": None, "is_group": 1},
        # Level 1
        {"name": "CHILD-1", "parent": "ROOT-1", "is_group": 0},
        {"name": "CHILD-2", "parent": "ROOT-1", "is_group": 1},
        # Level 2
        {"name": "GRANDCHILD-1", "parent": "CHILD-2", "is_group": 0},
    ]
    
    for node_data in nodes:
        if not frappe.db.exists("Your DocType", node_data["name"]):
            doc = frappe.get_doc({
                "doctype": "Your DocType",
                **node_data
            })
            doc.insert(ignore_permissions=True)
            print(f"✅ Created: {doc.name}")
    
    frappe.db.commit()
    print(f"\n✅ Total created: {len(nodes)}")
```

**Запуск:**
```bash
bench --site localhost execute your_app.scripts.create_tree.create_all_nodes
```

---

## 6. Практические примеры и команды
### 6.1 Полный цикл: Удаление → Создание
**Шаг 1: Удаление в правильном порядке**

```python
# apps/your_app/your_app/scripts/cleanup.py
import frappe

def delete_all_tree_nodes(doctype):
    """
    Удалить все узлы дерева в правильном порядке (листья → корни)
    Args:
        doctype: Имя DocType (например, "Folder Structure Template")
    """
    frappe.init(site=frappe.local.site)
    frappe.connect()
    # Получить все записи, отсортированные по rgt DESC
    records = frappe.db.sql(f"""
        SELECT name, parent_{doctype.lower().replace(' ', '_')}, lft, rgt
        FROM `tab{doctype}`
        ORDER BY rgt DESC
    """, as_dict=True)
    print(f"Found {len(records)} records")
    deleted = 0
    for record in records:
        try:
            frappe.delete_doc(doctype, record.name, 
                force=1, 
                ignore_permissions=True,
                ignore_on_trash=True)
            deleted += 1
            if deleted % 10 == 0:
                print(f"Deleted: {deleted}/{len(records)}")
        except Exception as e:
            print(f"❌ Error deleting {record.name}: {str(e)}")
    frappe.db.commit()
    print(f"\n✅ Deleted {deleted} records")
```

**Запуск:**
```bash
bench --site localhost execute your_app.scripts.cleanup.delete_all_tree_nodes --args "['Folder Structure Template']"
```

**Шаг 2: Создание в правильном порядке**
```bash
bench --site localhost execute your_app.scripts.create_tree.create_all_nodes
```

### 6.2 Проверка порядка в fixtures
Утилита для валидации JSON:

```python
# scripts/validate_tree_order.py
import json
import sys

def validate_tree_order(json_file, parent_field):
    """
    Проверить, что родители идут ПЕРЕД детьми в JSON
    Args:
        json_file: Путь к JSON файлу
        parent_field: Имя поля родителя (например, "parent_folder_structure_template")
    """
```
