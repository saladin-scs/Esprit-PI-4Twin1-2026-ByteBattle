pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    parameters {
        choice(name: 'COMPONENT', choices: ['all', 'backend', 'frontend'], description: 'Component(s) to process')
        booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'Run test stages')
        booleanParam(name: 'RUN_SONAR', defaultValue: true, description: 'Run SonarQube analysis')
        booleanParam(name: 'BUILD_DOCKER', defaultValue: true, description: 'Build Docker images')
        booleanParam(name: 'PUSH_DOCKER', defaultValue: false, description: 'Push Docker images to registry')
        booleanParam(name: 'DEPLOY_K8S', defaultValue: false, description: 'Deploy Kubernetes manifests')
    }

    environment {
        REGISTRY = 'docker.io'
        BACKEND_IMAGE = 'registry/project-backend'
        FRONTEND_IMAGE = 'registry/project-frontend'
        K8S_NAMESPACE = 'bytebattle-devops'
        IMAGE_TAG = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : env.BUILD_NUMBER}"
    }

    tools {
        nodejs 'NodeJS-20'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.IMAGE_TAG = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
                    env.RUN_BACKEND = (params.COMPONENT == 'all' || params.COMPONENT == 'backend').toString()
                    env.RUN_FRONTEND = (params.COMPONENT == 'all' || params.COMPONENT == 'frontend').toString()
                }
            }
        }

        stage('Backend Install') {
            when {
                expression { env.RUN_BACKEND == 'true' }
            }
            steps {
                dir('backend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Backend Lint') {
            when {
                expression { env.RUN_BACKEND == 'true' }
            }
            steps {
                dir('backend') {
                    sh 'npm run lint:ci'
                }
            }
        }

        stage('Backend Test') {
            when {
                expression { env.RUN_BACKEND == 'true' && params.RUN_TESTS }
            }
            steps {
                dir('backend') {
                    sh 'npm run test:ci'
                }
            }
            post {
                always {
                    junit testResults: 'backend/coverage/junit.xml', allowEmptyResults: true
                    archiveArtifacts artifacts: 'backend/coverage/**', allowEmptyArchive: true
                }
            }
        }

        stage('Backend Build') {
            when {
                expression { env.RUN_BACKEND == 'true' }
            }
            steps {
                dir('backend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Frontend Install') {
            when {
                expression { env.RUN_FRONTEND == 'true' }
            }
            steps {
                dir('frontend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Frontend Lint') {
            when {
                expression { env.RUN_FRONTEND == 'true' }
            }
            steps {
                dir('frontend') {
                    sh 'npm run lint:ci'
                }
            }
        }

        stage('Frontend Test') {
            when {
                expression { env.RUN_FRONTEND == 'true' && params.RUN_TESTS }
            }
            steps {
                dir('frontend') {
                    sh 'npm run test:ci'
                }
            }
            post {
                always {
                    junit testResults: 'frontend/coverage/junit.xml', allowEmptyResults: true
                    archiveArtifacts artifacts: 'frontend/coverage/**', allowEmptyArchive: true
                }
            }
        }

        stage('Frontend Build') {
            when {
                expression { env.RUN_FRONTEND == 'true' }
            }
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('SonarQube Scan') {
            when {
                expression { params.RUN_SONAR }
            }
            steps {
                withSonarQubeEnv('SonarQube') {
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        script {
                            if (env.RUN_BACKEND == 'true') {
                                dir('backend') {
                                    sh 'npx sonar-scanner -Dproject.settings=sonar-project.properties -Dsonar.host.url=$SONAR_HOST_URL -Dsonar.token=$SONAR_TOKEN'
                                }
                            }
                            if (env.RUN_FRONTEND == 'true') {
                                dir('frontend') {
                                    sh 'npx sonar-scanner -Dproject.settings=sonar-project.properties -Dsonar.host.url=$SONAR_HOST_URL -Dsonar.token=$SONAR_TOKEN'
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Quality Gate') {
            when {
                expression { params.RUN_SONAR }
            }
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Build') {
            when {
                expression { params.BUILD_DOCKER }
            }
            steps {
                script {
                    if (env.RUN_BACKEND == 'true') {
                        sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} backend"
                    }
                    if (env.RUN_FRONTEND == 'true') {
                        sh "docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} frontend"
                    }
                }
            }
        }

        stage('Docker Push') {
            when {
                expression { params.BUILD_DOCKER && params.PUSH_DOCKER }
            }
            steps {
                withCredentials([
                    string(credentialsId: 'dockerhub-username', variable: 'DOCKERHUB_USERNAME'),
                    string(credentialsId: 'dockerhub-token', variable: 'DOCKERHUB_TOKEN')
                ]) {
                    sh 'echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin'
                    script {
                        if (env.RUN_BACKEND == 'true') {
                            sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
                        }
                        if (env.RUN_FRONTEND == 'true') {
                            sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                        }
                    }
                }
            }
        }

        stage('Kubernetes Deploy') {
            when {
                expression { params.DEPLOY_K8S }
            }
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                    sh 'mkdir -p $HOME/.kube && cp "$KUBECONFIG_FILE" $HOME/.kube/config'
                    sh "kubectl apply -f k8s/namespace.yaml"
                    sh "kubectl apply -f k8s/configmap.yaml"
                    sh "kubectl apply -f k8s/secret.template.yaml"
                    sh "kubectl apply -f k8s/mongodb.yaml"
                    sh "kubectl apply -f k8s/redis.yaml"
                    sh "kubectl apply -f k8s/rabbitmq.yaml"
                    sh "kubectl apply -f k8s/backend.yaml"
                    sh "kubectl apply -f k8s/frontend.yaml"
                    sh "kubectl apply -f k8s/ingress.yaml"
                    sh "kubectl apply -f k8s/hpa.yaml"
                    sh "kubectl apply -k k8s/monitoring"
                    sh "kubectl -n ${K8S_NAMESPACE} set image deployment/backend backend=${BACKEND_IMAGE}:${IMAGE_TAG} || true"
                    sh "kubectl -n ${K8S_NAMESPACE} set image deployment/frontend frontend=${FRONTEND_IMAGE}:${IMAGE_TAG} || true"
                    sh "kubectl -n ${K8S_NAMESPACE} rollout status deployment/backend --timeout=180s"
                    sh "kubectl -n ${K8S_NAMESPACE} rollout status deployment/frontend --timeout=180s"
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
