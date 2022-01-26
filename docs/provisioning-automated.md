# Generate All AWS Resources to Run The Demo
This step will use the power of the SAM and Cloudformation to automate the construction of all these resources.  Cloudformation is a very powerful Infrastrcuture-as-Code (IaC) tool.  It's recommended to use this process to build all the AWS resources.  Manually provisioning everything is time-consuming and error-prone.

Let's get started!

## Step 1: Download the contents of this repository
```bash
git clone https://github.com/tjohander-splunk/o11y-custom-event-emitter.git &&
cd o11y-custom-event-emitter
```

## Step 2: Build and Deploy the All Required AWS Resources
The SAM CLI is an extension to the AWS CLI and can process various files needed to deploy a serverless function and any related AWS resources.  The `template.yaml` file describes all the resources we will need for this demo.

### Step 2a: Initialize The Project
Enter this command to initialize the project app code and configuration:
   ```bash
   sam build
   ```
### Step 2b: Provide values for each parameter required to process the resources
Enter this command to start the deploy phase.  The `--guided` switch will take you through a series of questions asking for values to assign the parameters contained in the template.
   ```bash
   sam deploy --guided 
   ```
This command will walk you through setting values for the required parameter values for the various AWS resources.  If there are defaults found in the config file, you can hit `enter` to use them.  Details on how to answer each question are provided in the comments above each question
```bash
# Pick anything you want here
Stack Name [sam-app-observability-demo]:
# The region you specificy in your AWS CLI Config
AWS Region [us-east-2]:
# The o11y realm to send events
Parameter Realm [us0]:
# an access token for this o11y environment 
Parameter AccessToken:
# the SSH keypair you own to connect to EC2 instances
Parameter KeyName [tj-devlab-key-pair-001]:
# default is fine
Parameter InstanceType [t2.small]:
# if you want to lock down SSH to single source IP
Parameter SSHLocation [0.0.0.0/0]:
# the repo of the sample project
Parameter GitHubRepo [tjohander-splunk/spring-petclinic]:
# the Github/AWS Connection ARN
Parameter GitHubConnectionARN [arn:aws:codestar-connections:us-east-2:455790677231:connection/aaeb5a4f-b91f-4655-a234-e3ff4c8d1176]:
# An arbitrary prefix to all custom events. Please add something to make here your events easy to find.
Parameter EventType [TSJ CI-CD Pipeline Event]:
#Shows you resources changes to be deployed and require a 'Y' to initiate deploy
Confirm changes before deploy [Y/n]: 
#SAM needs permission to be able to create roles to connect to the resources in your template
Allow SAM CLI IAM role creation [Y/n]: 
#Preserves the state of previously provisioned resources when an operation fails
Disable rollback [Y/n]: <default is fine>
Save arguments to configuration file [Y/n]: <default is fine>
SAM configuration file [samconfig.toml]: <default is fine>
SAM configuration environment [default]: <default is fine>
```
Once a changeSet is created, go ahead and run it.  There will be quite a bit of information output to your terminal, go ahead and follow the prompts to deploy all the AWS resources.  If issues pop up, do your best to remediate or hit me up on Slack ("Tom Johander") or email ("tjohander@splunk.com") 

## Step 4: Monitor the Pipeline
As the process goes down, the initial run of the pipeline will kick off.  It's all automatic and you can watch the pipeline run on the AWS Console.  Go to the CodePipeline "Pipelines" UI and click the name of the pipeline that's created.  As each step and each stage start, succeed or fail, a notification is sent to the Lambda function defined in the `app.js` file in this repo.  This is what's sending pipeline events to Observability cloud...so let's go take a look! 

_Note: The first time the pipeline runs, it's takes about 6 to 7 minutes to complete.  This is due to all the dependencies of the sample app needing to be downloaded.  There is some caching built into the pipeline, so subsequent runs of the pipeline should take about 45 seconds to finish._

## Step 5: Ensure some events make it into O11y
Jump into your O11y environment and open a dashboard.

### Create an Event Feed Chart
- [ ] Open the "Event Feed" and select the "Find Events" radio button
Search with the name prefix you set during the `sam deploy --guided` questionnaire.
Select "Add Single Chart"

### Overlay Events on a different chart
- [ ] In the top bar of the dashboard, find and select your custom event type in the "Event Overlay" field.
This will overlay custom events on the X-axis of any time chart that's appropriate.


## Step 6: Ready for Demo
If everything looks good at this point, you should be ready to deliver a great demo