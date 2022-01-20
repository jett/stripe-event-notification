import { Aws, CfnParameter, CfnOutput } from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
export class StripeEventNotificationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // get the email address specified in the subscriptionEmail parameter when the stack is created
    const emailAddress = new CfnParameter(this, 'subscriptionEmail');

    // create an SNS topic and add a single email subscription
    const topic = new sns.Topic(this, 'stripe-notification-topic')

    topic.addSubscription(
      new EmailSubscription(
        // Since we're using TypeScript, we will immediately know if we've forgot to convert the `value` to a `string`
        emailAddress.value.toString(),
      ),
    );

    // role to allow API Gateway to publish to the SNS topic
    const gatewayExecutionRole: any = new iam.Role(this, "GatewayExecutionRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      inlinePolicies: {
        "PublishMessagePolicy": new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
            actions: ["sns:Publish"],
            resources: [topic.topicArn]
          })]
        })
      }
    });

    // Stripe IPs where webhook calls are initiated from
    const stripeWebhookSourceIps = ["3.18.12.63", 
      "3.130.192.231",
      "13.235.14.237",
      "13.235.122.149",
      "18.211.135.69",
      "35.154.171.200",
      "52.15.183.38",
      "54.88.130.119",
      "54.88.130.237",
      "54.187.174.169",
      "54.187.205.235",
      "54.187.216.72]",
    ]

    // create the policy document to limit invocations only to the IPs specified above
    const restrictToStripeIps = new iam.PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [new iam.AnyPrincipal()],
          actions: ["execute-api:Invoke"],
          resources: ["execute-api:/*"]
        }),
        new PolicyStatement({
          effect: Effect.DENY,
          principals: [new iam.AnyPrincipal()],
          actions: ["execute-api:Invoke"],
          conditions: {
            "NotIpAddress": {
                "aws:SourceIp": stripeWebhookSourceIps
              }
          }
        })
      ]
    })

    // create the API Gateway
    const api = new apigateway.RestApi(this, 'StripeWebhookRestApi', {policy: restrictToStripeIps});

    // add the stripeevents resource to the gateway
    const stripeEvents = api.root.addResource('stripeevents');
    stripeEvents.addMethod('POST',
      new apigateway.AwsIntegration({
        service: 'sns',
        integrationHttpMethod: 'POST',
        path: `${Aws.ACCOUNT_ID}/${topic.topicName}`,
        options: {
          credentialsRole: gatewayExecutionRole,
          passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
          requestParameters: {
            "integration.request.header.Content-Type": `'application/x-www-form-urlencoded'`,
          },
          requestTemplates: {
            "application/json": `Action=Publish&TopicArn=$util.urlEncode('${topic.topicArn}')&Message=$util.urlEncode($input.body)&Subject=Stripe Event Notification`,
          },
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": `{"status": "event received"}`,
              },
            },
            {
              statusCode: "400",
              selectionPattern: "^\[Error\].*",
              responseTemplates: {
                "application/json": `{\"state\":\"error\",\"message\":\"$util.escapeJavaScript($input.path('$.errorMessage'))\"}`,
              },
            }
          ],
        }
      }), { methodResponses: [{ statusCode: "200" }, { statusCode: "400" }] }
    );
  }
}
