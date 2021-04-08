#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AthenaAppsyncStack } from '../lib/athena-appsync-stack';

const app = new cdk.App();
new AthenaAppsyncStack(app, 'AthenaAppsyncStack');
