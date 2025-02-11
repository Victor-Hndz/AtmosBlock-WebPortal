# tfm
Launch sonar container: docker run -d --name sonarqube -p 9000:9000 -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true sonarqube:lts-community
Pass: JadLRDT48RP96g8
Run sonar: sonar-scanner.bat -D"sonar.projectKey=FAST-IBAN" -D"sonar.sources=." -D"sonar.host.url=http://localhost:9000" -D"sonar.login=sqp_e610ce502dfed4e2fe5541eccc786f8cb20b619a"
