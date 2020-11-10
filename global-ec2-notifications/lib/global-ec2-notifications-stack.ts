import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as snssub from '@aws-cdk/aws-sns-subscriptions';
import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as iam from '@aws-cdk/aws-iam';
import { PolicyStatement } from '@aws-cdk/aws-iam';

export class GlobalEc2NotificationsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const snsEc2Runner = new sns.Topic(this, "tnc-topic", {
      displayName: "talkncloud: ec2runner"
    });

    // Cfn parameter for email address for notifications
    const email = new cdk.CfnParameter(this, "email", {
      type: "String",
      description: "email address for notifications"
    });

    // Subscribe to topic by email
    snsEc2Runner.addSubscription(new snssub.EmailSubscription(email.valueAsString))
  
    // Add our lamdba
    const lambdaEc2Runner = new lambda.Function(this, "tnc-lambda", {
      description: 'tnc: global check for running ec2 instances, publishes to sns',
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset('lib/lambda'),
      handler: "tnc-running.handler",
      environment: {
        SNS_TOPIC: snsEc2Runner.topicArn,
        THRESH_LOW: "1440",
        THRESH_MED: "2160",
        THRESH_HIGH: "2880"
      },    
      timeout: cdk.Duration.seconds(30) // takes around 15 seconds
    });

    // Add permission for lambda to access ec2 descibe and tag
    const iamPolEc2 = new iam.PolicyStatement({
      actions: ["ec2:DescribeInstances", "ec2:DescribeTags", "ec2:DescribeRegions"],
      resources: ["*"]
    });
    
    // We need to read and write tags, but lets lock it down to just the "tnc-ec2runner" (defined in lambda program)
    const iamPolTag = new iam.PolicyStatement({
      actions: ["ec2:CreateTags", "ec2:DeleteTags"],
      resources: ["*"],
      conditions: {
        "ForAllValues:StringEquals": {
          "aws:TagKeys": ["tnc-ec2runner"]
        }
      }
    });

    // Allow lambda to publish to sns
    snsEc2Runner.grantPublish(lambdaEc2Runner)
    
    // Add policy to lamdba
    lambdaEc2Runner.addToRolePolicy(iamPolEc2)
    lambdaEc2Runner.addToRolePolicy(iamPolTag)


    // Schedule our lambda
    // Cron format: https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
    const runRule = new events.Rule(this, 'tnc-rule', {
      description: "tnc: run ec2runner per schedule",
      schedule: events.Schedule.expression('rate(1 day)')
    })

    // Add to lambda
    runRule.addTarget(new targets.LambdaFunction(lambdaEc2Runner));


  }
}
