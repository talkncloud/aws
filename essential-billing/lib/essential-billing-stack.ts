import * as cdk from '@aws-cdk/core';
import * as budget from '@aws-cdk/aws-budgets';

export class EssentialBillingStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    const email = new cdk.CfnParameter(this, "email", {
      type: "String",
      description: "email address for notifications"});

    const spend = new cdk.CfnParameter(this, "spend", {
      type: "Number",
      description: "max budget for alarm"});

    const billingBudget = new budget.CfnBudget(this, 'my-budget', {
      budget: {
        budgetName: "my-budget",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: { amount: spend.valueAsNumber, unit: "USD" }
      },
      notificationsWithSubscribers: [{
        notification: {
          notificationType: "ACTUAL",
          comparisonOperator: "GREATER_THAN",
          threshold: 80 // percent
        },
        subscribers: [{subscriptionType: "EMAIL", address: email.valueAsString}]
      }]
    })


  }
}
