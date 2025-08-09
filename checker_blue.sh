#!/bin/bash

process_name="auth-bmw"
result=$(pm2 list | grep "$process_name")
 
if [[ -n $result ]]; then
  echo "true"
  pm2 delete $process_name
  COLOR=blue pm2 start index.js --name auth-bmw --cwd /usr/src/app
else
  echo "false"
fi
