#!/bin/bash
set -e

# Simple entrypoint that:
# - installs cron jobs for checker_blue.sh (every 2 hours) and getCookies.js (every 6 hours)
# - starts cron daemon
# - starts the web-control server (background)
# - execs the main automation process (foreground) so Docker can manage it

APP_DIR="/usr/src/app"
LOG_DIR="${APP_DIR}/logs"
CRON_LOG="${LOG_DIR}/cron.log"
COOKIES_LOG="${LOG_DIR}/towbook18.log"

mkdir -p "${LOG_DIR}"

# Write crontab entries (overwrite any existing crontab for this user)
# Run checker_blue.sh every 2 hours at minute 0
# Run getCookies.js every 6 hours at minute 0
cat > /tmp/cronjobs <<EOF
# m h dom mon dow command
0 */2 * * * cd ${APP_DIR} && ./checker_blue.sh >> ${CRON_LOG} 2>&1
0 */6 * * * cd ${APP_DIR} && bash getCookies_towbook18.sh > ${COOKIES_LOG} 2>&1
EOF

crontab /tmp/cronjobs || true

# Start cron daemon (system cron). Ensure /var/run is writable then start cron.
if command -v cron >/dev/null 2>&1; then
  # Ensure runtime directory exists and is writable (fixes crond.pid permission errors)
  mkdir -p /var/run
  chmod 0777 /var/run
  # Start cron (background)
  cron
else
  echo "cron not found; scheduled jobs will not run."
fi

# Start web-control server in foreground if present (web-control manages starting/stopping the main app via PM2)
if [ -f "${APP_DIR}/web-control/server.js" ]; then
  echo "Starting web-control server in foreground..."
  cd "${APP_DIR}"
  exec node "${APP_DIR}/web-control/server.js"
else
  echo "web-control server entrypoint not found at ${APP_DIR}/web-control/server.js"
  echo "Starting main application directly as fallback..."
  cd "${APP_DIR}"
  exec node index.js
fi
