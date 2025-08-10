#!/bin/bash

export PATH="/usr/local/bin:/usr/bin/:$PATH"

export PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium"

process_name="auth-bmw"

result=$(/usr/local/bin/pm2 list | grep "$process_name")

echo $result

if [[ -n $result ]]; then

  echo "true"

  pm2 delete $process_name

  COLOR=blue /usr/local/bin/pm2 start index.js --name auth-bmw --cwd /usr/src/app

else

  echo "false"

fi
