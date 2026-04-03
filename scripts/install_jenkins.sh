#!/bin/bash
set -e

echo "=========================================="
echo "  Installing Jenkins on Ubuntu 22.04"
echo "=========================================="

# ─── Update system ───────────────────────────
apt-get update -y
apt-get upgrade -y

# ─── Install Java 17 ─────────────────────────
echo ">>> Installing Java 17..."
apt-get install -y openjdk-17-jdk
java -version

# ─── Install Jenkins ─────────────────────────
echo ">>> Installing Jenkins..."
wget -q -O /usr/share/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key

echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/" | \
  tee /etc/apt/sources.list.d/jenkins.list > /dev/null

apt-get update -y
apt-get install -y jenkins

systemctl start jenkins
systemctl enable jenkins

# ─── Install NodeJS 20 ───────────────────────
echo ">>> Installing NodeJS 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v
npm -v

# ─── Install Git ─────────────────────────────
echo ">>> Installing Git..."
apt-get install -y git

# ─── Install Docker ──────────────────────────
echo ">>> Installing Docker..."
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io

usermod -aG docker jenkins
usermod -aG docker vagrant

systemctl start docker
systemctl enable docker

# ─── Install SonarQube Scanner ───────────────
echo ">>> Installing SonarQube Scanner..."
wget -q https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip \
  -O /tmp/sonar-scanner.zip
apt-get install -y unzip
unzip -q /tmp/sonar-scanner.zip -d /opt/
mv /opt/sonar-scanner-5.0.1.3006-linux /opt/sonar-scanner
ln -sf /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner
rm /tmp/sonar-scanner.zip

# ─── Print Jenkins initial password ──────────
echo "=========================================="
echo "  Jenkins installed successfully!"
echo "  URL     : http://192.168.56.10:8080"
echo "  Password: $(cat /var/lib/jenkins/secrets/initialAdminPassword 2>/dev/null || echo 'Not ready yet, run: sudo cat /var/lib/jenkins/secrets/initialAdminPassword')"
echo "=========================================="