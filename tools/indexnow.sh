#!/bin/sh
# Submit every URL in sitemap.xml to IndexNow (Bing, Yandex, etc.). Run after deploying.
KEY=4714e68133e24ad7877a4f64384dc82a
HOST=www.cephionix.com
cd "$(dirname "$0")/.." || exit 1
URLS=$(grep -o '<loc>[^<]*' sitemap.xml | sed 's/<loc>//' | awk '{printf "%s\"%s\"", (NR>1?",":""), $0}')
curl -s -o /dev/null -w "IndexNow HTTP %{http_code}\n" -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json; charset=utf-8' \
  -d "{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"https://$HOST/$KEY.txt\",\"urlList\":[$URLS]}"
