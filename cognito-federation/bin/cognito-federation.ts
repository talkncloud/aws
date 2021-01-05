#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CognitoFederationStack } from '../lib/cognito-federation-stack';

const app = new cdk.App();
new CognitoFederationStack(app, 'CognitoFederationStack');
