import * as apigw from "@aws-cdk/aws-apigateway";
import * as lambda from "@aws-cdk/aws-lambda";
import { DockerImageCode } from "@aws-cdk/aws-lambda";
import * as s3 from "@aws-cdk/aws-s3";
import * as cdk from "@aws-cdk/core";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

export class TalkncloudLambdaGravitonStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // Lambda x86
    // TODO: Python 3.9?
    const lambdaX86 = new lambda.Function(this, "lambda-x86", {
      functionName: "talkncloud-lambda-x86",
      description: "performance testing lambda to compare x86 to arm",
      runtime: lambda.Runtime.PYTHON_3_8,
      architectures: [lambda.Architecture.X86_64],
      code: lambda.Code.fromAsset("./src/lambda/perf"),
      handler: "lambda.handler",
      tracing: lambda.Tracing.ACTIVE,
    });

    // S3 Bucket Thumbnails
    const bucketThumbnails = new s3.Bucket(this, "bucket-thumbnails", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Lambda x86 - Thumbnail
    // Randomly select 5 images from 100 (approx same size)
    // Numpy maste? sort, filter for actuals, provide 5 (this is just extra not really needed)
    // Generate thumbnail
    // Save to /tmp - don't write back
    const lambdaX86Thumbnail = new lambda.Function(this, "lambda-x86-thumbnail", {
      functionName: "talkncloud-lambda-x86-thumbnail",
      description: "performance testing lambda to compare x86 to arm - thumbnail resizer",
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset("./src/lambda/perf-thumbnail"),
      handler: "lambda.handler",  
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        BUCKET: bucketThumbnails.bucketName,
        NUMBER_OF_IMAGES: "5",
        THUMBNAIL_WIDTH: "100",
        THUMBNAIL_HEIGHT: "100",
        THUMBNAIL_OUTPUT_DIR: "/tmp",
      }
    });

    // Lambda x86 - Thumbnail - S3 read access
    bucketThumbnails.grantRead(lambdaX86Thumbnail);

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

    // Lamba container x86
    const lambdaX86Container = new lambda.DockerImageFunction(
      this,
      "lambda-x86-container",
      {
        functionName: "talkncloud-lambda-container-x86",
        description: "performance testing lambda to compare x86 to arm",
        architectures: [lambda.Architecture.X86_64],
        tracing: lambda.Tracing.ACTIVE,
        code: DockerImageCode.fromImageAsset("./src/lambda/container/x86/"),
      }
    );

    // Lamba container arm
    const lambdaArmContainer = new lambda.DockerImageFunction(
      this,
      "lambda-arm-container",
      {
        functionName: "talkncloud-lambda-container-arm",
        description: "performance testing lambda to compare x86 to arm",
        architectures: [lambda.Architecture.ARM_64],
        tracing: lambda.Tracing.ACTIVE,
        code: DockerImageCode.fromImageAsset("./src/lambda/container/arm/"),
      }
    );

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

    // API GW - x86 thumbnail
    const x86thumbnail = mainApi.root.addResource("x86thumbnail");
    x86thumbnail.addMethod("GET", new apigw.LambdaIntegration(lambdaX86Thumbnail));

    // API GW - arm method
    const arm = mainApi.root.addResource("arm");
    arm.addMethod("GET", new apigw.LambdaIntegration(lambdaArm));

    // API GW - x86 container method
    const x86container = mainApi.root.addResource("x86container");
    x86container.addMethod(
      "GET",
      new apigw.LambdaIntegration(lambdaX86Container)
    );

    // API GW - x86 container method
    const armcontainer = mainApi.root.addResource("armcontainer");
    armcontainer.addMethod(
      "GET",
      new apigw.LambdaIntegration(lambdaArmContainer)
    );

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
