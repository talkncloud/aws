import * as cdk from '@aws-cdk/core';
import * as budget from '@aws-cdk/aws-budgets';
import * as sns from '@aws-cdk/aws-sns';
import * as chatbot from '@aws-cdk/aws-chatbot';
import * as iam from '@aws-cdk/aws-iam';

export class EssentialBillingBotStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const email = new cdk.CfnParameter(this, "email", {
      type: "String",
      description: "email address for notifications"});

    const spend = new cdk.CfnParameter(this, "spend", {
      type: "Number",
      description: "max budget for alarm"});

    const slackWorkSpaceId = new cdk.CfnParameter(this, "workspace", {
      type: "String",
      description: "enter slack workspace id"});

    const slackChannelId = new cdk.CfnParameter(this, "channel", {
      type: "String",
      description: "enter slack channel id"});

    const billTopic = new sns.Topic(this, 'bill-topic', {
      displayName: 'aws budget notifications',
    });

    const slackChannel = new chatbot.SlackChannelConfiguration(this, 'aws-chatops', {
      slackChannelConfigurationName: 'aws-chatops',
      // loggingLevel: chatbot.LoggingLevel.INFO, // Nice to have for debugging
      notificationTopics: [ billTopic ],
      slackWorkspaceId: slackWorkSpaceId.valueAsString, 
      slackChannelId: slackChannelId.valueAsString
    });

    billTopic.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [ new iam.ServicePrincipal("budgets.amazonaws.com") ],
      actions: [
        'SNS:Publish',
      ],
      resources: [ billTopic.topicArn ]
    }));

    const billingBudget = new budget.CfnBudget(this, 'my-budget', {
      budget: {
        budgetName: "my-budget",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: { amount: spend.valueAsNumber, unit: "USD" } // USD only one supported
      },
      notificationsWithSubscribers: [{
        notification: {
          notificationType: "FORECASTED", // ACTUAL | FORECASTED
          comparisonOperator: "GREATER_THAN",
          threshold: 80 // percent
        },
        subscribers: [{ subscriptionType: "EMAIL", address: email.valueAsString },
                      { subscriptionType: "SNS", address: billTopic.topicArn }]
      }
    ]
    })

  }
}
