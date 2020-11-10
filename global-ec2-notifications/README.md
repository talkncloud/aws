# Welcome to talkncloud CDK TypeScript project!

This project was developed to find ec2 instances running in all regions, if found and past various thresholds send an email with the details.

More info: https://www.talkncloud.com/aws-ec2-scheduling/

![design](https://www.talkncloud.com/content/images/2020/11/design.png)

Note: There are env variables so you don't need to modify the code (optional), price estimates at link above.

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
cdk deploy --parameters email=demo@example.com

## Launch the stack in AWS using CF
[![Launch Stack](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)](https://console.aws.amazon.com/cloudformation/home?#/stacks/new?stackName=tnc-ec2runner&templateURL=https://talkncloud-stax.s3-ap-southeast-2.amazonaws.com/tnc-global-notification-stack.template.json)