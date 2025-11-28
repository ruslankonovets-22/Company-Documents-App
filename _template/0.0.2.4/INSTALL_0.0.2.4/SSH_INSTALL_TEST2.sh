# Создаём файл установки одной командой
cat > ~/install_test2.sh << 'SCRIPT_END'
#!/bin/bash

################################################################################
# 📋 АВТОМАТИЧЕСКАЯ УСТАНОВКА ERPNext + company_documents (СТЕНД TEST2)
# Версия: v0.0.2.8-test2
# Дата: 2025-11-28
# Репозиторий: https://github.com/ruslankonovets-22/Company-Documents-App
# Ветка: main (всегда последняя версия)
#
# 🎯 ЦЕЛЬ
# Создать ПАРАЛЛЕЛЬНЫЙ стенд рядом с существующим TEST (порт 8081)
# Этот стенд работает на порту 8082 и полностью изолирован
#
# 📦 СОСТАВ ПРИЛОЖЕНИЙ
# Приложение          Версия       Источник
# ─────────────────────────────────────────────────────────────────────────────
# Frappe              version-15   GitHub frappe/frappe
# ERPNext             v15.83.0     GitHub frappe/erpnext
# HRMS                v15.52.0     GitHub frappe/hrms
# Raven               v2.6.4       GitHub The-Commit-Company/raven
# pibiDAV             version-15   GitHub pibico/pibidav
# company_documents   main         GitHub ruslankonovets-22/Company-Documents-App
#
# 📂 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ
# - Docker >= 20.10
# - Docker Compose >= 2.0
# - Интернет-соединение
# - Git
# - ~20GB свободного места на диске
#
# ⚠️  ИЗОЛЯЦИЯ ОТ TEST1:
# - Директория: ~/frappe_docker_TEST2 (не TEST)
# - Docker image: custom-erpnext:v15-test2 (не v15-latest)
# - Compose name: frappe_docker_test2 (не frappe_docker_test)
# - Порт: 8082 (не 8081)
# - Volumes: frappe_docker_test2_* (автоматически)
#
################################################################################

set -e  # Останавливаться при ошибках

TESTDIR="$HOME/frappe_docker_TEST2"
IMAGE_TAG="custom-erpnext:v15-test2"
COMPOSE_PROJECT="frappe_docker_test2"
PORT="8082"

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "  📋 УСТАНОВКА ERPNext + company_documents (СТЕНД TEST2)"
echo "  📅 Дата: $(date +'%Y-%m-%d %H:%M:%S')"
echo "  🎯 Директория: $TESTDIR"
echo "  🐳 Docker Image: $IMAGE_TAG"
echo "  🌐 Порт: $PORT"
echo "  📌 Версия скрипта: v0.0.2.8-test2"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

################################################################################
# 🧹 ШАГ 0: ОЧИСТКА ТОЛЬКО TEST2 (НЕ ТРОГАЕМ TEST1!)
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 ШАГ 0: ОЧИСТКА ТОЛЬКО TEST2 (TEST1 НЕ ТРОГАЕМ!)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "$TESTDIR" ]; then
    echo "📦 Останавливаем старые контейнеры TEST2..."
    cd "$TESTDIR" 2>/dev/null && docker compose down -v 2>/dev/null || true
    cd ~
    echo "🗑️  Удаляем директорию $TESTDIR..."
    rm -rf "$TESTDIR"
fi

echo "🗑️  Удаляем старый образ $IMAGE_TAG (если есть)..."
docker rmi -f "$IMAGE_TAG" 2>/dev/null || true

echo "🗑️  Удаляем старые volumes test2..."
docker volume ls | grep frappe_docker_test2 | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true

# НЕ делаем docker system prune - это удалит кэш и повлияет на TEST1!
echo "⚠️  docker system prune ПРОПУЩЕН (чтобы не затронуть TEST1)"

echo "✅ Очистка TEST2 завершена"
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
# 📦 ШАГ 2: СОЗДАЁМ apps.json
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

echo "📄 apps.json создан с main веткой company_documents"
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

RUN if [ -n "${APPS_JSON_BASE64}" ]; then \
    mkdir -p /opt/frappe && \
    echo "${APPS_JSON_BASE64}" | base64 -d > /opt/frappe/apps.json && \
    cat /opt/frappe/apps.json; \
  fi

USER frappe

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

RUN cd /home/frappe/frappe-bench && \
  /home/frappe/frappe-bench/env/bin/pip freeze > /home/frappe/requirements-pinned.txt

RUN cd /home/frappe/frappe-bench && \
  bench build --apps frappe,erpnext

RUN rm -rf /home/frappe/.cache/*

FROM frappe/base:${FRAPPE_BRANCH} AS backend

USER frappe

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
# 🚀 ШАГ 4: СОЗДАЁМ compose.yaml (TEST2 - порт 8082)
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 ШАГ 4: СОЗДАЁМ compose.yaml (TEST2 - порт $PORT)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat > compose.yaml << 'YAML'
name: frappe_docker_test2

x-customizable-image: &customizable_image
  image: custom-erpnext:v15-test2
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
        echo "════════════════════════════════════════════════════════════════════════"
        echo "⚙️  ВАЖНО: Включаем developer_mode ПЕРЕД созданием сайта..."
        echo "   (требуется для импорта DocType fixtures из pibidav и company_documents)"
        echo "════════════════════════════════════════════════════════════════════════"
        bench set-config -g developer_mode 1
        bench set-config -g server_script_enabled 1
        echo "✅ developer_mode и server_script_enabled включены"
        
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
        echo "⚙️  Configuring additional site settings..."
        bench --site localhost set-config developer_mode 1
        bench --site localhost set-config allow_client_scripts 1
        
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
      - "8082:8080"
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

echo "✅ compose.yaml создан (порт $PORT)"
echo ""

################################################################################
# 🔨 ШАГ 5: СОБИРАЕМ DOCKER-ОБРАЗ (с красивым BuildKit выводом!)
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 ШАГ 5: СОБИРАЕМ DOCKER-ОБРАЗ ($IMAGE_TAG)"
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
echo "   💡 Вы увидите интерактивный BuildKit интерфейс:"
echo "      🔵 Синие галочки — выполненные шаги"
echo "      ⚪ Белый спиннер — текущий шаг"
echo "      📊 Прогресс-бары — загрузка/компиляция"
echo "      ⏱️  Время каждого шага"
echo ""

BUILD_START=$(date +%s)

docker build \
  --build-arg FRAPPE_BRANCH=version-15 \
  --build-arg FRAPPE_PATH=https://github.com/frappe/frappe \
  --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" \
  --tag "$IMAGE_TAG" \
  --file images/custom/Containerfile \
  --no-cache \
  .

BUILD_EXIT_CODE=$?
BUILD_END=$(date +%s)
BUILD_DURATION=$((BUILD_END - BUILD_START))
BUILD_MINS=$((BUILD_DURATION / 60))
BUILD_SECS=$((BUILD_DURATION % 60))

echo ""
if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo "❌ Ошибка сборки образа! Код выхода: $BUILD_EXIT_CODE"
    echo "   ⏱️  Время до ошибки: ${BUILD_MINS}м ${BUILD_SECS}с"
    exit 1
fi

echo "✅ Образ собран успешно"
echo "   ⏱️  Время сборки: ${BUILD_MINS}м ${BUILD_SECS}с"
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
docker run --rm "$IMAGE_TAG" ls -la /home/frappe/frappe-bench/apps/

echo ""
echo "🔍 3. Версия company_documents?"
docker run --rm "$IMAGE_TAG" cat /home/frappe/frappe-bench/apps/company_documents/company_documents/__init__.py

echo ""
echo "🔍 4. Fixtures на месте?"
docker run --rm "$IMAGE_TAG" ls -lh /home/frappe/frappe-bench/apps/company_documents/company_documents/fixtures/

echo ""

################################################################################
# 🚀 ШАГ 7: ЗАПУСК КОНТЕЙНЕРОВ
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 ШАГ 7: ЗАПУСК КОНТЕЙНЕРОВ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$TESTDIR"
docker compose up -d

echo ""
echo "✅ Контейнеры запущены"
echo ""

################################################################################
# 📊 ШАГ 8: ОТСЛЕЖИВАНИЕ СОЗДАНИЯ САЙТА
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 ШАГ 8: ОТСЛЕЖИВАНИЕ СОЗДАНИЯ САЙТА"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏳ Ожидание создания сайта (10-15 минут)..."
echo "   Вы увидите логи в реальном времени."
echo "   Дождитесь сообщения 'Installation complete!' или ошибки."
echo ""
echo "───────────────────────────────────────────────────────────────────────────"

docker compose logs -f create-site

echo "───────────────────────────────────────────────────────────────────────────"
echo ""

# Проверяем код выхода контейнера
CREATE_SITE_EXIT=$(docker inspect frappe_docker_test2-create-site-1 --format='{{.State.ExitCode}}' 2>/dev/null || echo "1")

if [ "$CREATE_SITE_EXIT" != "0" ]; then
    echo "❌ Контейнер create-site завершился с ошибкой (код: $CREATE_SITE_EXIT)"
    echo ""
    echo "Последние логи:"
    docker compose logs --tail=30 create-site
    exit 1
fi

echo "✅ Сайт создан успешно!"
echo ""

################################################################################
# 🎯 ШАГ 9: ФИНАЛЬНАЯ ПРОВЕРКА
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 ШАГ 9: ФИНАЛЬНАЯ ПРОВЕРКА"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "⏳ Ждём старта backend контейнера..."
sleep 10

echo ""
echo "📊 Статус контейнеров:"
docker compose ps

echo ""
echo "📦 Список установленных приложений:"
docker exec frappe_docker_test2-backend-1 bench --site localhost list-apps 2>/dev/null || echo "❌ Не удалось получить список"

echo ""
echo "🔍 Проверка DocTypes модуля Documents:"
docker exec frappe_docker_test2-backend-1 bench --site localhost mariadb -e "SELECT name FROM tabDocType WHERE module='Documents';" 2>/dev/null || echo "❌ Не удалось проверить"

echo ""
echo "🔍 Проверка Folder Structure Templates:"
docker exec frappe_docker_test2-backend-1 bench --site localhost mariadb -e "SELECT COUNT(*) as 'FST Count' FROM \`tabFolder Structure Template\`;" 2>/dev/null || echo "❌ Не удалось проверить"

echo ""
echo "🔍 Проверка Workspace:"
docker exec frappe_docker_test2-backend-1 bench --site localhost mariadb -e "SELECT name FROM tabWorkspace WHERE name LIKE '%Document%';" 2>/dev/null || echo "❌ Не удалось проверить"

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "  ✅ УСТАНОВКА TEST2 ЗАВЕРШЕНА!"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "🌐 URL: http://localhost:$PORT"
echo "👤 Логин: Administrator"
echo "🔑 Пароль: admin"
echo ""
echo "⚙️  Настройки автоматически включены:"
echo "   ✅ server_script_enabled: true"
echo "   ✅ developer_mode: true"
echo "   ✅ allow_client_scripts: true"
echo ""
echo "📂 Директория проекта: $TESTDIR"
echo "🐳 Docker Image: $IMAGE_TAG"
echo ""
echo "📝 Полезные команды:"
echo "   cd $TESTDIR"
echo "   docker compose ps               # Статус контейнеров"
echo "   docker compose logs -f          # Все логи"
echo "   docker compose logs -f backend  # Логи backend"
echo "   docker compose restart          # Перезапуск всех сервисов"
echo "   docker compose down             # Остановка (данные сохраняются)"
echo "   docker compose down -v          # Остановка + удаление данных"
echo ""
echo "🔗 Оба стенда:"
echo "   TEST1: http://localhost:8081 (~/frappe_docker_TEST)"
echo "   TEST2: http://localhost:$PORT ($TESTDIR)"
echo ""
echo "🎉 ГОТОВО! 🎉"
echo ""
SCRIPT_END

# Делаем исполняемым
chmod +x ~/install_test2.sh

# 2. На сервере запустится создание ~/install_test2.sh и его выполнение
~/install_test2.sh
echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "  📋 Скрипт install_test2.sh создан!"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Для запуска установки TEST2 выполните:"
echo "  ~/install_test2.sh"
echo ""
echo "⚠️  TEST1 (порт 8081) НЕ будет затронут!"
echo ""
