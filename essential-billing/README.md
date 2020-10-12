# Welcome to talkncloud CDK TypeScript project!

This example was written to help new comers setup billing alarms with AWS Budgets.

More info: https://www.talkncloud.com/aws-essential-setting-budget-and-alarms/

## General
Discuss it, change it, improve it, share it...

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

 ## Usage
 cdk deploy --parameters email=demo@example.com --parameters spend=10

 ## Launch the stack in AWS using CF
 [![Launch Stack](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)](https://console.aws.amazon.com/cloudformation/home?#/stacks/new?stackName=MyBudgetAlarm&templateURL=https://talkncloud-stax.s3-ap-southeast-2.amazonaws.com/EssentialBillingStack.template.json)


