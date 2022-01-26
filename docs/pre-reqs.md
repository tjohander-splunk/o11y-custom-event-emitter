# Pre-Requisites

## AWS & SAM CLI
- [ ] Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) & [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html).
- [ ] Configure the AWS CLI with the credentials for an AWS account to which you have access:
```bash
aws --configure
```
Details on installation and configuration for the AWS CLI can be found [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html).  Similar details for the SAM CLI can be found [here](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html).

## Create a Connection Between Github and AWS
- [ ] This step requires some manual intervention to approve a connection once you create it with the following command:
```bash
aws codestar-connections create-connection \
    --provider-type Github \
    --connection-name <some-artbitrary-value>
```

When this is done, the connection is in a pending state and there is another step.  Log into the AWS console and update the connection state from "Pending" to "Active". Details are [here](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-update.html). You must use the console to update a pending connection. You cannot update a pending connection using the AWS CLI.

Note the `ARN` of this resource once it's created.  You'll need it in a subsequent step.
This connection is used in building the CI/CD pipeline but it's an account-level object and you can re-use this for anything else in AWS you'd like.  It's like a parting gift of this demo.

## Generate or Locate an EC2 SSH Keypair

- [ ] Create an SSH KeyPair to connect to an EC2 Instance if you don't already have one.
```bash
aws ec2 create-key-pair \
    --key-name my-key-pair \
    --key-type rsa \
    --query "KeyMaterial" \
    --output text > my-key-pair.pem
```
Whether you created one or have a pre-existing key you use to connect to EC2 instances, **note the `key-name` of the key.** You'll need to initialize the Cloudformation stack.

## Find a Suitable Observability Cloud Environment
- [ ] Locate an Observability Cloud environment to which you will deploy custom CI/CD events.  **Note the `realm` and `Access Token`.**

## Fork and Clone the Sample Application

- [ ] Fork and clone the repository at `https://github.com/tjohander-splunk/spring-petclinic`.
  If you are familiar with Git, this should be quite easy.  If you've never forked or cloned a repository, detailed instructions can be found [here](https://docs.github.com/en/get-started/quickstart/fork-a-repo#forking-a-repository)
```bash
git clone <your-fork-repo-url>
```
For the purposes of this demo we will use [this](https://github.com/tjohander-splunk/spring-petclinic) Java/Spring Boot application.
The actual application code is unchanged from the classic Spring authored application, but does include some additional files that AWS CodePipeline needs for this CI/CD workflow to execute properly. **Note your Github `org` and `repository` values.  They will be needed in a subsequent step.**


* Create an instance role for the EC2 app server to allow it to receive CodeDeploy deployments. 
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
