import { App, Construct, Stack, StackProps } from "@aws-cdk/core";
import { TalkncloudLambdaGravitonStack } from "./lambda-graviton2";

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new TalkncloudLambdaGravitonStack(app, "talkncloud-lambda-graviton", {
  env: devEnv,
});

app.synth();
