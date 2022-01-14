#### Pre-Requisites
* Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) & [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html).
* Create an EC2 instance to run the Spring Boot application
```bash
aws ec2 run-instances \
--image-id ami-002068ed284fb165b \
--count 1 \
--instance-type t2.micro \
--key-name <a valid AWS key pair to which you have access> \
--security-group-ids <a security group with SSH and TCP 8080 open from any ip> \
--associate-public-ip-address \
--user-data $(curl https://raw.githubusercontent.com/tjohander-splunk/aws-one-liners/main/user-data-scripts/spring-boot-app-server.sh | base64) \
--tag-specifications 'ResourceType=instance,Tags=[{Key=application,Value=Spring-Pet-Clinic}]'
```
* Fork and Clone the Spring Boot Pet Clinic [App and supporting AWS CodeDeploy files](https://github.com/tjohander-splunk/spring-petclinic)
