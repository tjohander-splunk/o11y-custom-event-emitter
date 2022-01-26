# Custom Observability Event Emitter for AWS Codepipeline CI/CD

## Overview
This Demo is intended to show the capabilities of Splunk Observability Cloud's custom event capabilities.  It demonstrates how a popular Continuous Integration / Continuous Deployment (CI/CD) Workflow can be adapted to send valuable information into Observability Cloud to correlate application release events with specific infrastructure, application and business performance metrics. 

### The Workflow

The workflow in this demo involves a typical process by which software development teams create and maintain projects.

1. Code is continually updated by developers using a central version control system (VCS). In this case a sample Github repository is used, but Bitbucket or AWS CodeCommit are alternatives that would also work. 
2. When the main branch is updated, AWS CodePipeline takes over to:
       * Download the latest code.
       * Run automated tests on the source code.
       * Compile and build any supporting artifacts
       * Deploy the finished artifacts into QA, staging or production runtime environments to deliver the value for which they were created.
   
3. Each of these stages should be automated to allow software teams to focus on the quality of the code, not the mechanics of deploying and running it.  This is the foundation of a modern DevOps paradigm.   

The challenges this process can present to many customers is how to correlate a CI/CD workflow ("pipeline") like this to environment health or business objectives. It's incredibly useful to be able to quickly and painlessly correlate software release events with other health metrics to quickly identify issues in a new release or impact on business objectives.  This is where Splunk Observability's capabilities to accept custom events and overlay display them on other charts and dashboards is invaluable.  

This demo will walk you through exactly how to do that.

### Implementation Details
The technical details of this demo features out-of-the-box capabilities in a Github & AWS-based workflow, although it could be adapted to use a different Version Control System (BitBucket, CodeCommit) or Continuous Delivery platform (Jenkins, Cloudbees, CircleCI).  

1. A connection is configured between a Github repository & AWS Codepipeline.
2. When changes on a watched branch are committed to Github, AWS Codepipeline takes over to pull the source code.  A notification of this event is published to the SNS Topic
3. The Lambda function has a subscription to the notification topic and is invoked with the payload of the message as the function's input.
4. The function creates a simple HTTP `POST` payload that's sent to the Observability `Ingest` API.  The payload is designed to carry some details about the Codepipeline event that invoked the function.
5. At each subsequent stage in the Codepipeline process, the same process repeats itself.
6. Once these events arrive in Observability Cloud, they can be added as event overlays on various Charts and Dashboard elements, as well as represented as Table or Counter charts.  The possibilities are endless :smile: