const { AwsCdkTypeScriptApp, ProjectType } = require("projen");
const project = new AwsCdkTypeScriptApp({
  cdkVersion: "1.125.0",
  defaultReleaseBranch: "main",
  name: "lambda-graviton2",
  cdkVersionPinning: true,
  devDeps: ["prettier"],
  eslintOptions: {
    prettier: true,
  },
  cdkDependencies: ["@aws-cdk/aws-apigateway", "@aws-cdk/aws-lambda"],
  authorEmail: "github@talkncloud.com",
  authorName: "mick jacobsson",
  description: "performance testing graviton2 lambda",
  keywords: ["graviton2", "lambda"],
  repository: "https://github.com/talkncloud/aws/lambda-graviton2",
  context: {
    "@aws-cdk/core:newStyleStackSynthesis": true,
    "@aws-cdk/core:enableStackNameDuplicates": "true",
    "aws-cdk:enableDiffNoFail": "true",
    "@aws-cdk/core:stackRelativeExports": "true",
  },
  tsconfig: {
    compilerOptions: { noUnusedLocals: false },
  },
  projectType: ProjectType.APP,
  gitignore: [".DS_Store", "perf.yaml", "report.*"],
  github: false,
});
project.synth();
