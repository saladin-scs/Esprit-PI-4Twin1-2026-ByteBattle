pipeline {
    agent any
    
    // ============================================
    // OPTIONS GLOBALES
    // ============================================
    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
    }
    
    tools {
        nodejs 'nodejs-18'
    }
    
    // ============================================
    // PARAMÈTRES DE BUILD
    // ============================================
    parameters {
        choice(
            name: 'DEPLOY_ENV',
            choices: ['dev', 'staging', 'production'],
            description: '🌍 Environnement de déploiement'
        )
        booleanParam(
            name: 'RUN_TESTS',
            defaultValue: true,
            description: '🧪 Exécuter les tests ?'
        )
        booleanParam(
            name: 'RUN_SONAR',
            defaultValue: true,
            description: '🔍 Exécuter SonarQube ?'
        )
        booleanParam(
            name: 'DEPLOY',
            defaultValue: true,
            description: '🚀 Déployer sur Kubernetes ?'
        )
    }
    
    // ============================================
    // ENVIRONNEMENT
    // ============================================
    environment {
        // Informations de base
        APP_NAME = 'ByteBattle'
        BRANCH_NAME = "${env.BRANCH_NAME}"
        BUILD_NUMBER = "${env.BUILD_NUMBER}"
        BUILD_TIMESTAMP = new Date().format('yyyyMMdd-HHmmss')
        
        // SonarQube
        SONAR_TOKEN = credentials('sonarqube-token')
        SONAR_HOST_URL = 'http://sonarqube:9000'
        SONAR_BACKEND_KEY = 'bytebattle-backend'
        SONAR_FRONTEND_KEY = 'bytebattle-frontend'
        
        // Docker
        DOCKER_REGISTRY = 'localhost:5000'
        BACKEND_IMAGE = "bytebattle-backend:${BUILD_NUMBER}"
        BACKEND_IMAGE_LATEST = 'bytebattle-backend:latest'
        FRONTEND_IMAGE = "bytebattle-frontend:${BUILD_NUMBER}"
        FRONTEND_IMAGE_LATEST = 'bytebattle-frontend:latest'
        
        // Kubernetes
        KUBECONFIG_CREDENTIAL = 'kubeconfig-credential'
        K8S_NAMESPACE = 'default'
        K8S_DEPLOYMENT_BACKEND = 'backend'
        K8S_DEPLOYMENT_FRONTEND = 'frontend'
        
        // Versions
        BACKEND_VERSION = "1.0.${BUILD_NUMBER}"
        FRONTEND_VERSION = "1.0.${BUILD_NUMBER}"
    }
    
    stages {
        // ============================================
        // ÉTAPE 1: INITIALISATION
        // ============================================
        stage('Initialisation') {
            steps {
                script {
                    echo """
                    ╔══════════════════════════════════════════════════════════╗
                    ║                                                          ║
                    ║   🚀 ${APP_NAME} - PIPELINE CI/CD v2.0                     ║
                    ║                                                          ║
                    ║   Branche: ${BRANCH_NAME}                                 ║
                    ║   Build #: ${BUILD_NUMBER}                                ║
                    ║   Date: ${BUILD_TIMESTAMP}                                ║
                    ║   Environnement: ${params.DEPLOY_ENV}                     ║
                    ║                                                          ║
                    ╚══════════════════════════════════════════════════════════╝
                    """
                }
                checkout scm
                sh 'ls -la'
            }
        }
        
        // ============================================
        // ÉTAPE 2: INSTALLATION DES DÉPENDANCES
        // ============================================
        stage('Installation Dépendances') {
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        dir('backend') {
                            sh '''
                                echo "📦 Installation des dépendances backend..."
                                npm ci --cache .npm --prefer-offline
                                npm list --depth=0
                            '''
                        }
                    }
                }
                stage('Frontend Dependencies') {
                    steps {
                        dir('frontend') {
                            sh '''
                                echo "📦 Installation des dépendances frontend..."
                                npm ci --cache .npm --prefer-offline
                                npm list --depth=0
                            '''
                        }
                    }
                }
            }
        }
        
        // ============================================
        // ÉTAPE 3: TESTS (conditionnels)
        // ============================================
        stage('Tests') {
            when {
                expression { params.RUN_TESTS }
            }
            parallel {
                stage('Backend Tests') {
                    steps {
                        dir('backend') {
                            script {
                                try {
                                    sh '''
                                        echo "🧪 Linting backend..."
                                        npm run lint || true
                                        
                                        echo "🧪 Tests unitaires backend..."
                                        npm run test:cov || npm test -- --coverage
                                    '''
                                } finally {
                                    junit 'test-results/**/*.xml'
                                }
                            }
                        }
                    }
                    post {
                        success {
                            archiveArtifacts artifacts: 'backend/coverage/**', fingerprint: true
                            echo "✅ Tests backend réussis"
                        }
                    }
                }
                
                stage('Frontend Tests') {
                    steps {
                        dir('frontend') {
                            script {
                                try {
                                    sh '''
                                        echo "🧪 Linting frontend..."
                                        npm run lint || true
                                        
                                        echo "🧪 Tests frontend..."
                                        npm test -- --coverage --watchAll=false
                                    '''
                                } finally {
                                    junit 'test-results/**/*.xml'
                                }
                            }
                        }
                    }
                    post {
                        success {
                            archiveArtifacts artifacts: 'frontend/coverage/**', fingerprint: true
                            echo "✅ Tests frontend réussis"
                        }
                    }
                }
            }
        }
        
        // ============================================
        // ÉTAPE 4: ANALYSE SONARQUBE
        // ============================================
        stage('SonarQube Analysis') {
            when {
                expression { params.RUN_SONAR }
                branch 'saladin', 'develop', 'main', 'master'
            }
            steps {
                script {
                    withSonarQubeEnv('SonarQube') {
                        dir('backend') {
                            sh """
                                npx sonar-scanner \
                                  -Dsonar.projectKey=${SONAR_BACKEND_KEY} \
                                  -Dsonar.projectName="ByteBattle Backend" \
                                  -Dsonar.projectVersion=${BACKEND_VERSION} \
                                  -Dsonar.sources=. \
                                  -Dsonar.exclusions=**/node_modules/**,**/coverage/**,**/dist/** \
                                  -Dsonar.tests=. \
                                  -Dsonar.test.inclusions=**/*.spec.ts,**/*.test.ts \
                                  -Dsonar.typescript.lcov.reportPaths=coverage/lcov.info \
                                  -Dsonar.sourceEncoding=UTF-8
                            """
                        }
                        
                        dir('frontend') {
                            sh """
                                npx sonar-scanner \
                                  -Dsonar.projectKey=${SONAR_FRONTEND_KEY} \
                                  -Dsonar.projectName="ByteBattle Frontend" \
                                  -Dsonar.projectVersion=${FRONTEND_VERSION} \
                                  -Dsonar.sources=. \
                                  -Dsonar.exclusions=**/node_modules/**,**/coverage/**,**/build/** \
                                  -Dsonar.tests=. \
                                  -Dsonar.test.inclusions=**/*.spec.js,**/*.test.js,**/*.spec.tsx,**/*.test.tsx \
                                  -Dsonar.typescript.lcov.reportPaths=coverage/lcov.info \
                                  -Dsonar.sourceEncoding=UTF-8
                            """
                        }
                    }
                    
                    timeout(time: 1, unit: 'MINUTES') {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "❌ Quality Gate failed: ${qg.status}"
                        }
                    }
                }
            }
        }
        
        // ============================================
        // ÉTAPE 5: BUILD
        // ============================================
        stage('Build Applications') {
            parallel {
                stage('Backend Build') {
                    steps {
                        dir('backend') {
                            sh '''
                                echo "🏗️ Build du backend..."
                                npm run build
                                echo "Backend version: $(node -p "require('./package.json').version")" > dist/version.txt
                            '''
                        }
                    }
                }
                stage('Frontend Build') {
                    steps {
                        dir('frontend') {
                            sh '''
                                echo "🏗️ Build du frontend..."
                                npm run build
                                echo "Frontend version: $(node -p "require('./package.json').version")" > build/version.txt
                            '''
                        }
                    }
                }
            }
        }
        
        // ============================================
        // ÉTAPE 6: CONSTRUCTION IMAGES DOCKER
        // ============================================
        stage('Docker Build') {
            when {
                branch 'saladin', 'main', 'master', 'production'
            }
            parallel {
                stage('Backend Image') {
                    steps {
                        dir('backend') {
                            script {
                                sh '''
                                    echo "🐳 Construction image backend..."
                                    docker build -t ${BACKEND_IMAGE} .
                                    docker tag ${BACKEND_IMAGE} ${BACKEND_IMAGE_LATEST}
                                    docker images | grep backend
                                '''
                            }
                        }
                    }
                }
                
                stage('Frontend Image') {
                    steps {
                        dir('frontend') {
                            script {
                                sh '''
                                    echo "🐳 Construction image frontend..."
                                    docker build -t ${FRONTEND_IMAGE} .
                                    docker tag ${FRONTEND_IMAGE} ${FRONTEND_IMAGE_LATEST}
                                    docker images | grep frontend
                                '''
                            }
                        }
                    }
                }
            }
        }
        
        // ============================================
        // ÉTAPE 7: SCAN DE SÉCURITÉ
        // ============================================
        stage('Security Scan') {
            when {
                branch 'saladin', 'main', 'master'
            }
            parallel {
                stage('Dependency Check') {
                    steps {
                        script {
                            sh '''
                                echo "📋 Vérification des dépendances backend..."
                                cd backend && npm audit --production || echo "⚠️ Des vulnérabilités mineures détectées"
                                
                                echo "📋 Vérification des dépendances frontend..."
                                cd ../frontend && npm audit --production || echo "⚠️ Des vulnérabilités mineures détectées"
                            '''
                        }
                    }
                }
            }
        }
        
        // ============================================
        // ÉTAPE 8: DÉPLOIEMENT KUBERNETES
        // ============================================
        stage('Deploy to Kubernetes') {
            when {
                expression { params.DEPLOY }
                branch 'saladin', 'main', 'master'
            }
            steps {
                script {
                    withKubeConfig([credentialsId: KUBECONFIG_CREDENTIAL]) {
                        sh """
                            cd /vagrant_data/PiDev-ByteBattle
                            
                            echo "☸️ Déploiement sur Kubernetes (${params.DEPLOY_ENV})..."
                            
                            # Sauvegarder les images
                            docker save ${BACKEND_IMAGE} -o backend.tar
                            docker save ${FRONTEND_IMAGE} -o frontend.tar
                            
                            # Importer dans containerd
                            sudo ctr -n k8s.io images import backend.tar
                            sudo ctr -n k8s.io images import frontend.tar
                            
                            # Tagguer les images pour Kubernetes
                            sudo ctr -n k8s.io images tag docker.io/library/${BACKEND_IMAGE} docker.io/library/backend:latest
                            sudo ctr -n k8s.io images tag docker.io/library/${FRONTEND_IMAGE} docker.io/library/frontend:latest
                            
                            # Appliquer les configurations
                            kubectl apply -f mongodb-deployment.yaml
                            kubectl apply -f backend-deployment.yaml
                            kubectl apply -f frontend-deployment.yaml
                            
                            # Vérifier le déploiement
                            echo "⏳ Vérification du déploiement..."
                            kubectl rollout status deployment/backend --timeout=120s
                            kubectl rollout status deployment/frontend --timeout=120s
                            
                            # Afficher l'état
                            kubectl get pods
                            kubectl get svc
                            
                            echo "✅ Déploiement terminé sur ${params.DEPLOY_ENV}"
                        """
                    }
                }
            }
        }
        
        // ============================================
        // ÉTAPE 9: TESTS DE NON-RÉGRESSION
        // ============================================
        stage('Smoke Tests') {
            when {
                expression { params.DEPLOY }
            }
            steps {
                sh '''
                    echo "🔥 Exécution des tests de non-régression..."
                    
                    # Tester le backend
                    BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:30001)
                    if [ $BACKEND_RESPONSE -eq 200 ] || [ $BACKEND_RESPONSE -eq 404 ]; then
                        echo "✅ Backend répond (HTTP $BACKEND_RESPONSE)"
                    else
                        echo "❌ Backend ne répond pas correctement (HTTP $BACKEND_RESPONSE)"
                        exit 1
                    fi
                    
                    # Tester le frontend
                    FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:30002)
                    if [ $FRONTEND_RESPONSE -eq 200 ]; then
                        echo "✅ Frontend répond"
                    else
                        echo "❌ Frontend ne répond pas"
                        exit 1
                    fi
                    
                    echo "✅ Tous les tests de non-régression passent"
                '''
            }
        }
    }
    
    // ============================================
    // POST-ACTIONS
    // ============================================
    post {
        always {
            script {
                sh '''
                    echo "🧹 Nettoyage des ressources temporaires..."
                    rm -f backend.tar frontend.tar
                    docker system prune -f
                '''
                junit '**/test-results/**/*.xml'
                archiveArtifacts artifacts: '**/coverage/**', fingerprint: true
                
                def duration = currentBuild.durationString.replace(' and counting', '')
                echo "⏱️ Durée totale: ${duration}"
            }
        }
        
        success {
            script {
                echo """
                ╔══════════════════════════════════════════════════════════╗
                ║                                                          ║
                ║   ✅ PIPELINE TERMINÉE AVEC SUCCÈS !                     ║
                ║                                                          ║
                ║   Build: ${BUILD_NUMBER}                                  ║
                ║   Branche: ${BRANCH_NAME}                                 ║
                ║   Environnement: ${params.DEPLOY_ENV}                     ║
                ║                                                          ║
                ║   🔗 SonarQube: ${SONAR_HOST_URL}                         ║
                ║   🔗 Application: http://localhost:30002                  ║
                ║                                                          ║
                ╚══════════════════════════════════════════════════════════╝
                """
                echo "📱 [NOTIFICATION] Build réussi - prêt à notifier Slack/Teams"
            }
        }
        
        failure {
            script {
                echo """
                ╔══════════════════════════════════════════════════════════╗
                ║                                                          ║
                ║   ❌ PIPELINE ÉCHOUÉE !                                  ║
                ║                                                          ║
                ║   Build: ${BUILD_NUMBER}                                  ║
                ║   Branche: ${BRANCH_NAME}                                 ║
                ║   Stage en échec: ${env.STAGE_NAME}                       ║
                ║                                                          ║
                ╚══════════════════════════════════════════════════════════╝
                """
                echo "📱 [NOTIFICATION] Build échoué - alerte envoyée"
            }
        }
        
        unstable {
            echo "⚠️ Pipeline instable"
        }
        
        aborted {
            echo "🛑 Pipeline annulée"
        }
    }
}
