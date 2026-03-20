pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    parameters {
        choice(name: 'DEPLOY_ENV', choices: ['staging', 'production'], description: 'Deploy environment')
        string(name: 'IMAGE_TAG', defaultValue: '', description: 'Optional image tag override')
        booleanParam(name: 'RUN_SONAR', defaultValue: false, description: 'Run SonarQube analysis (needs SonarQube configured in Jenkins)')
        booleanParam(name: 'PUBLISH_IMAGES', defaultValue: false, description: 'Push to Docker Hub (enable for registry; off = local images only)')
        booleanParam(name: 'ROLLBACK', defaultValue: false, description: 'Rollback to PREVIOUS_TAG')
        string(name: 'PREVIOUS_TAG', defaultValue: 'latest', description: 'Rollback tag when ROLLBACK=true')
    }

    environment {
        REGISTRY = 'docker.io'
        DOCKERHUB_USER = credentials('dockerhub-username')
        BACKEND_REPO = "${REGISTRY}/${DOCKERHUB_USER}/bytebattle-backend"
        FRONTEND_REPO = "${REGISTRY}/${DOCKERHUB_USER}/bytebattle-frontend"
        EFFECTIVE_TAG = "${params.IMAGE_TAG ?: env.BUILD_NUMBER}"
        COMPOSE_FILE = 'docker-compose.prod.yml'
        COMPOSE_ENV = '.env.ci'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            parallel {
                stage('Backend deps') {
                    steps {
                        dir('backend') { sh 'npm ci' }
                    }
                }
                stage('Frontend deps') {
                    steps {
                        dir('frontend') { sh 'npm ci' }
                    }
                }
            }
        }

        stage('Lint and tests') {
            parallel {
                stage('Backend') {
                    steps {
                        dir('backend') {
                            sh 'npm run lint'
                            sh 'npm run test:ci'
                            sh 'npm run build'
                        }
                    }
                }
                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm run lint'
                            sh 'npm run test:ci'
                            sh 'npm run build'
                        }
                    }
                }
            }
        }

        stage('SonarQube') {
            when {
                expression { params.RUN_SONAR }
            }
            steps {
                withSonarQubeEnv('SonarQube') {
                    dir('backend') {
                        sh '''
                          npx sonar-scanner \
                            -Dsonar.projectKey=bytebattle-backend \
                            -Dsonar.sources=src \
                            -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**
                        '''
                    }
                    dir('frontend') {
                        sh '''
                          npx sonar-scanner \
                            -Dsonar.projectKey=bytebattle-frontend \
                            -Dsonar.sources=src \
                            -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**
                        '''
                    }
                }
            }
        }

        stage('Build and push images') {
            when {
                expression { !params.ROLLBACK }
            }
            steps {
                script {
                    if (params.PUBLISH_IMAGES) {
                        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DH_USER', passwordVariable: 'DH_TOKEN')]) {
                            sh '''
                              echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin
                              docker build -t ${BACKEND_REPO}:${EFFECTIVE_TAG} ./backend
                              docker build -t ${FRONTEND_REPO}:${EFFECTIVE_TAG} ./frontend
                              docker tag ${BACKEND_REPO}:${EFFECTIVE_TAG} ${BACKEND_REPO}:latest
                              docker tag ${FRONTEND_REPO}:${EFFECTIVE_TAG} ${FRONTEND_REPO}:latest
                              docker push ${BACKEND_REPO}:${EFFECTIVE_TAG}
                              docker push ${FRONTEND_REPO}:${EFFECTIVE_TAG}
                              docker push ${BACKEND_REPO}:latest
                              docker push ${FRONTEND_REPO}:latest
                            '''
                        }
                    } else {
                        sh """
                          docker build -t ${BACKEND_REPO}:${EFFECTIVE_TAG} ./backend
                          docker build -t ${FRONTEND_REPO}:${EFFECTIVE_TAG} ./frontend
                          docker tag ${BACKEND_REPO}:${EFFECTIVE_TAG} ${BACKEND_REPO}:latest
                          docker tag ${FRONTEND_REPO}:${EFFECTIVE_TAG} ${FRONTEND_REPO}:latest
                        """
                    }
                }
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                script {
                    def tagToDeploy = params.ROLLBACK ? params.PREVIOUS_TAG : env.EFFECTIVE_TAG
                    def pullFromRegistry = params.ROLLBACK || params.PUBLISH_IMAGES
                    sh """
                      cp ${COMPOSE_ENV}.example ${COMPOSE_ENV} || true
                      sed -i 's|IMAGE_TAG=.*|IMAGE_TAG=${tagToDeploy}|' ${COMPOSE_ENV}
                    """
                    if (pullFromRegistry) {
                        sh "docker compose --env-file ${COMPOSE_ENV} -f ${COMPOSE_FILE} pull"
                        sh "docker compose --env-file ${COMPOSE_ENV} -f ${COMPOSE_FILE} up -d"
                    } else {
                        sh "docker compose --env-file ${COMPOSE_ENV} -f ${COMPOSE_FILE} up -d --pull never"
                    }
                    sh "docker compose --env-file ${COMPOSE_ENV} -f ${COMPOSE_FILE} ps"
                }
            }
        }

        stage('Smoke tests') {
            steps {
                sh '''
                  curl -fsS http://localhost:3000/health || curl -fsS http://localhost:3000 || exit 1
                  curl -fsS http://localhost:5173 || exit 1
                '''
            }
        }
    }

    post {
        success {
            echo 'Pipeline succeeded'
        }
        failure {
            echo 'Pipeline failed'
        }
    }
}
