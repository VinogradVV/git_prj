FROM cubejs/cube:latest

USER root

# Устанавливаем Python
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*
RUN pip3 install fastapi uvicorn requests --break-system-packages

# Копируем скрипт
COPY schema_manager.py /opt/cube-tools/schema_manager.py

# Исправленный скрипт запуска
# Мы используем абсолютный путь к cubejs-server и передаем управление Docker-окружению
RUN echo '#!/bin/sh\n\
python3 /opt/cube-tools/schema_manager.py & \n\
cd /cube && exec /cube/node_modules/.bin/cubejs-server' > /cube/conf/entrypoint-custom.sh

RUN chmod +x /cube/conf/entrypoint-custom.sh

# Важно: Cube должен запускаться из своей рабочей директории
WORKDIR /cube

ENTRYPOINT ["/cube/conf/entrypoint-custom.sh"]
