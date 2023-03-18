import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_lambda_nodejs as lambda } from "aws-cdk-lib";
import * as path from "path";

export class LambdaNodejsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }

  lambdaFunction = new lambda.NodejsFunction(this, "demo", {
    bundling: {
      minify: true,
    },
    functionName: "talkncloud-demo-function",
    entry: path.join(__dirname, "lambda/src/lambda-nodejs-stack.demo.ts"),
  });
}
