#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { EssentialBillingStack } from '../lib/essential-billing-stack';

const app = new cdk.App();
new EssentialBillingStack(app, 'EssentialBillingStack', {
    env: {
        //region: 'us-east-1'
    }
});
