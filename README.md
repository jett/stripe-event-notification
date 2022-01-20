
## About this project



This is an AWS CDK app that can be used as a webhook to forward Stripe events to an email address.

It creates Gateway endpoint, an SNS Topic, and a single email subscription to the topic.

This was based on the [gw-sns-sqs sample](https://github.com/aws-samples/serverless-patterns/tree/main/apigw-sns-sqs-lambda-cdk) but retrofitted to use [CDK v2](https://docs.aws.amazon.com/cdk/api/v2/).





## How this project was created:


1. install the CDK CLI

    `npm install -g aws-cdk`

2. inside an empty project folder, create a new AWS CDK app

    `cdk init app --language typescript`

3. Update lib/stripe-event-notification-stack.ts with the stack elements

4. Bootstrap the AWS CDK for your account/region (this needs to be done only once per account/region, unless you delete the stack it creates)

    `cdk bootstrap <aws-account-#>/<aws-region> --profile <your-aws-profile>`

    This step creates a Cloudformation stack (CDKToolkit) that will be used by CDK for deploying.

5. Deploy

    `cdk deploy --profile=<profile_name> --parameters subscriptionEmail="<email_to_send_notifications_to>"`

