# ⚙️ Настройка NextCloud Sync

## 1. Создайте пользователя в NextCloud

1. NextCloud → Settings → Users
2. Создайте пользователя `erpnext_sync`
3. Дайте права на папку `/Projects`

## 2. Настройте ERPNext

1. ERPNext: `NextCloud Sync Settings`
2. Заполните:
   - **Enabled:** ✓
   - **NextCloud URL:** `https://your-nextcloud.com`
   - **Username:** `erpnext_sync`
   - **Password:** `your_password`
   - **Root Path:** `/`
3. **Save** → **Test Connection** → "Подключение успешно! ✓"

## 3. Проверка

1. Создайте Document
2. Прикрепите файл
3. Save
4. Проверьте NextCloud: `Projects/ProjectName/Level1/.../file.pdf` ✅
