#!/bin/bash
set -e

echo "=========================================="
echo "  Installing SonarQube on Ubuntu 22.04"
echo "=========================================="

# ─── Update system ───────────────────────────
apt-get update -y
apt-get upgrade -y

# ─── System requirements ─────────────────────
echo ">>> Configuring system requirements..."
sysctl -w vm.max_map_count=524288
sysctl -w fs.file-max=131072
ulimit -n 131072
ulimit -u 8192

# Make permanent
cat >> /etc/sysctl.conf << 'SYSCTL'
vm.max_map_count=524288
fs.file-max=131072
SYSCTL

cat >> /etc/security/limits.conf << 'LIMITS'
sonarqube   -   nofile   131072
sonarqube   -   nproc    8192
LIMITS

# ─── Install Java 17 ─────────────────────────
echo ">>> Installing Java 17..."
apt-get install -y openjdk-17-jdk
java -version

# ─── Install PostgreSQL ──────────────────────
echo ">>> Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

systemctl start postgresql
systemctl enable postgresql

# Create sonarqube database and user
sudo -u postgres psql << 'PSQL'
CREATE USER sonarqube WITH PASSWORD 'sonarqube123';
CREATE DATABASE sonarqube OWNER sonarqube;
GRANT ALL PRIVILEGES ON DATABASE sonarqube TO sonarqube;
PSQL

# ─── Download SonarQube ──────────────────────
echo ">>> Downloading SonarQube..."
wget -q https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-10.3.0.82913.zip \
  -O /tmp/sonarqube.zip

apt-get install -y unzip
unzip -q /tmp/sonarqube.zip -d /opt/
mv /opt/sonarqube-10.3.0.82913 /opt/sonarqube
rm /tmp/sonarqube.zip

# ─── Create sonarqube user ───────────────────
useradd -r -s /bin/false sonarqube 2>/dev/null || true
chown -R sonarqube:sonarqube /opt/sonarqube

# ─── Configure SonarQube ─────────────────────
cat > /opt/sonarqube/conf/sonar.properties << 'CONF'
sonar.jdbc.username=sonarqube
sonar.jdbc.password=sonarqube123
sonar.jdbc.url=jdbc:postgresql://localhost/sonarqube
sonar.web.host=0.0.0.0
sonar.web.port=9000
sonar.search.javaOpts=-Xmx512m -Xms512m
sonar.ce.javaOpts=-Xmx512m -Xms512m
sonar.web.javaOpts=-Xmx512m -Xms512m
CONF

# ─── Create systemd service ──────────────────
cat > /etc/systemd/system/sonarqube.service << 'SERVICE'
[Unit]
Description=SonarQube service
After=syslog.target network.target postgresql.service

[Service]
Type=forking
ExecStart=/opt/sonarqube/bin/linux-x86-64/sonar.sh start
ExecStop=/opt/sonarqube/bin/linux-x86-64/sonar.sh stop
User=sonarqube
Group=sonarqube
Restart=always
LimitNOFILE=131072
LimitNPROC=8192

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl start sonarqube
systemctl enable sonarqube

echo "=========================================="
echo "  SonarQube installed successfully!"
echo "  URL     : http://192.168.56.20:9000"
echo "  Login   : admin"
echo "  Password: admin"
echo "  (change password on first login)"
echo "=========================================="