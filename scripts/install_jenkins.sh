#!/bin/bash
set -e

echo "=========================================="
echo "  Installing Jenkins via Docker"
echo "=========================================="

# ─── Update system ───────────────────────────
apt-get update -y
apt-get install -y curl wget git unzip

# ─── Install Java 17 ─────────────────────────
echo ">>> Installing Java 17..."
apt-get install -y openjdk-17-jdk
java -version

# ─── Install Docker ──────────────────────────
echo ">>> Installing Docker..."
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
rm -f /etc/apt/keyrings/docker.gpg
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  gpg --dearmor --batch --yes -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl start docker
systemctl enable docker
usermod -aG docker vagrant

# ─── Install NodeJS 20 ───────────────────────
echo ">>> Installing NodeJS 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v
npm -v

# ─── Install SonarQube Scanner ───────────────
echo ">>> Installing SonarQube Scanner..."
wget -q https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip \
  -O /tmp/sonar-scanner.zip
rm -rf /opt/sonar-scanner-5.0.1.3006-linux
unzip -oq /tmp/sonar-scanner.zip -d /opt/
rm -rf /opt/sonar-scanner
mv /opt/sonar-scanner-5.0.1.3006-linux /opt/sonar-scanner
ln -sf /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner
rm /tmp/sonar-scanner.zip

# ─── Install Jenkins via Docker ──────────────
echo ">>> Starting Jenkins via Docker..."

# Créer le volume Jenkins
docker volume create jenkins_home

# Pré-télécharger l'image Jenkins avec retries pour éviter les erreurs de digest transitoires
echo ">>> Pulling Jenkins image with retries..."
for i in 1 2 3; do
  if docker pull jenkins/jenkins:lts; then
    break
  fi
  if [ "$i" -eq 3 ]; then
    echo ">>> Docker pull failed after 3 attempts"
    exit 1
  fi
  echo ">>> Pull failed (attempt $i). Cleaning Docker cache and retrying..."
  docker system prune -af || true
  sleep 10
done

# Lancer Jenkins
docker rm -f jenkins >/dev/null 2>&1 || true
docker run -d \
  --name jenkins \
  --restart=unless-stopped \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts

echo ">>> Waiting for Jenkins to start (60s)..."
sleep 60

# ─── Récupérer le mot de passe initial ───────
echo ">>> Getting initial admin password..."
JENKINS_PASS=$(docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null || echo "Not ready yet")

echo "=========================================="
echo "  Jenkins installed successfully!"
echo "  URL     : http://192.168.56.10:8081"
echo "  Password: $JENKINS_PASS"
echo ""
echo "  To get password later:"
echo "  docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword"
echo "=========================================="