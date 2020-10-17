#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { EssentialBillingBotStack } from '../lib/essential-billing-bot-stack';

const app = new cdk.App();
new EssentialBillingBotStack(app, 'EssentialBillingBotStack', {
    env: {
        //region: 'us-east-1'
    }
});
