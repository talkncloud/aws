#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { GlobalEc2NotificationsStack } from '../lib/global-ec2-notifications-stack';

const app = new cdk.App();
new GlobalEc2NotificationsStack(app, 'tnc-global-notification-stack', {
    description: "tnc: this stack checks global running ec2 instances and sends notifications"
});
