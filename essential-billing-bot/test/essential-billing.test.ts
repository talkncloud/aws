import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as EssentialBilling from '../lib/essential-billing-bot-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new EssentialBilling.EssentialBillingBotStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
