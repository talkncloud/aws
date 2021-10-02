import * as apigw from "@aws-cdk/aws-apigateway";
import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "@aws-cdk/core";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

export class TalkncloudLambdaGravitonStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // Lambda x86
    const lambdaX86 = new lambda.Function(this, "lambda-x86", {
      functionName: "talkncloud-lambda-x86",
      description: "performance testing lambda to compare x86 to arm",
      runtime: lambda.Runtime.PYTHON_3_8,
      architectures: [lambda.Architecture.X86_64],
      code: lambda.Code.fromAsset("./src/lambda/perf"),
      handler: "lambda.handler",
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda arm (graviton2)
    const lambdaArm = new lambda.Function(this, "lambda-arm", {
      functionName: "talkncloud-lambda-arm",
      description: "performance testing lambda to compare x86 to arm",
      runtime: lambda.Runtime.PYTHON_3_8,
      architectures: [lambda.Architecture.ARM_64],
      code: lambda.Code.fromAsset("./src/lambda/perf"),
      handler: "lambda.handler",
      tracing: lambda.Tracing.ACTIVE,
    });

    // API GW
    const mainApi = new apigw.RestApi(this, "api", {
      restApiName: "talkncloud-lambda-graviton-api",
      description: "api gw for performance testing lambda",
      endpointTypes: [apigw.EndpointType.REGIONAL],
      defaultMethodOptions: {
        apiKeyRequired: true,
      },
      deployOptions: {
        metricsEnabled: true,
        loggingLevel: apigw.MethodLoggingLevel.ERROR,
        tracingEnabled: true,
        stageName: "kaboom",
      },
    });

    // API GW - x86 method
    const x86 = mainApi.root.addResource("x86");
    x86.addMethod("GET", new apigw.LambdaIntegration(lambdaX86));

    // API GW - arm method
    const arm = mainApi.root.addResource("arm");
    arm.addMethod("GET", new apigw.LambdaIntegration(lambdaArm));

    // API GW - Api Key
    const apiKey = new apigw.ApiKey(this, "api-key", {
      apiKeyName: "tnc-key",
      description: "talkncloud key",
    });

    // API GW - Usage Plan
    const apiUsage = new apigw.UsagePlan(this, "api-usageplan", {
      name: "tnc-up1",
      description: "no limits usageplan",
      apiKey: apiKey,
      apiStages: [],
    });

    // API GW - Assoc UP to Plan
    apiUsage.addApiStage({
      stage: mainApi.deploymentStage,
    });
  }
}
