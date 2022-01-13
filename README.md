# Custom Observability Event Emitter for AWS Codepipeline CI/CD 

## Overview
This AWS Lambda function is designed to ingest AWS Codepipeline Events published to an AWS SNS (Simple Notification Service) topic and POST them to Splunk Observability Cloud.

The basic workflow includes these stages:
1. A connection is configured between a Github repository & AWS Codepipeline.
2. When changes on a watched branch are committed to Github, AWS Codepipeline takes over to pull the source code.  A notification of this event is published to the SNS Topic
3. The Lambda function has a subscription to the notification topic and is invoked with the payload of the message as the function's input.
4. The function creates a simple POST payload that's sent to the Observability Ingest API.  The payload is designed to carry some details about the Codepipeline event that invoked the function.
5. At each subsequent stage in the Codepipeline process, the same process repeats itself. 
6. Once these events are POSTed to Observability Cloud, they can be added as event overlays on various Charts and Dashboard elements, as well as represented as Table or Counter charts.  The possibilities are endless :smile:

### Implementing The Workflow
For the purposes of a proof-of-concept, it would be sufficient to have a simple pipeline that includes three stages to a CI/CD workflow:
* Source
* Build
* Deploy

Configuring this Codepipeline workflow isn't trivial but can be accomplished in the AWS Console with these steps:

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

### Step 1: Create a New Pipeline

In the AWS Console, head to the CodePipeline service and click "Create Pipeline".  The role name that AWS creates on your behalf will include the name you give to the pipeline.  

![image](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/1-Codepipeline-Settings.png?raw=true)

Click "Next"


#### Step 2: Connect Github to your AWS Account
This only needs to be done once.  The result is an AWS resource that is not directly tied to this demo.

* Select Github (Version 2) as your Source Provider
* Click "Connect to Github"
* You'll be prompted to create a Connection Name:
  ![connection-example-1](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/2c-github-connection-popup.png?raw=true)
* Then you'll be asked to sign in to Github:
  ![github-login](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/2d-sign-in-to-github.png?raw=true)
* The Github Connection should be created and its ARN added to the Source configuration. Complete the fields for the Github repository and branch you want this pipeline to watch:
  ![source-settings](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/2-Source-Stage-Settings.png?raw=true)


#### 3: Setup the Pipeline's "Build" Stage
This stage will receive the application source code and execute the steps needed to build the application: download dependencies, compile the source code, 
run any unit & integration tests and any other tasks needed to convert the source code into a runnable application that can be deployed to an application 
server or other runtime environment.
* For the Build Provider, select "AWS CodeBuild" and select the region in which you want this build to be executed
* Click "Create Build Project".  You'll be presented with a popup to configure a new Build project.

Apply settings similar to the following:
![project-config](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/3-Build-Stage-ProjectConfiguration-Settings.png?raw=true)
![source-config](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/4-Build-Stage-Source-Configuration-Settings.png?raw=true)
![environment-config](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/5-Build-Stage-Environment-Configuration-Settings.png?raw=true)
![buildspec-config](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/6-Build-Stage-Buildspec-Configuration-Settings.png?raw=true)
##### Note on Cache Settings
This may not be necessary if you choose to build and deploy an application other than Spring Pet Clinic, a Spring Boot / Java project with many dependencies.  Each time the build process is executed, the build environment re-downloads all these dependencies.  This can take over 5 minutes and can get tedious while iterating or demoing the solution. The screenshots reflect the necessary configuration to cache these dependencies in an S3 bucket, thus greatly speeding up the time needed to build this particular application.
![artifact-config](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/7-Build-Stage-Artifact-Configuation-Settings.png?raw=true)
* Once a build project is either created or an existing build project is selected, the Build stage configuration should look similar to this:
![build-stage-config](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/3aa-Build-Stage-Completed-State.png?raw=true)


#### Step 4: Setup the Pipeline's "Deploy" Stage
This step will take the application artifact created in the previous step and deploy it to an EC2 instance. In order to complete the configuration for this stage, we must first create a CodeDeploy Application resource and a Deployment Group for that application. 

* In AWS CodeDeploy, go the "Applications" interface

  ![codedeploy-side-nav](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/8b-code-deploy-side-nav.png?raw=true)

* Select "Create New Application"
* Fill in the fields to create an application:
![application-config](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/8c-code-deploy-application.png?raw=true)
* Create a Deployment Group as the deployment target. In this case, we'll deploy the application executable to any EC2 instances that match the tags we specify in the Environment Configuration section. You'll know you've got things lined up correctly when the UI reports that it matched an instance:

  ![deployment-group-config](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/8d-code-deploy-deployment-group.png?raw=true)

* Once this is all created, the fields in the Deploy stage should auto-populate with valid options for each field similar to the screenshot below:

  ![completed-deploy-stage](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/8e-completed-deploy-stage.png?raw=true)

* After the Source, Build and Deploy stages are complete you should be presented with a final review and an option to "Create Pipeline":

  ![codepipeline-review](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/11-Pipeline-Config-Review.png?raw=true)

Create the pipeline and move on to the next step.

#### Step 5: Create SNS Topic
This step will create the SNS (Simple Notification Service) topic that to which the Lambda function will subscribe.

* Head over to the AWS SNS UI, select "Topics" and click the "Create New Topic" button.  Create a topic with these values:

  ![codepipeline-review](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/9-SNS-Topic-Settings.png?raw=true)
Note the ARN of this topic.  It will be needed in the next step.

#### Step 7: Update the Lambda definition to trigger on receipt of a notification on the SNS topic
* In the `template.yaml` file located in the root of this project, fill in the topic ARN here:
  ```yaml
  Resources:
    O11yEventEmitterFunction:
      Type: AWS::Serverless::Function # More info about Function Resource: https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction
      Properties:
        CodeUri: o11y-event-emitter/
        Handler: app.lambdaHandler
        Runtime: nodejs12.x
        Architectures:
          - x86_64
        Events:
          HelloWorld:
            Type: SNS
            Properties:
              Topic: <insert-arn-here> 
  ```
#### Step 8: Create Notification Rule For The CodePipeline
Now that we have a topic created, configure the pipeline to send notifications of various events to the SNS topic.

* In the main pipeline UI, select "Notifiy", then "Create Notification Rule".  Fill on values to reflect a configuration like this:

  ![codepipeline-review](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/10-Pipeline-Notification-Rule.png?raw=true)

The SNS topic should auto-populate as an option in the "Choose target" field.

That's it! The pipeline is complete.  Now we will need to deploy our Lambda function and then test everything out by pushing a small change to the application to kick off the pipeline.

#### Step 9: Deploy the Lambda function with the SAM CLI
* From a terminal instance with the SAM CLI installed and configured, execute the following commands:
   ```bash
   sam build
   ```
   ```bash
   sam deploy --guided --parameter-overrides Realm=<o11y cloud realm> AccessToken=<o11y cloud access token> 
   ```

#### Step 10: Push a small change to the source application code to trigger a pipeline execution
Any change to the source code in the repository will trigger a change.  You can even just edit the README.md file in the root of the project.  It's nice to show an acutal change to the application, so maybe editing the welcome message that's presented to users on the landing page of the web app is something we want to do.

It's easy to make the change, simply open the file located at `src/main/resources/messages/messages.properties`
and edit the `welcome` message.  This text is immediately visible on the landing page and demonstrates that the application code has indeed changed and been deployed to a functional runtime environment.

Once you edit the file execute standard `git` commands to push your change to Github:

```bash
git add .
git commit -m "Updated the welcome message"
git push
```

#### Step 11: Validate you have custom events in O11y Cloud
Once the pipeline completes successfully, you should be able to search O11y for your custom events.  To do so, open up a Dashboard and look for matching events in the `Event Overlay` field or in the Event Finder panel.  Once your events are located you can set them as overlays, create a Table chart showing a list of events, etc...

 ![codepipeline-review](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/11a-o11y-cloud-events-overlay.png?raw=true)

## Optional Reading: Serverless Application Model (SAM) Technical Data
This project contains source code and supporting files for a serverless application that you can deploy with the SAM CLI. It includes the following files and folders.

- o11y-event-emitter - Code for the application's Lambda function.
- events - Invocation events that you can use to invoke the function.
- o11y-event-emitter/tests - Unit tests for the application code. 
- template.yaml - A template that defines the application's AWS resources.

The application uses several AWS resources, including Lambda functions and an API Gateway API. These resources are defined in the `template.yaml` file in this project. You can update the template to add AWS resources through the same deployment process that updates your application code.

If you prefer to use an integrated development environment (IDE) to build and test your application, you can use the AWS Toolkit.  
The AWS Toolkit is an open source plug-in for popular IDEs that uses the SAM CLI to build and deploy serverless applications on AWS. The AWS Toolkit also adds a simplified step-through debugging experience for Lambda function code. See the following links to get started.

* [CLion](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
* [GoLand](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
* [IntelliJ](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
* [WebStorm](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
* [Rider](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
* [PhpStorm](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
* [PyCharm](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
* [RubyMine](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
* [DataGrip](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
* [VS Code](https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/welcome.html)
* [Visual Studio](https://docs.aws.amazon.com/toolkit-for-visual-studio/latest/user-guide/welcome.html)

### Further Details on Deploying the SAM Application

The Serverless Application Model Command Line Interface (SAM CLI) is an extension of the AWS CLI that adds functionality for building and testing Lambda applications. It uses Docker to run your functions in an Amazon Linux environment that matches Lambda. It can also emulate your application's build environment and API.

To use the SAM CLI, you need the following tools.

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Node.js - [Install Node.js 10](https://nodejs.org/en/), including the NPM package management tool.
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

To build and deploy your application for the first time, run the following in your shell:

```bash
sam build
sam deploy --guided --parameter-overrides Realm=<o11y cloud realm> AccessToken=<o11y cloud access token> 
```

The first command will build the source of your application. The second command will package and deploy your application to AWS, with a series of prompts and supply secrets as environment variables

* **Stack Name**: The name of the stack to deploy to CloudFormation. This should be unique to your account and region, and a good starting point would be something matching your project name.
* **AWS Region**: The AWS region you want to deploy your app to.
* **Confirm changes before deploy**: If set to yes, any change sets will be shown to you before execution for manual review. If set to no, the AWS SAM CLI will automatically deploy application changes.
* **Allow SAM CLI IAM role creation**: Many AWS SAM templates, including this example, create AWS IAM roles required for the AWS Lambda function(s) included to access AWS services. By default, these are scoped down to minimum required permissions. To deploy an AWS CloudFormation stack which creates or modifies IAM roles, the `CAPABILITY_IAM` value for `capabilities` must be provided. If permission isn't provided through this prompt, to deploy this example you must explicitly pass `--capabilities CAPABILITY_IAM` to the `sam deploy` command.
* **Save arguments to samconfig.toml**: If set to yes, your choices will be saved to a configuration file inside the project, so that in the future you can just re-run `sam deploy` without parameters to deploy changes to your application.

#### `--parameter-overrides`
This mechanism applies your specific O11y Cloud Access Token to the Lambda when it's deployed with AWS.  These values are required for the Lambda function to successfully POST events to O11y Cloud

### Use the SAM CLI to build and test locally

Build your application with the `sam build` command.

```bash
o11y-custom-event-emitter-lambda$ sam build
```

The SAM CLI installs dependencies defined in `o11y-custom-event-emitter-lambda/package.json`, creates a deployment package, and saves it in the `.aws-sam/build` folder.

Test a single function by invoking it directly with a test event. An event is a JSON document that represents the input that the function receives from the event source. Test events are included in the `events` folder in this project.

Run functions locally and invoke them with the `sam local invoke` command.

```bash
o11y-custom-event-emitter-lambda$ sam local invoke O11yEventEmitterFunction --event events/codepipline-event.json
```

The SAM CLI can also emulate your application's API. Use the `sam local start-api` to run the API locally on port 3000.

```bash
o11y-custom-event-emitter-lambda$ sam local start-api
o11y-custom-event-emitter-lambda$ curl http://localhost:3000/
```

The SAM CLI reads the application template to determine the API's routes and the functions that they invoke. The `Events` property on each function's definition includes the route and method for each path.

```yaml
      Events:
        HelloWorld:
          Type: Api
          Properties:
            Path: /hello
            Method: get
```

### Add a resource to your application
The application template uses AWS Serverless Application Model (AWS SAM) to define application resources. AWS SAM is an extension of AWS CloudFormation with a simpler syntax for configuring common serverless application resources such as functions, triggers, and APIs. For resources not included in [the SAM specification](https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md), you can use standard [AWS CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html) resource types.

### Fetch, tail, and filter Lambda function logs

To simplify troubleshooting, SAM CLI has a command called `sam logs`. `sam logs` lets you fetch logs generated by your deployed Lambda function from the command line. In addition to printing the logs on the terminal, this command has several nifty features to help you quickly find the bug.

`NOTE`: This command works for all AWS Lambda functions; not just the ones you deploy using SAM.

```bash
o11y-custom-event-emitter-lambda$ sam logs -n O11yEventEmitterFunction --stack-name o11y-custom-event-emitter-lambda --tail
```

You can find more information and examples about filtering Lambda function logs in the [SAM CLI Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-logging.html).

### Unit tests

Tests are defined in the `hello-world/tests` folder in this project. Use NPM to install the [Mocha test framework](https://mochajs.org/) and run unit tests.

```bash
o11y-custom-event-emitter-lambda$ cd o11y-event-emitter
o11y-event-emitter$ npm install
o11y-event-emitter$ npm run test
```

### Cleanup

To delete the sample application that you created, use the AWS CLI. Assuming you used your project name for the stack name, you can run the following:

```bash
aws cloudformation delete-stack --stack-name o11y-custom-event-emitter-lambda
```

### Resources

See the [AWS SAM developer guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) for an introduction to SAM specification, the SAM CLI, and serverless application concepts.

Next, you can use AWS Serverless Application Repository to deploy ready to use Apps that go beyond hello world samples and learn how authors developed their applications: [AWS Serverless Application Repository main page](https://aws.amazon.com/serverless/serverlessrepo/)
