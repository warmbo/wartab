#!/bin/bash
cd /home/cody/Projects/wartab
systemctl --user restart wartab
sleep 1
echo "STATUS: $(systemctl --user is-active wartab)"
echo "HTTP: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/style.css)"
