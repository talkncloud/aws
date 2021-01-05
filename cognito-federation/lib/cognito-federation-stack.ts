import * as cdk from '@aws-cdk/core';
import * as cognito from '@aws-cdk/aws-cognito';
import * as iam from '@aws-cdk/aws-iam';

export class CognitoFederationStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // cognito user pool
    const cognitoUP = new cognito.CfnUserPool(this, 'tnc-up', {
      autoVerifiedAttributes: [ "email" ],
      adminCreateUserConfig: {
        allowAdminCreateUserOnly: false // toggle for admin only sign up
      },
      accountRecoverySetting: {
        recoveryMechanisms: [ { name: 'verified_email', priority: 1 } ]  // verified email users can reset password
      },  
      usernameConfiguration: {
        caseSensitive: false // so that users can use myemail@talkncloud.com or MyEmail@talkncloud.com
      },
      usernameAttributes: [ "email" ],
      schema: [
        {
          attributeDataType: "String",
          required: false,
          name: "somethingcustom", // example of a custom attribute
          mutable: true
        }
      ]
    });

    // add a custom domain name, note: you will have to manually do the route53 part
    // TODO: uncomment and provide your cert arn
    // const cognitoDomain = new cognito.CfnUserPoolDomain(this, 'tnc-up-dom', {
    //   domain: 'auth.somedomain.com',
    //   customDomainConfig: {
    //     certificateArn: 'yourcertificate.arn',
    //   },
    //   userPoolId: cognitoUP.ref
    // })

    // TODO: route53 to alias not supported yet

    // Google login
    const cognitoUPIdpGoogle = new cognito.CfnUserPoolIdentityProvider(this, 'tnc-idp-google', {
      providerName: 'Google',
      userPoolId: cognitoUP.ref,
      attributeMapping: {
          email: 'email',
      },
      providerType: 'Google',
      providerDetails: {
          'client_id': 'YOURGOOGLEID.googleusercontent.com',
          'client_secret': 'YOURSECRET_STOREMEIN_SECRETMANAGER',
          'authorize_scopes': 'profile email openid'
      }
    })
    const cognitoUPIdpFacebook = new cognito.CfnUserPoolIdentityProvider(this, 'tnc-idp-facebook', {
      providerName: 'Facebook',
      userPoolId: cognitoUP.ref,
      attributeMapping: {
          email: 'email',
      },
      providerType: 'Facebook',
      providerDetails: {
          'client_id': 'YOURFACEBOOKID',
          'client_secret': 'YOURSECRET_STOREMEIN_SECRETMANAGER',
          'authorize_scopes': 'public_profile, email'
      }
    })
    const cognitoUPIdpAmazon = new cognito.CfnUserPoolIdentityProvider(this, 'tnc-idp-amazon', {
      providerName: 'LoginWithAmazon',
      userPoolId: cognitoUP.ref,
      attributeMapping: {
          email: 'email',
      },
      providerType: 'LoginWithAmazon',
      providerDetails: {
          'client_id': 'YOURAMAZONID',
          'client_secret': 'YOURSECRET_STOREMEIN_SECRETMANAGER',
          'authorize_scopes': 'profile postal_code'
      }
    })
    
    // web
    const cognitoCla = new cognito.CfnUserPoolClient(this, 'tnc-app-client', {
      clientName: 'app-web',
      userPoolId: cognitoUP.ref,
      generateSecret: false,
      supportedIdentityProviders: [ 'COGNITO', cognitoUPIdpGoogle.providerName, cognitoUPIdpFacebook.providerName, cognitoUPIdpAmazon.providerName ],
      allowedOAuthFlows: [ 'code' ],
      allowedOAuthScopes: [ 'email', 'aws.cognito.signin.user.admin', 'openid', 'profile' ],
      allowedOAuthFlowsUserPoolClient: true,
      callbackUrLs: [ 'https://www.somedomain.com/dashboard' ],
      logoutUrLs: [ 'https://www.somedomain.com/' ]
    });

    // mobile
    const cognitoClw = new cognito.CfnUserPoolClient(this, 'tnc-web-client', {
      clientName: 'app-mobile',
      userPoolId: cognitoUP.ref,
      generateSecret: false,
      supportedIdentityProviders: [ 'COGNITO', cognitoUPIdpGoogle.providerName, cognitoUPIdpFacebook.providerName, cognitoUPIdpAmazon.providerName ],
      allowedOAuthFlows: [ 'code' ],
      allowedOAuthScopes: [ 'email', 'aws.cognito.signin.user.admin', 'openid', 'profile' ],
      allowedOAuthFlowsUserPoolClient: true,
      callbackUrLs: [ 'app://dashboard' ],
      logoutUrLs: [ 'app://home' ]
    });

    // cognito identity pool
    const cognitoIdp = new cognito.CfnIdentityPool(this, 'tnc-idp', {
      allowUnauthenticatedIdentities: false, // don't want to unauth'd access
      cognitoIdentityProviders: [
        { 
          providerName: cognitoUP.attrProviderName,
          clientId: cognitoCla.ref
        },
        { 
          providerName: cognitoUP.attrProviderName,
          clientId: cognitoClw.ref
        }
      ]
    });

    // Dependency issue othereise
    cognitoCla.addDependsOn(cognitoUPIdpGoogle)
    cognitoClw.addDependsOn(cognitoUPIdpGoogle)

    // We need roles for cognito, unauth and auth
    const idpRoleUnAuthenticated = new iam.Role(this, 'tnc-unauthRole', {
      roleName: 'tnc-unAuthRole',
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
      roleName: 'tnc-authRole',
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

  }
}
