import * as cdk from '@aws-cdk/core';
import * as cognito from '@aws-cdk/aws-cognito';
import * as appsync from '@aws-cdk/aws-appsync';
import * as wafv2 from '@aws-cdk/aws-wafv2';
import * as dynamo from '@aws-cdk/aws-dynamodb';
import { AttributeType } from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import fs = require('fs');

export class AppsyncWafStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Dynamo DB persistent datastore
    const dynamoTable = new dynamo.Table(this, 'tnc-db', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      }
    });

    const cognitoUP = new cognito.CfnUserPool(this, 'tnc-up', {
      adminCreateUserConfig: {
        allowAdminCreateUserOnly: true // just means only admins create users, no free signup etc
      }
    });

    const cognitoCl = new cognito.CfnUserPoolClient(this, 'tnc-client', {
      clientName: 'tnc',
      userPoolId: cognitoUP.ref,
      generateSecret: false,
      supportedIdentityProviders: [ 'COGNITO' ],
      allowedOAuthFlows: [ 'code' ],
      allowedOAuthScopes: [ 'email', 'aws.cognito.signin.user.admin', 'openid', 'profile' ],
      allowedOAuthFlowsUserPoolClient: true,
      callbackUrLs: [ 'tnc://signin' ],
      logoutUrLs: [ 'tnc://signout' ]
    });

    const cognitoIdp = new cognito.CfnIdentityPool(this, 'tnc-idp', {
      allowUnauthenticatedIdentities: false, // don't want to unauth'd
      cognitoIdentityProviders: [
        { 
          providerName: cognitoUP.attrProviderName,
          clientId: cognitoCl.ref
        }
      ]
    });

    // We need roles for cognito, unauth and auth
    const idpRoleUnAuthenticated = new iam.Role(this, 'tnc-unauthRole', {
      roleName: 'unAuthRole',
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        'StringEquals': {
          'cognito-identity.amazonaws.com:aud': cognitoIdp.ref // Need the new pool id
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'unauthenticated'
        }
      },
      'sts:AssumeRoleWithWebIdentity'
      )
    });
  
    const idpRoleAuthenticated = new iam.Role(this, 'tnc-authrole', {
      roleName: 'authRole',
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        'StringEquals': {
          'cognito-identity.amazonaws.com:aud': cognitoIdp.ref
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'authenticated'
        }
      },
      'sts:AssumeRoleWithWebIdentity'
      )
    });

    const cognitoRole = new cognito.CfnIdentityPoolRoleAttachment(this, 'tnc-roles', {
      identityPoolId: cognitoIdp.ref,
      roles: {
        authenticated: idpRoleAuthenticated.roleArn,
        unauthenticated: idpRoleUnAuthenticated.roleArn
      }
    });    

    const apiSchema = fs.readFileSync('./lib/appsync/schema.graphql', 'utf-8');
    
    const appSyncApi = new appsync.CfnGraphQLApi(this, 'api', {
      name: 'talkncloud',
      authenticationType: appsync.AuthorizationType.API_KEY, // for demo
      userPoolConfig: {
        awsRegion: this.region,
        userPoolId: cognitoUP.ref,
        defaultAction: "ALLOW"
      }
    });

    const appSyncSchema = new appsync.CfnGraphQLSchema(this, 'tnc-schema', {
      apiId: appSyncApi.attrApiId,
      definition: apiSchema
    });

    // Database role for appsync
    const dynamoRole = new iam.Role(this, 'tnc-dbRole', {
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com')
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

    // Lets add a firewall
    const waf = new wafv2.CfnWebACL(this, 'waf', {
      description: 'ACL for talkncloud appsync',
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: { 
        sampledRequestsEnabled: true, 
        cloudWatchMetricsEnabled: true,
        metricName: 'tnc-firewall'
      },
      rules: [
        {
          name: 'AWS-AWSManagedRulesCommonRuleSet',
          priority: 1,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              excludedRules : [
                {
                  name: "NoUserAgent_HEADER"
                }
              ]
            }
          },
          overrideAction: { none: {}},
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesCommonRuleSet'
          }
        },
        {
          name: 'LimitRequests100',
          priority: 2,
          action: {
            block: {}
          },
          statement: {
            rateBasedStatement: {
              limit: 100,
              aggregateKeyType: "IP"
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'LimitRequests100'
          }
        },
    ]
    }) 
    
    // WAF to AppSync
    const wafAssoc = new wafv2.CfnWebACLAssociation(this, 'tnc-waf-assoc', {
      resourceArn: appSyncApi.attrArn,
      webAclArn: waf.attrArn
    });
    
    // WAF depends on AppSync
    wafAssoc.node.addDependency(appSyncApi);
    
  }
}
