# Welcome to talkncloud CDK TypeScript project!

This example was developed to provide an example of athena federated queries with appsync

Detailed info: https://www.talkncloud.com/aws-appsync-with-waf-wooo-cdk-cf/

![design](https://www.talkncloud.com/content/images/2020/10/tnc-appsync-waf-1.png)

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
cdk deploy

## DynamoDB dummy data
Use the following to load sample data or your own: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.02.html#GettingStarted.NodeJs.02.01

## Launch the stack in AWS using CF
[![Launch Stack](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)](https://console.aws.amazon.com/cloudformation/home?#/stacks/new?stackName=TncAppSyncWaf&templateURL=https://talkncloud-stax.s3-ap-southeast-2.amazonaws.com/AppsyncWafStack.template.json)


