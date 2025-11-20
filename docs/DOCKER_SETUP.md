# 🐳 Docker Setup - Подробная документация

**Версия:** v0.0.2  
**Дата:** 2025-11-20  
**Frappe Docker:** latest  
**Подход:** Установка из GitHub (не из архива)

---

## 1. Обзор

Company Documents App устанавливается через **frappe_docker** с использованием:
- **apps.json** - список приложений для установки из GitHub
- **Containerfile** - многоступенчатая сборка
- **compose.yaml** - оркестрация сервисов

---

## 2. apps.json структура

### 2.1 Формат файла

```json
[
  {
    "url": "https://github.com/frappe/erpnext",
    "branch": "v15.83.0"
  },
  {
    "url": "https://github.com/frappe/hrms",
    "branch": "v15.52.0"
  },
  {
    "url": "https://github.com/The-Commit-Company/raven",
    "branch": "v2.6.4"
  },
  {
    "url": "https://github.com/pibico/pibidav",
    "branch": "version-15"
  }
]
```

### 2.2 Важные моменты

**✅ DO:**
- Указывайте конкретные версии (tags) или ветки
- Используйте публичные GitHub репозитории
- Проверяйте совместимость версий

**❌ DON'T:**
- Не используйте `"branch": "main"` - нестабильно
- Не смешивайте v14 и v15 приложения
- Не добавляйте company_documents в apps.json (добавляется отдельно)

### 2.3 Почему company_documents не в apps.json?

**Причина:** company_documents добавляется локально из директории, не из GitHub.

**Процесс:**
1. apps.json устанавливает базовые приложения (erpnext, hrms и т.д.)
2. Образ собирается с этими приложениями
3. company_documents копируется в образ отдельно
4. При создании сайта company_documents устанавливается последним

---

## 3. Containerfile архитектура

### 3.1 Двухступенчатая сборка

**Frappe использует multi-stage build:**

```dockerfile
# Ступень 1: Builder
FROM frappe/bench:latest AS builder

ARG APPS_JSON_BASE64
RUN echo "${APPS_JSON_BASE64}" | base64 -d > /tmp/apps.json
RUN bench init --skip-redis-config-generation --apps_path=/tmp/apps.json frappe-bench

# Ступень 2: Backend
FROM frappe/erpnext:latest

COPY --from=builder /home/frappe/frappe-bench /home/frappe/frappe-bench
COPY company_documents_app /home/frappe/frappe-bench/apps/company_documents
```

### 3.2 Зачем две ступени?

**Builder:**
- Устанавливает приложения из GitHub
- Компилирует зависимости
- "Тяжелый" образ с инструментами сборки

**Backend:**
- Финальный образ для запуска
- Только runtime зависимости
- Меньший размер образа

### 3.3 Передача apps.json

**Через Base64:**
```bash
export APPS_JSON_BASE64=$(base64 -w 0 apps.json)

docker build \
  --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" \
  --tag custom-erpnext:v15-0.0.2 \
  --file images/custom/Containerfile \
  .
```

**Почему Base64?**
- Безопасная передача JSON в build arg
- Избегание проблем с кавычками и спецсимволами
- Стандартный подход frappe_docker

---

## 4. compose.yaml сервисы

### 4.1 Полная структура

```yaml
version: "3"

services:
  backend:
    image: custom-erpnext:v15-0.0.2
    deploy:
      restart_policy:
        condition: on-failure
    volumes:
      - sites:/home/frappe/frappe-bench/sites
      - logs:/home/frappe/frappe-bench/logs
    ports:
      - "8081:8080"
    depends_on:
      - database
      - redis-cache
      - redis-queue

  database:
    image: mariadb:10.6
    environment:
      MYSQL_ROOT_PASSWORD: "123"
    volumes:
      - db-data:/var/lib/mysql

  redis-cache:
    image: redis:alpine

  redis-queue:
    image: redis:alpine

  create-site:
    image: custom-erpnext:v15-0.0.2
    deploy:
      restart_policy:
        condition: none
    command:
      - /bin/bash
      - -c
      - |
        bench new-site localhost \
          --mariadb-root-password 123 \
          --admin-password admin \
          --install-app erpnext \
          --install-app hrms \
          --install-app raven \
          --install-app pibidav \
          --install-app company_documents
        bench --site localhost set-config -g server_script_enabled 1
    volumes:
      - sites:/home/frappe/frappe-bench/sites

volumes:
  sites:
  db-data:
  logs:
```

### 4.2 Сервис: backend

**Назначение:** Основной сервер Frappe

**Порты:**
- `8081:8080` - Host:Container
- Доступ: http://localhost:8081

**Volumes:**
- `sites` - файлы сайтов и загруженные документы
- `logs` - логи приложения

**Зависимости:**
- `database` - MariaDB
- `redis-cache` - кэш
- `redis-queue` - очередь задач

### 4.3 Сервис: database

**Назначение:** MariaDB база данных

**Версия:** 10.6 (совместима с Frappe v15)

**Credentials (DEV ONLY!):**
- Root password: `123`

**Volume:**
- `db-data` - данные базы (персистентные)

### 4.4 Сервис: redis-cache

**Назначение:** Кэш для Frappe

**Использование:**
- Кэширование запросов к БД
- Сессии пользователей
- Временные данные

### 4.5 Сервис: redis-queue

**Назначение:** Очередь фоновых задач

**Использование:**
- Background jobs
- Scheduled tasks
- Асинхронные операции

### 4.6 Сервис: create-site

**Назначение:** Одноразовый сервис для создания сайта

**Особенности:**
- `restart_policy: none` - запускается один раз
- Создает новый сайт с установкой всех приложений
- После завершения останавливается

---

## 5. Порядок установки приложений

### 5.1 ⚠️ КРИТИЧНО: Правильная последовательность

```bash
bench new-site localhost \
  --install-app erpnext \      # 1. Базовая ERP функциональность
  --install-app hrms \          # 2. HR модули
  --install-app raven \         # 3. Внутренний чат
  --install-app pibidav \       # 4. Базовая WebDAV интеграция
  --install-app company_documents  # 5. ПОСЛЕДНИМ! Наше приложение
```

### 5.2 Почему порядок важен?

**Зависимости:**

```
company_documents
    ↓ требует
erpnext (DocTypes: Project, Task)
    ↓ требует
hrms (HR функциональность)
    ↓ требует
frappe (базовая платформа)
```

**Что происходит при неправильном порядке:**
- ❌ DocTypes не найдены
- ❌ Custom Fields не применяются
- ❌ Fixtures не импортируются
- ❌ Миграции падают с ошибками

### 5.3 Проверка порядка установки

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost list-apps
'
```

**Ожидаемый вывод:**
```
frappe
erpnext
hrms
raven
pibidav
company_documents
```

---

## 6. Маппинг портов

### 6.1 Структура портов

```yaml
ports:
  - "8081:8080"
#    ^^^^  ^^^^
#    Host  Container
```

**Host (8081):** Порт на вашей машине  
**Container (8080):** Порт внутри контейнера

### 6.2 Доступ к приложению

**URL:** http://localhost:8081

**Если порт занят:**
```yaml
# Изменить в compose.yaml
ports:
  - "8082:8080"  # Использовать 8082
```

**Проверка занятых портов:**
```bash
# Linux/Mac
lsof -i :8081

# Windows
netstat -ano | findstr :8081
```

---

## 7. Volumes (персистентное хранилище)

### 7.1 Типы volumes

```yaml
volumes:
  sites:      # Файлы сайтов
  db-data:    # База данных
  logs:       # Логи
```

### 7.2 Где хранятся данные?

**Docker volumes location:**
```bash
# Linux
/var/lib/docker/volumes/

# Mac
~/Library/Containers/com.docker.docker/Data/

# Windows
C:\ProgramData\Docker\volumes\
```

**Просмотр:**
```bash
docker volume ls
docker volume inspect frappe_docker_TEST_sites
```

### 7.3 Backup volumes

```bash
# Создать backup
docker run --rm \
  -v frappe_docker_TEST_sites:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/sites-backup.tar.gz -C /data .

# Восстановить
docker run --rm \
  -v frappe_docker_TEST_sites:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/sites-backup.tar.gz -C /data
```

---

## 8. Команды для работы

### 8.1 Сборка образа

```bash
# Полная сборка
export APPS_JSON_BASE64=$(base64 -w 0 apps.json)

docker build \
  --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" \
  --tag custom-erpnext:v15-0.0.2 \
  --file images/custom/Containerfile \
  .
```

**Опции:**
- `--no-cache` - пересобрать без кэша
- `--progress=plain` - подробный вывод

### 8.2 Запуск контейнеров

```bash
# Запустить все сервисы
docker compose up -d

# Следить за логами
docker compose logs -f

# Следить за конкретным сервисом
docker compose logs -f backend
docker compose logs -f create-site
```

### 8.3 Остановка и очистка

```bash
# Остановить
docker compose stop

# Остановить и удалить контейнеры
docker compose down

# Удалить контейнеры + volumes (ПОЛНАЯ ОЧИСТКА)
docker compose down -v
```

### 8.4 Вход в контейнер

```bash
# Bash в backend
docker compose exec backend bash

# Выполнить команду
docker compose exec backend bench --version
```

---

## 9. Настройка после установки

### 9.1 Включение Server Scripts

**⚠️ КРИТИЧНО для v15:**
```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost set-config -g server_script_enabled 1
'
```

**Проверка:**
```bash
docker compose exec backend cat /workspace/frappe-bench/sites/common_site_config.json
```

**Ожидаемый вывод:**
```json
{
  "server_script_enabled": 1
}
```

### 9.2 Настройка NextCloud

**Через UI:**
1. Перейти в: Desk → NextCloud Sync Settings
2. Заполнить:
   - Enable: ✓
   - NC URL: https://cloud.example.com
   - NC Username: admin
   - NC Password: ••••••
   - NC Root Path: /Company Documents (опционально)
3. Сохранить

---

## 10. Отладка

### 10.1 Проверка статуса сервисов

```bash
# Список контейнеров
docker compose ps

# Детальная информация
docker compose ps -a

# Использование ресурсов
docker stats
```

### 10.2 Логи

```bash
# Все логи
docker compose logs

# Последние 100 строк
docker compose logs --tail=100

# Следить за логами в реальном времени
docker compose logs -f backend

# Логи конкретного сервиса
docker compose logs create-site
```

### 10.3 Проверка подключения к БД

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost mariadb
'
```

```sql
SHOW DATABASES;
USE `_2d5e1f4d823e3e60`;  -- имя БД сайта
SHOW TABLES;
```

### 10.4 Проверка установленных приложений

```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost list-apps
'
```

---

## 11. Troubleshooting

### 11.1 Порт 8081 занят

**Проблема:**
```
Error: bind: address already in use
```

**Решение:**
```yaml
# В compose.yaml изменить:
ports:
  - "8082:8080"
```

### 11.2 create-site падает с ошибкой

**Проверка логов:**
```bash
docker compose logs create-site
```

**Частые причины:**
- БД не готова - добавить `sleep 10` перед bench new-site
- Неправильный пароль root
- Приложение не найдено

**Решение:**
```bash
# Пересоздать с нуля
docker compose down -v
docker compose up -d
```

### 11.3 company_documents не установилось

**Проверка:**
```bash
docker compose exec backend ls /workspace/frappe-bench/apps/
```

**Если нет company_documents:**
```bash
# Пересобрать образ
docker build ... --no-cache
```

### 11.4 Server Scripts не работают

**Проверка:**
```bash
docker compose exec backend cat /workspace/frappe-bench/sites/common_site_config.json | grep server_script
```

**Должно быть:**
```json
"server_script_enabled": 1
```

**Если нет:**
```bash
docker compose exec backend bash -c '
cd /workspace/frappe-bench && 
bench --site localhost set-config -g server_script_enabled 1
'
```

---

## 12. Production Setup

### 12.1 Отличия от Development

**Development (ПОЛИГОН):**
```yaml
environment:
  MYSQL_ROOT_PASSWORD: "123"
  ADMIN_PASSWORD: "admin"
```

**Production:**
```yaml
environment:
  MYSQL_ROOT_PASSWORD: "${DB_ROOT_PASSWORD}"
  ADMIN_PASSWORD: "${ADMIN_PASSWORD}"
```

**Используйте `.env` файл:**
```bash
# .env
DB_ROOT_PASSWORD=SecurePassword123!
ADMIN_PASSWORD=AnotherSecurePass456!
```

### 12.2 SSL/TLS

**Добавить nginx:**
```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
```

### 12.3 Backup стратегия

**Автоматический backup:**
```bash
# Crontab
0 2 * * * docker compose exec -T backend bench --site localhost backup --with-files
```

---

## 13. Обновление приложения

### 13.1 Обновление company_documents

```bash
# 1. Получить новую версию
cd company_documents_app
git pull origin main

# 2. Пересобрать образ
cd ..
docker build ... --tag custom-erpnext:v15-0.0.3

# 3. Обновить compose.yaml
# image: custom-erpnext:v15-0.0.3

# 4. Перезапустить
docker compose down
docker compose up -d

# 5. Запустить миграции (если есть)
docker compose exec backend bench --site localhost migrate
```

---

## 14. Мониторинг

### 14.1 Health checks

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 14.2 Логи в Syslog

```yaml
services:
  backend:
    logging:
      driver: syslog
      options:
        syslog-address: "tcp://192.168.0.1:514"
```

---

## 15. Best Practices

### 15.1 Версионирование образов

```bash
# Всегда тегируйте образы
docker build ... --tag custom-erpnext:v15-0.0.2
docker build ... --tag custom-erpnext:latest

# Не используйте только :latest в продакшене
```

### 15.2 Организация файлов

```
project/
├── apps.json
├── compose.yaml
├── .env                  # Секреты (не коммитить!)
├── .env.example          # Пример .env
├── company_documents_app/
└── backups/
```

### 15.3 Документация изменений

```bash
# CHANGELOG.md
## Docker Setup Changes

### [0.0.2] - 2025-11-20
- Changed installation from archive to GitHub
- Updated apps.json with specific versions
```

---

## Ссылки

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - архитектура приложения
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - процесс разработки
- **[frappe_docker repository](https://github.com/frappe/frappe_docker)** - официальный репозиторий

---

**Последнее обновление:** 2025-11-20
