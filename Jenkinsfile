pipeline {
    agent any

    environment {
        DOCKER_COMPOSE_FILE = 'docker-compose.test.yml'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Run Tests') {
    steps {
        script {
            timeout(time: 10, unit: 'MINUTES') {
                withEnv(['COMPOSE_HTTP_TIMEOUT=300']) {
                    sh "docker-compose -f ${DOCKER_COMPOSE_FILE} up -d"
                }
                // Wait for backend to be ready
                sh "docker-compose -f ${DOCKER_COMPOSE_FILE} exec -T test-runner sh -c 'until nc -z backend 3000; do sleep 1; done'"
                // Run the tests
                sh "docker-compose -f ${DOCKER_COMPOSE_FILE} exec -T test-runner npm run test:e2e"
            }
        }
    }
}

        stage('Collect Results') {
            steps {
                sh "docker-compose -f ${DOCKER_COMPOSE_FILE} logs > test-logs.txt"
                archiveArtifacts artifacts: 'test-logs.txt', fingerprint: true
            }
        }
    }

    post {
        always {
            sh "docker-compose -f ${DOCKER_COMPOSE_FILE} down -v"
        }
        success {
            echo 'Tests passed'
        }
        failure {
            echo 'Tests failed'
        }
    }
}