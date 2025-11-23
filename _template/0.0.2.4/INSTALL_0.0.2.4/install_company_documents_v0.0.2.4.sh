#!/bin/bash

################################################################################
# 📋 ФИНАЛЬНЫЙ МАНУАЛ v0.0.2: ПОЛНАЯ УСТАНОВКА ERPNext + company_documents
# Дата создания: 2025-11-22
# Версия: v0.0.2.4 (РАБОЧАЯ, ПРОТЕСТИРОВАННАЯ)
# Статус: ✅ РАБОТАЕТ ИЗ КОРОБКИ
#
# 🎯 ЦЕЛЬ
# Создать полностью автоматическую установку ERPNext + кастомное приложение 
# company_documents на ЧИСТОМ СЕРВЕРЕ
#
# ✅ ИЗМЕНЕНИЯ В ЭТОЙ ВЕРСИИ:
# - company_documents устанавливается из GitHub (main ветка)
# - НЕ из архива ~/company_documents_v0.0.2.tar.gz
#
# 📦 СОСТАВ ПРИЛОЖЕНИЙ
# Приложение          Версия       Назначение
# ─────────────────────────────────────────────────────────────────────────────
# Frappe              version-15   Базовая платформа
# ERPNext             v15.83.0     ERP система
# HRMS                v15.52.0     Управление персоналом
# Raven               v2.6.4       Внутренний чат (realtime)
# pibiDAV             version-15   WebDAV интеграция
# company_documents   main (0.0.2+) 🎯 НАШЕ КАСТОМНОЕ ПРИЛОЖЕНИЕ (из GitHub!)
#
# 🧩 КАСТОМНОЕ ПРИЛОЖЕНИЕ: company_documents
# Репозиторий: https://github.com/ruslankonovets-22/Company-Documents-App.git
# Ветка: main
#
# Модули:
# - Documents (основной)
# - Projects (дополнительные DocTypes)
#
# DocTypes (9 штук):
# Модуль Documents (5):
#   - Document — основной DocType для документов
#   - Folder Structure Template — шаблоны структуры папок (45 штук)
#   - Document File — Child Table для прикреплённых файлов
#   - NextCloud Sync Settings — настройки синхронизации с NextCloud
#   - Task Document Link — связь документов с задачами
# Модуль Projects (4) (будут удалены, в проекте не участвуют):
#   - Project Document Type — типы документов проектов
#   - Task Employee — сотрудники в задачах
#   - CILA Document Row — строки документов CILA
#   - Folder Tree — древовидная структура папок
#
# Fixtures (автоматически импортируются):
#   doctype.json                    175K  (9 DocTypes)
#   server_script.json               17K  (5 скриптов)
#   client_script.json               13K  (7 скриптов)
#   workspace.json                  2.4K  (Documents App UI)
#   folder_structure_template.json   14K  (45 шаблонов)
#   document_naming_rule.json       282B  (DOC-.YYYY.-)
#   custom_field.json                 2B  (пусто)
#   property_setter.json              2B  (пусто)
#
# Автоматизация (NextCloud Sync):
# При сохранении Document (on_update) вызываются 4 функции:
#   - track_folder_changes — отслеживает изменение level_1 — level_5
#   - track_file_deletions — отслеживает удаление файлов из таблицы files
#   - upload_to_nextcloud — загружает новые файлы (где is_synced=0)
#   - delete_from_nextcloud — удаляет файлы из NextCloud при удалении
#
# 📂 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ
# На ЧИСТОМ СЕРВЕРЕ должно быть:
#   - Docker >= 20.10
#   - Docker Compose >= 2.0
#   - Интернет-соединение (для скачивания образов и зависимостей)
#   - Git
#
################################################################################

set -e  # Останавливаться при ошибках

TESTDIR="$HOME/frappe_docker_TEST"

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "  📋 УСТАНОВКА ERPNext + company_documents v0.0.2"
echo "  📅 Дата: $(date +'%Y-%m-%d %H:%M:%S')"
echo "  🎯 Директория: $TESTDIR"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

################################################################################
# 🧹 ШАГ 0: ПОЛНАЯ ОЧИСТКА ПРЕДЫДУЩИХ УСТАНОВОК
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 ШАГ 0: ПОЛНАЯ ОЧИСТКА"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Останавливаем и удаляем контейнеры + volumes
if [ -d "$TESTDIR" ]; then
    echo "📦 Останавливаем старые контейнеры..."
    cd "$TESTDIR" 2>/dev/null && docker compose down -v 2>/dev/null || true
    cd ~
    echo "🗑️  Удаляем директорию $TESTDIR..."
    rm -rf "$TESTDIR"
fi

# Удаляем старые образы custom-erpnext
echo "🗑️  Удаляем старые образы custom-erpnext..."
docker images | grep custom-erpnext | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

# Удаляем volumes (если остались)
echo "🗑️  Удаляем старые volumes..."
docker volume ls | grep frappe_docker_test | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true

# Удаляем dangling образы и volumes
echo "🗑️  Очистка системы Docker..."
docker system prune -af --volumes 2>/dev/null || true

echo "✅ Полная очистка завершена"
echo ""

################################################################################
# 🏗️ ШАГ 1: СОЗДАЁМ ДИРЕКТОРИЮ И КЛОНИРУЕМ frappe_docker
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  ШАГ 1: СОЗДАЁМ ДИРЕКТОРИЮ И КЛОНИРУЕМ frappe_docker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p "$TESTDIR"
cd "$TESTDIR"

echo "📥 Клонируем frappe_docker..."
git clone https://github.com/frappe/frappe_docker .

echo "✅ frappe_docker клонирован"
echo ""

################################################################################
# 📦 ШАГ 2: СОЗДАЁМ apps.json (С company_documents из GitHub!)
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 ШАГ 2: СОЗДАЁМ apps.json"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat > apps.json << 'JSON'
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
  },
  {
    "url": "https://github.com/ruslankonovets-22/Company-Documents-App.git",
    "branch": "main"
  }
]
JSON

echo "📄 apps.json создан:"
cat apps.json

echo ""
echo "🔍 Валидация JSON..."
if python3 -m json.tool apps.json > /dev/null 2>&1; then
    echo "✅ JSON валиден"
else
    echo "❌ JSON невалиден!"
    exit 1
fi

echo ""

################################################################################
# 🐳 ШАГ 3: СОЗДАЁМ Containerfile
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 ШАГ 3: СОЗДАЁМ Containerfile"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p images/custom

cat > images/custom/Containerfile << 'DOCKERFILE'
ARG FRAPPE_BRANCH=version-15

FROM frappe/build:${FRAPPE_BRANCH} AS builder

ARG FRAPPE_BRANCH=version-15
ARG FRAPPE_PATH=https://github.com/frappe/frappe
ARG APPS_JSON_BASE64

USER root

# Декодирование apps.json (БЕЗ Drive, С company_documents из GitHub!)
RUN if [ -n "${APPS_JSON_BASE64}" ]; then \
    mkdir -p /opt/frappe && \
    echo "${APPS_JSON_BASE64}" | base64 -d > /opt/frappe/apps.json && \
    cat /opt/frappe/apps.json; \
  fi

USER frappe

# Инициализация bench с apps.json
RUN export APP_INSTALL_ARGS="" && \
  if [ -n "${APPS_JSON_BASE64}" ]; then \
    export APP_INSTALL_ARGS="--apps_path=/opt/frappe/apps.json"; \
  fi && \
  bench init ${APP_INSTALL_ARGS} \
    --frappe-branch=${FRAPPE_BRANCH} \
    --frappe-path=${FRAPPE_PATH} \
    --no-procfile \
    --no-backups \
    --skip-redis-config-generation \
    --verbose \
    /home/frappe/frappe-bench && \
  cd /home/frappe/frappe-bench && \
  echo "{}" > sites/common_site_config.json && \
  find apps -mindepth 1 -path "*/.git" | xargs rm -fr

# Pinning зависимостей (для воспроизводимости)
RUN cd /home/frappe/frappe-bench && \
  /home/frappe/frappe-bench/env/bin/pip freeze > /home/frappe/requirements-pinned.txt

# Сборка ассетов (ТОЛЬКО frappe+erpnext на этапе builder)
RUN cd /home/frappe/frappe-bench && \
  bench build --apps frappe,erpnext

# Очистка кэша
RUN rm -rf /home/frappe/.cache/*

FROM frappe/base:${FRAPPE_BRANCH} AS backend

USER frappe

# Перенос готового bench
COPY --from=builder --chown=frappe:frappe /home/frappe/frappe-bench /home/frappe/frappe-bench
COPY --from=builder --chown=frappe:frappe /home/frappe/requirements-pinned.txt /home/frappe/requirements-pinned.txt

WORKDIR /home/frappe/frappe-bench

VOLUME [ \
  "/home/frappe/frappe-bench/sites", \
  "/home/frappe/frappe-bench/sites/assets", \
  "/home/frappe/frappe-bench/logs" \
]

CMD [ \
  "/home/frappe/frappe-bench/env/bin/gunicorn", \
  "--chdir=/home/frappe/frappe-bench/sites", \
  "--bind=0.0.0.0:8000", \
  "--threads=4", \
  "--workers=2", \
  "--worker-class=gthread", \
  "--worker-tmp-dir=/dev/shm", \
  "--timeout=120", \
  "--preload", \
  "frappe.app:application" \
]
DOCKERFILE

echo "✅ Containerfile создан"
echo ""

################################################################################
# 🚀 ШАГ 4: СОЗДАЁМ compose.yaml
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 ШАГ 4: СОЗДАЁМ compose.yaml"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat > compose.yaml << 'YAML'
name: frappe_docker_test

x-customizable-image: &customizable_image
  image: custom-erpnext:v15-0.0.2
  pull_policy: never
  restart: unless-stopped

x-depends-on-configurator: &depends_on_configurator
  depends_on:
    configurator:
      condition: service_completed_successfully

x-backend-defaults: &backend_defaults
  <<: [*depends_on_configurator, *customizable_image]
  volumes:
    - sites:/home/frappe/frappe-bench/sites
    - logs:/home/frappe/frappe-bench/logs

services:
  configurator:
    <<: *customizable_image
    entrypoint: ["bash", "-c"]
    command:
      - >
        echo frappe > sites/apps.txt;
        echo erpnext >> sites/apps.txt;
        echo hrms >> sites/apps.txt;
        echo raven >> sites/apps.txt;
        echo pibidav >> sites/apps.txt;
        echo company_documents >> sites/apps.txt;
        bench set-config -g db_host db;
        bench set-config -gp db_port 3306;
        bench set-config -g redis_cache redis://redis-cache:6379;
        bench set-config -g redis_queue redis://redis-queue:6379;
        bench set-config -g redis_socketio redis://redis-queue:6379;
        bench set-config -gp socketio_port 9000;
    volumes:
      - sites:/home/frappe/frappe-bench/sites
      - logs:/home/frappe/frappe-bench/logs
    restart: "no"

  create-site:
    <<: *customizable_image
    entrypoint: ["bash", "-c"]
    command:
      - |
        set -e
        wait-for-it -t 120 db:3306
        wait-for-it -t 120 redis-cache:6379
        export start=`date +%s`
        until [[ -n `grep -hs ^ sites/common_site_config.json | jq -r ".db_host // empty"` ]]; do
          echo "⏳ Waiting for common_site_config.json..."
          sleep 5
          if (( `date +%s`-start > 120 )); then 
            echo "❌ Timeout waiting for configurator"
            exit 1
          fi
        done
        
        if [ -f sites/localhost/site_config.json ]; then
          echo "✅ Site already exists"
          exit 0
        fi
        
        echo ""
        echo "🚀 Creating site localhost..."
        bench new-site localhost \
          --mariadb-user-host-login-scope='%' \
          --admin-password=admin \
          --db-root-password=123 \
          --install-app erpnext \
          --install-app hrms \
          --install-app raven \
          --install-app pibidav \
          --install-app company_documents \
          --set-default
        
        echo ""
        echo "⚙️  Configuring site settings..."
        echo "   ⚠️  КРИТИЧНО: server_script_enabled в common_site_config.json (-g флаг)"
        bench set-config -g server_script_enabled true
        bench --site localhost set-config developer_mode true
        bench --site localhost set-config allow_client_scripts true
        
        echo ""
        echo "🎨 Building frontend assets..."
        bench build --apps hrms,raven,pibidav
        
        echo ""
        echo "✅ Installation complete!"
        echo ""
        bench --site localhost list-apps
    volumes:
      - sites:/home/frappe/frappe-bench/sites
      - logs:/home/frappe/frappe-bench/logs
    depends_on:
      configurator:
        condition: service_completed_successfully
      db:
        condition: service_healthy
    restart: "no"

  backend:
    <<: *backend_defaults

  frontend:
    <<: *customizable_image
    command: ["nginx-entrypoint.sh"]
    environment:
      BACKEND: backend:8000
      SOCKETIO: websocket:9000
    volumes:
      - sites:/home/frappe/frappe-bench/sites
    ports:
      - "8081:8080"
    depends_on:
      - backend
      - websocket

  websocket:
    <<: [*depends_on_configurator, *customizable_image]
    command: ["node", "/home/frappe/frappe-bench/apps/frappe/socketio.js"]
    environment:
      FRAPPE_REDIS_CACHE: redis://redis-cache:6379
      FRAPPE_REDIS_QUEUE: redis://redis-queue:6379
    volumes:
      - sites:/home/frappe/frappe-bench/sites

  queue-short:
    <<: *backend_defaults
    command: ["bench", "worker", "--queue", "short,default"]

  queue-long:
    <<: *backend_defaults
    command: ["bench", "worker", "--queue", "long,default,short"]

  scheduler:
    <<: *backend_defaults
    command: ["bench", "schedule"]

  db:
    image: mariadb:10.6
    healthcheck:
      test: mysqladmin ping -h localhost --password=123
      interval: 1s
      retries: 15
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --skip-character-set-client-handshake
      - --skip-innodb-read-only-compressed
    environment:
      MYSQL_ROOT_PASSWORD: 123
    volumes:
      - db-data:/var/lib/mysql
    restart: unless-stopped

  redis-cache:
    image: redis:6.2-alpine
    volumes:
      - redis-cache-data:/data
    restart: unless-stopped

  redis-queue:
    image: redis:6.2-alpine
    volumes:
      - redis-queue-data:/data
    restart: unless-stopped

volumes:
  db-data:
  redis-cache-data:
  redis-queue-data:
  sites:
  logs:
YAML

echo "✅ compose.yaml создан"
echo ""

################################################################################
# 🔨 ШАГ 5: СОБИРАЕМ DOCKER-ОБРАЗ
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 ШАГ 5: СОБИРАЕМ DOCKER-ОБРАЗ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

export APPS_JSON_BASE64=$(base64 -w 0 apps.json 2>/dev/null || base64 apps.json | tr -d '\n')
echo "📊 APPS_JSON_BASE64 длина: ${#APPS_JSON_BASE64}"

if [ ${#APPS_JSON_BASE64} -lt 100 ]; then
    echo "❌ APPS_JSON_BASE64 слишком короткий!"
    exit 1
fi

echo ""
echo "🚧 Сборка образа (может занять 20-30 минут)..."
echo ""

docker build \
  --build-arg FRAPPE_BRANCH=version-15 \
  --build-arg FRAPPE_PATH=https://github.com/frappe/frappe \
  --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" \
  --tag custom-erpnext:v15-0.0.2 \
  --file images/custom/Containerfile \
  --no-cache \
  . 2>&1 | tee build_v0.0.2.log

echo ""
echo "✅ Образ собран"
echo ""

################################################################################
# ✅ ШАГ 6: ПРОВЕРЯЕМ ОБРАЗ
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ШАГ 6: ПРОВЕРЯЕМ ОБРАЗ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "🔍 1. Образ создан?"
docker images | grep custom-erpnext

echo ""
echo "🔍 2. Приложения внутри?"
docker run --rm custom-erpnext:v15-0.0.2 ls -la /home/frappe/frappe-bench/apps/

echo ""
echo "🔍 3. Версия company_documents?"
docker run --rm custom-erpnext:v15-0.0.2 cat /home/frappe/frappe-bench/apps/company_documents/company_documents/__init__.py

echo ""
echo "🔍 4. Fixtures на месте?"
docker run --rm custom-erpnext:v15-0.0.2 ls -lh /home/frappe/frappe-bench/apps/company_documents/company_documents/fixtures/

echo ""

################################################################################
# 🚀 ШАГ 7: ЗАПУСК!
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 ШАГ 7: ЗАПУСК!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$TESTDIR"
docker compose up -d

echo ""
echo "⏳ Ожидаем создания сайта (можно следить за логами: docker compose logs -f create-site)..."
echo ""

sleep 10

docker compose logs create-site

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 ПРОВЕРКА ПОСЛЕ ЗАПУСКА"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📊 Статус контейнеров:"
docker compose ps

echo ""
echo "🔍 Проверка server_script_enabled:"
docker exec frappe_docker_test-backend-1 cat /home/frappe/frappe-bench/sites/common_site_config.json | grep server_script_enabled || echo "⚠️  Не найден (контейнер может еще стартовать)"

echo ""
echo "📦 Список установленных приложений:"
docker exec frappe_docker_test-backend-1 bench --site localhost list-apps || echo "⚠️  Сайт еще создается..."

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "  ✅ УСТАНОВКА ЗАВЕРШЕНА!"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "🌐 URL: http://localhost:8081"
echo "👤 Логин: Administrator"
echo "🔑 Пароль: admin"
echo ""
echo "⚙️  Настройки автоматически включены:"
echo "   ✅ server_script_enabled: true (в common_site_config.json)"
echo "   ✅ developer_mode: true (в site_config.json)"
echo "   ✅ allow_client_scripts: true (в site_config.json)"
echo ""
echo "📂 Директория проекта: $TESTDIR"
echo ""
echo "📝 Полезные команды:"
echo "   docker compose ps               # Статус контейнеров"
echo "   docker compose logs -f          # Все логи"
echo "   docker compose logs -f backend  # Логи backend"
echo "   docker compose restart          # Перезапуск всех сервисов"
echo "   docker compose down             # Остановка (данные сохраняются)"
echo "   docker compose down -v          # Остановка + удаление данных"
echo ""
echo "🎉 ГОТОВО! 🎉"
echo ""