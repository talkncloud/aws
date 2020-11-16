#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AppsyncWafStack } from '../lib/appsync-waf-stack';

const app = new cdk.App();
new AppsyncWafStack(app, 'AppsyncWafStack');
