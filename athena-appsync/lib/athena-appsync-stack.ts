import * as cdk from '@aws-cdk/core';
import fs = require('fs');
import * as appsync from '@aws-cdk/aws-appsync';
import * as dynamo from '@aws-cdk/aws-dynamodb';
import { AttributeType } from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as sam from '@aws-cdk/aws-sam';
import * as athena from '@aws-cdk/aws-athena';
import { Stack } from '@aws-cdk/core';

export class AthenaAppsyncStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiSchema = fs.readFileSync('./lib/appsync/schema.graphql', 'utf-8');
    
    const appSyncApi = new appsync.CfnGraphQLApi(this, 'api', {
      name: 'talkncloud',
      authenticationType: appsync.AuthorizationType.API_KEY
    });

    const appSyncSchema = new appsync.CfnGraphQLSchema(this, 'tnc-schema', {
      apiId: appSyncApi.attrApiId,
      definition: apiSchema
    });

    // Database role for appsync
    const dynamoRole = new iam.Role(this, 'tnc-dbRole', {
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com')
    });

    // Dynamo DB persistent datastore
    const dynamoTable = new dynamo.Table(this, 'tnc-db', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      }
    });

    // Update policy so appsync can use dynamo table
    dynamoRole.addToPolicy(new iam.PolicyStatement({
      resources: [ dynamoTable.tableArn ],
      actions: [  'dynamodb:PutItem',
                  'dynamodb:QueryItem',
                  'dynamodb:GetItem',
                  'dynamodb:Scan',
                  'dynamodb:Query'
      ]
    }));
    
    // Define an AppSync datasource (dynamo)
    const dynamoDataSource = new appsync.CfnDataSource(this, 'tnc-dynamodb', {
      apiId: appSyncApi.attrApiId,
      description: 'talkncloud dynamo datasource',
      name: 'dynamodb',
      dynamoDbConfig: {
        tableName: dynamoTable.tableName,
        awsRegion: this.region
      },
      type: 'AMAZON_DYNAMODB',
      serviceRoleArn: dynamoRole.roleArn // This is what we configured above
    });

    const mutationCreateTodoReq = fs.readFileSync('./lib/appsync/Mutation.createTodo.req.vtl', 'utf-8');
    const mutationCreateTodoRes = fs.readFileSync('./lib/appsync/Mutation.createTodo.res.vtl', 'utf-8');
    const mutationCreateReqRes = new appsync.CfnResolver(this, 'mutationCreateTodoReqRes', {
      apiId: appSyncApi.attrApiId,
      typeName: 'Mutation',
      fieldName: 'createTodo',
      dataSourceName: dynamoDataSource.name,
      requestMappingTemplate: mutationCreateTodoReq,
      responseMappingTemplate: mutationCreateTodoRes
    });
    mutationCreateReqRes.addDependsOn(dynamoDataSource); // found that this was required at times

    const queryTodoReq = fs.readFileSync('./lib/appsync/Query.getTodo.req.vtl', 'utf-8');
    const queryTodoRes = fs.readFileSync('./lib/appsync/Query.getTodo.res.vtl', 'utf-8');
    const queryReqRes = new appsync.CfnResolver(this, 'QueryTodoReqRes', {
      apiId: appSyncApi.attrApiId,
      typeName: 'Query',
      fieldName: 'getTodo',
      dataSourceName: dynamoDataSource.name,
      requestMappingTemplate: queryTodoReq,
      responseMappingTemplate: queryTodoRes
    });
    queryReqRes.addDependsOn(dynamoDataSource); // found that this was required at times

    // s3 bucket results from athena
    const athenaResultBucket = new s3.Bucket(this, 'bucket-ath-results', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    // s3 bucket spill from athena
    const athenaSpillBucket = new s3.Bucket(this, 'bucket-ath-spill', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    // Athena workgroup
    const athenaWorkgroup = new athena.CfnWorkGroup(this, 'athena-wg', {
      name: "tnc-wg",
      description: "talkncloud demo for federated queries",
      workGroupConfiguration: {
        enforceWorkGroupConfiguration: true,
        engineVersion: {
          selectedEngineVersion: "Athena engine version 2",
          effectiveEngineVersion: "Athena engine version 2"
        },
        resultConfiguration: {
            outputLocation: "s3://" + athenaResultBucket.bucketName + "/"
        }
      }
    });

    // Athena datasource
    const athenaDataSource = new athena.CfnDataCatalog(this, 'athena-source', {
      name: "tnc-catalog",
      description: "catalog for talkncloud demo",
      type: "LAMBDA",
      parameters: {
        "function": "arn:aws:lambda:" + Stack.of(this).region + ":" + Stack.of(this).account + ":function:tnc-catalog" // tnc-catalog = name above
      }
    });

    // Use the serverless app connector for dynamodb from AWS
    // https://github.com/awslabs/aws-athena-query-federation
    const samAthenaConnector = new sam.CfnApplication(this, 'sam-connector', {
      location: {
        applicationId: "arn:aws:serverlessrepo:us-east-1:292517598671:applications/AthenaDynamoDBConnector",
        semanticVersion: "2021.14.1"
      },
      parameters: {
        "AthenaCatalogName": athenaDataSource.name,
        "LambdaMemory": "3008",
        "LambdaTimeout": "900",
        "SpillBucket": athenaSpillBucket.bucketName
      }
    });

    // Lambda function for athena-express
    const lambdaAthExpress = new lambda.Function(this, "handler-athena", {
      description: 'use athena to query federated sources',
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.asset("lib/lambda"),
      handler: "athena.handler",
      environment: {
        ATH_BUCKET: athenaResultBucket.bucketName,
        ATH_CAT: athenaDataSource.name,
        ATH_WG: athenaWorkgroup.name,
        DYN_TABLE: dynamoTable.tableName
      },
      timeout: cdk.Duration.seconds(15)
    });

    // Add some permissions
    // Read/write for lambda to result bucket
    athenaResultBucket.grantReadWrite(lambdaAthExpress);
    athenaSpillBucket.grantReadWrite(lambdaAthExpress);
    
    lambdaAthExpress.addToRolePolicy(new iam.PolicyStatement({
      actions: [  "athena:GetWorkGroup",
                  "athena:StartQueryExecution",
                  "athena:StopQueryExecution",
                  "athena:GetQueryExecution",
                  "athena:GetQueryResults",
                  "athena:GetDataCatalog" ],
      resources: ["arn:aws:athena:" + Stack.of(this).region + ":" + Stack.of(this).account + ":workgroup/tnc-wg" ] // couldn't seem to ref arn here?
    }));

    lambdaAthExpress.addToRolePolicy(new iam.PolicyStatement({
      actions: [  "athena:ListWorkGroups" ],
      resources: [ "*" ]
    }));

    lambdaAthExpress.addToRolePolicy(new iam.PolicyStatement({
      actions: [  "lambda:InvokeFunction" ],
      resources: [ "arn:aws:lambda:" + Stack.of(this).region + ":" + Stack.of(this).account + ":function:tnc-catalog" ]
    }));


  }
}
