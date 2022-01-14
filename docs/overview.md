# Custom Observability Event Emitter for AWS Codepipeline CI/CD

## Overview
This AWS Lambda function is designed to ingest AWS Codepipeline Events published to an AWS SNS (Simple Notification Service) topic and POST them to Splunk Observability Cloud.

### The basic workflow includes these stages

1. A connection is configured between a Github repository & AWS Codepipeline.
2. When changes on a watched branch are committed to Github, AWS Codepipeline takes over to pull the source code.  A notification of this event is published to the SNS Topic
3. The Lambda function has a subscription to the notification topic and is invoked with the payload of the message as the function's input.
4. The function creates a simple HTTP `POST` payload that's sent to the Observability `Ingest` API.  The payload is designed to carry some details about the Codepipeline event that invoked the function.
5. At each subsequent stage in the Codepipeline process, the same process repeats itself.
6. Once these events arrive in Observability Cloud, they can be added as event overlays on various Charts and Dashboard elements, as well as represented as Table or Counter charts.  The possibilities are endless :smile:

### Implementing The Workflow
For the purposes of a proof-of-concept, it would be sufficient to have a simple pipeline that includes three stages to a complete CI/CD workflow:

* Source
* Build
* Deploy

The most involved part of creating this POC is building a functional AWS CodePipeline.  If you already have access to one, skip ahead to a future section.