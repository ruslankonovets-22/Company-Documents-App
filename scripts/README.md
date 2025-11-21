# 🛠️ Utility Scripts

Этот каталог содержит утилиты для разработки и поддержки Company Documents App.

---

## 📋 Доступные скрипты

### 1. **validate_fst_order.py** - Проверка порядка Folder Structure Template

**Что делает:**
- Проверяет, что родительские элементы идут ПЕРЕД дочерними в `folder_structure_template.json`
- Критично для успешного импорта fixtures через Frappe NestedSet

**Использование:**
```bash
# Проверить порядок
python3 scripts/validate_fst_order.py

# Выход:
# 0 - порядок правильный
# 1 - найдены ошибки
```

**Пример вывода:**
```
✅ VALIDATION PASSED: All 45 records are in correct order!

Order verification:
  - Root elements: 3
  - Child elements: 42

  ✓ FST-0001: Progettazione
  ✓ FST-0002: Realizzazione
  ✓ FST-0003: Amministrativi
```

---

### 2. **fix_fst_order.py** - Автоматическое исправление порядка

**Что делает:**
- Читает `folder_structure_template.json`
- Переупорядочивает: сначала root, затем children рекурсивно
- Создаёт backup (.bak) перед изменением
- Записывает исправленный файл

**Использование:**
```bash
# Исправить порядок автоматически
python3 scripts/fix_fst_order.py
```

**Пример вывода:**
```
📂 Reading: company_documents/fixtures/folder_structure_template.json
📊 Total records: 45
   - Root elements: 3
   - Child elements: 42
💾 Backup created: folder_structure_template.20251122_143052.bak
✅ FIXED: Reordered 45 records

New order:
  1. FST-0001: Progettazione (parent: (root))
  2. FST-0004: Preliminare (parent: FST-0001)
  3. FST-0015: Relazione Fase (parent: FST-0004)
  ... and 42 more

🎉 Done! Run validation to confirm:
    python scripts/validate_fst_order.py
```

---

### 3. **pre-commit-hook.sh** - Git hook для автоматической проверки

**Что делает:**
- Запускается **АВТОМАТИЧЕСКИ** перед каждым коммитом
- Проверяет порядок FST, если файл был изменён
- **БЛОКИРУЕТ** коммит, если порядок неправильный

**Установка:**
```bash
# Автоматическая установка
bash scripts/install-hooks.sh

# ИЛИ вручную
chmod +x scripts/pre-commit-hook.sh
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
```

**Как работает:**
```bash
git add company_documents/fixtures/folder_structure_template.json
git commit -m "Update FST"

# Если порядок ПРАВИЛЬНЫЙ:
🔍 Checking Folder Structure Template order...
📝 FST file modified, validating order...
✅ Validation passed!
[main abc1234] Update FST

# Если порядок НЕПРАВИЛЬНЫЙ:
🔍 Checking Folder Structure Template order...
📝 FST file modified, validating order...
❌ VALIDATION FAILED: Found 1 order violations!

  ERROR at index 0 (~line 2):
    Child:  FST-0005
    Parent: FST-0001 (NOT CREATED YET!)
    → Parent FST-0001 must appear BEFORE child FST-0005

❌ COMMIT BLOCKED: FST order validation failed!

To fix automatically:
    python3 scripts/fix_fst_order.py
    git add company_documents/fixtures/folder_structure_template.json
    git commit
```

---

### 4. **install-hooks.sh** - Установка всех Git hooks

**Что делает:**
- Устанавливает все Git hooks в `.git/hooks/`
- Делает их исполняемыми
- Готово к использованию!

**Использование:**
```bash
bash scripts/install-hooks.sh
```

---

## 🚀 Quick Start

### Первая установка:

```bash
# 1. Установить Git hooks
bash scripts/install-hooks.sh

# 2. Проверить текущий порядок
python3 scripts/validate_fst_order.py

# 3. Если есть ошибки - исправить
python3 scripts/fix_fst_order.py
```

### Обычная работа:

```bash
# Изменяем folder_structure_template.json
nano company_documents/fixtures/folder_structure_template.json

# Коммитим (hook автоматически проверит порядок!)
git add .
git commit -m "Update FST"

# Если порядок неправильный - исправляем
python3 scripts/fix_fst_order.py
git add .
git commit -m "Update FST"
```

---

## ❓ FAQ

### Зачем нужна проверка порядка?

Frappe использует **NestedSet** для иерархических структур. При импорте fixtures:
1. Создаётся запись FST-0001
2. Создаётся FST-0005 с `parent=FST-0001`
3. **ЕСЛИ FST-0001 ещё не создан** → CRASH!

Поэтому порядок **КРИТИЧЕН**: родители ВСЕГДА перед детьми.

### Можно ли пропустить проверку?

```bash
# НЕ РЕКОМЕНДУЕТСЯ, но возможно:
git commit --no-verify
```

### Что если скрипт показывает ошибки?

```bash
# 1. Автоматическое исправление
python3 scripts/fix_fst_order.py

# 2. Проверка
python3 scripts/validate_fst_order.py

# 3. Коммит
git add .
git commit -m "Fix FST order"
```

### Работает ли на Windows?

**Скрипты Python** - ДА:
```powershell
python scripts\validate_fst_order.py
python scripts\fix_fst_order.py
```

**Git hooks** - требуют **Git Bash** или **WSL**.

---

## 🔧 Разработчикам

### Добавить новый hook:

1. Создать `scripts/my-hook.sh`
2. Добавить в `install-hooks.sh`:
   ```bash
   cp "$SCRIPT_DIR/my-hook.sh" "$HOOKS_DIR/my-hook"
   chmod +x "$HOOKS_DIR/my-hook"
   ```

### Тестирование hooks без коммита:

```bash
# Вызвать hook напрямую
.git/hooks/pre-commit
```

---

## 📚 См. также

- [FIXTURES.md](../docs/FIXTURES.md) - Документация по fixtures
- [DEVELOPMENT.md](../docs/DEVELOPMENT.md) - Процесс разработки
- [CHANGELOG.md](../CHANGELOG.md) - История изменений
