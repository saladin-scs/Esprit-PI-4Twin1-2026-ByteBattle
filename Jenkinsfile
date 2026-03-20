pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 15, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Sanity') {
            steps {
                sh '''
                  set -eu
                  node -v
                  npm -v
                  git rev-parse HEAD
                '''
            }
        }
    }
}
