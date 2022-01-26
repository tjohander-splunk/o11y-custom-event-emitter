### Step 1: Download the contents of this repository
```bash
git clone https://github.com/tjohander-splunk/o11y-custom-event-emitter.git
cd o11y-custom-event-emitter
```

### Step 2: Build and Deploy the All Required AWS Resources
The SAM CLI is an extension to the AWS CLI and can process various files needed to deploy a serverless function and any related AWS resources.  The `template.yaml` file describes all the resources we will need for this demo.

#### Step 2a: Initialize The Project
Enter this command to initialize the project app code and configuration:
   ```bash
   sam build
   ```
#### Step 2b: Provide values for each parameter required to process the resources
Enter this command to start the deploy phase.  The `--guided` switch will take you through a series of questions asking for values to assign the parameters contained in the template.
   ```bash
   sam deploy --guided 
   ```
What are the parameters, Tom?

|Parameter| Details                                             |
|---------|-----------------------------------------------------|
| Fizz    | buzz                                                |   

Once a changeSet is created, go ahead and run it.

### Step 3: Monitor the CLI output for any issues

### Step 4: Monitor the Pipeline

### Step 5: Ensure some events make it into O11y

### Step 6: Ready for Demo