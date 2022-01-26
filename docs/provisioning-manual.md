### Pre-Requisites
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


### Step 2: Connect Github to your AWS Account
This only needs to be done once.  The result is an AWS resource that is not directly tied to this demo.

* Select Github (Version 2) as your Source Provider
* Click "Connect to Github"
* You'll be prompted to create a Connection Name:
  ![connection-example-1](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/2c-github-connection-popup.png?raw=true)
* Then you'll be asked to sign in to Github:
  ![github-login](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/2d-sign-in-to-github.png?raw=true)
* The Github Connection should be created and its ARN added to the Source configuration. Complete the fields for the Github repository and branch you want this pipeline to watch:
  ![source-settings](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/2-Source-Stage-Settings.png?raw=true)


### 3: Setup the Pipeline's "Build" Stage
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


### Step 4: Setup the Pipeline's "Deploy" Stage
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

### Step 5: Create SNS Topic
This step will create the SNS (Simple Notification Service) topic that to which the Lambda function will subscribe.

* Head over to the AWS SNS UI, select "Topics" and click the "Create New Topic" button.  Create a topic with these values:

  ![codepipeline-review](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/9-SNS-Topic-Settings.png?raw=true)
  Note the ARN of this topic.  It will be needed in the next step.

### Step 7: Update the Lambda definition to trigger on receipt of a notification on the SNS topic
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
### Step 8: Create Notification Rule For The CodePipeline
Now that we have a topic created, configure the pipeline to send notifications of various events to the SNS topic.

* In the main pipeline UI, select "Notifiy", then "Create Notification Rule".  Fill on values to reflect a configuration like this:

  ![codepipeline-review](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/10-Pipeline-Notification-Rule.png?raw=true)

The SNS topic should auto-populate as an option in the "Choose target" field.

That's it! The pipeline is complete.  Now we will need to deploy our Lambda function and then test everything out by pushing a small change to the application to kick off the pipeline.

### Step 9: Deploy the Lambda function with the SAM CLI
* From a terminal instance with the SAM CLI installed and configured, execute the following commands:
   ```bash
   sam build
   ```
   ```bash
   sam deploy --guided --parameter-overrides Realm=<o11y cloud realm> AccessToken=<o11y cloud access token> 
   ```

### Step 10: Push a small change to the source application code to trigger a pipeline execution
Any change to the source code in the repository will trigger a change.  You can even just edit the README.md file in the root of the project.  It's nice to show an acutal change to the application, so maybe editing the welcome message that's presented to users on the landing page of the web app is something we want to do.

It's easy to make the change, simply open the file located at `src/main/resources/messages/messages.properties`
and edit the `welcome` message.  This text is immediately visible on the landing page and demonstrates that the application code has indeed changed and been deployed to a functional runtime environment.

Once you edit the file execute standard `git` commands to push your change to Github:

```bash
git add .
git commit -m "Updated the welcome message"
git push
```

### Step 11: Validate you have custom events in O11y Cloud
Once the pipeline completes successfully, you should be able to search O11y for your custom events.  To do so, open up a Dashboard and look for matching events in the `Event Overlay` field or in the Event Finder panel.  Once your events are located you can set them as overlays, create a Table chart showing a list of events, etc...

![codepipeline-review](https://github.com/tjohander-splunk/o11y-custom-event-emitter/blob/main/docs-readme/images/11a-o11y-cloud-events-overlay.png?raw=true)