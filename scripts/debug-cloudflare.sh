#!/bin/bash
# Axis3 Cloudflare + Nginx + Docker Debug Script
# Run this script and share the output

echo "=========================================="
echo "AXIS3 CLOUDFLARE DEBUG SCRIPT"
echo "=========================================="
echo ""

echo "=== 1. DOCKER CONTAINER STATUS ==="
docker ps -a
echo ""

echo "=== 2. DOCKER LOGS (Last 50 lines) ==="
docker logs --tail 50 axis3-app 2>&1
echo ""

echo "=== 3. PORT LISTENING CHECK ==="
sudo ss -tlnp | grep -E ':(80|443|3000)' 2>&1 || sudo netstat -tlnp | grep -E ':(80|443|3000)' 2>&1
echo ""

echo "=== 4. NGINX STATUS ==="
sudo systemctl status nginx --no-pager
echo ""

echo "=== 5. NGINX CONFIGURATION TEST ==="
sudo nginx -t 2>&1
echo ""

echo "=== 6. NGINX SITE CONFIG ==="
echo "--- /etc/nginx/sites-available/axis3 ---"
sudo cat /etc/nginx/sites-available/axis3 2>&1
echo ""

echo "=== 7. NGINX ERROR LOG (Last 30 lines) ==="
sudo tail -30 /var/log/nginx/error.log 2>&1
echo ""

echo "=== 8. NGINX ACCESS LOG (Last 20 lines) ==="
sudo tail -20 /var/log/nginx/access.log 2>&1
echo ""

echo "=== 9. LOCALHOST CONNECTION TEST ==="
echo "--- Testing http://localhost:3000 ---"
curl -I http://localhost:3000 2>&1
echo ""
echo "--- Testing http://localhost ---"
curl -I http://localhost 2>&1
echo ""

echo "=== 10. DNS RESOLUTION ==="
echo "Enter your domain name (e.g., axis3.com):"
read DOMAIN
if [ ! -z "$DOMAIN" ]; then
    nslookup $DOMAIN 2>&1
    echo ""
    echo "=== 11. CLOUDFLARE HEADERS TEST ==="
    curl -I https://$DOMAIN 2>&1
fi
echo ""

echo "=== 12. FIREWALL STATUS ==="
sudo ufw status verbose 2>&1
echo ""

echo "=== 13. DOCKER NETWORK ==="
docker network ls
echo ""
echo "--- Container Network Details ---"
docker inspect axis3-app 2>&1 | grep -A 20 "NetworkSettings"
echo ""

echo "=== 14. DOCKER ENVIRONMENT VARIABLES ==="
docker exec axis3-app env 2>&1 | grep -E '(NEXT_PUBLIC|NODE_ENV|PORT|HOSTNAME)'
echo ""

echo "=== 15. SSL CERTIFICATES ==="
echo "--- Cloudflare Origin Certificate ---"
sudo ls -la /etc/ssl/cloudflare/ 2>&1 || echo "No Cloudflare certificate found"
echo ""
echo "--- Let's Encrypt Certificate ---"
sudo ls -la /etc/letsencrypt/live/ 2>&1 || echo "No Let's Encrypt certificate found"
echo ""

echo "=== 16. SYSTEM RESOURCES ==="
echo "--- Memory ---"
free -h
echo ""
echo "--- Disk Space ---"
df -h
echo ""

echo "=== 17. CLOUDFLARE IP WHITELIST ==="
if [ -f /etc/nginx/snippets/cloudflare-ips.conf ]; then
    echo "--- /etc/nginx/snippets/cloudflare-ips.conf ---"
    sudo cat /etc/nginx/snippets/cloudflare-ips.conf
else
    echo "Cloudflare IP whitelist NOT configured"
fi
echo ""

echo "=== 18. ENABLED NGINX SITES ==="
ls -la /etc/nginx/sites-enabled/ 2>&1
echo ""

echo "=========================================="
echo "DEBUG SCRIPT COMPLETED"
echo "=========================================="
echo ""
echo "Please share this entire output with the developer."
echo ""
