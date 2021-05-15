# Welcome to talkncloud CDK TypeScript project!

This example was developed to provide an example of athena federated queries with appsync, athena, dynamodb and quicksight. This provides an example on how to easily query dynamodb data and create dashboards.

Detailed info: https://www.talkncloud.com/athena-dynamodb-quicksight-cdk/

![](design.jpeg)

Example dashboard from this demo:
![](dashboard.png)

![](dashboard_2.png)

## General
Discuss it, change it, improve it, share it...

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

## Usage
cdk deploy

## DynamoDB dummy data
Use the following to load sample data or your own: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.02.html#GettingStarted.NodeJs.02.01

## Cost Estimates (tcup)
### tcup: https://github.com/talkncloud/tnc-cup-client - AWS cost estimation for cloudformation templates

  [ DynamoDB ]                                                                                             
  |> tncdb38B2E622                                                                                         
  |- rcu        $0.00 per hour for 25 units of read capacity for a month (free tier)              $0     
  |-- units     5 RCU                                                                                    
  |- storage    $0.00 per GB-Month of storage for first 25 free GB-Months                         $0     
  |-- units     24 GB                                                                                    
  |- wcu        $0.00 per hour for 25 units of write capacity for a month (free tier)             $0     
  |-- units     5 WCU                                                                                    
  [ S3 ]                                                                                                   
  |> bucketathresults1366061F                                                                              
  |- apiGet     $0.004 per 10,000 GET and all other requests                                      $0     
  |-- units     1000 REQ                                                                                 
  |- storage    $0.023 per GB - first 50 TB / month of storage used                               $0.02  
  |-- units     1 GB                                                                                     
  |- apiPut     $0.005 per 1,000 PUT, COPY, POST, or LIST requests                                $0.01  
  |-- units     1000 REQ                                                                                 
  [ S3 ]                                                                                                   
  |> bucketathcache3F13894D                                                                                
  |- apiGet     $0.004 per 10,000 GET and all other requests                                      $0     
  |-- units     1000 REQ                                                                                 
  |- storage    $0.023 per GB - first 50 TB / month of storage used                               $0.02  
  |-- units     1 GB                                                                                     
  |- apiPut     $0.005 per 1,000 PUT, COPY, POST, or LIST requests                                $0.01  
  |-- units     1000 REQ                                                                                 
  [ S3 ]                                                                                                   
  |> bucketathspillB5E0B41D                                                                                
  |- apiGet     $0.004 per 10,000 GET and all other requests                                      $0     
  |-- units     1000 REQ                                                                                 
  |- storage    $0.023 per GB - first 50 TB / month of storage used                               $0.02  
  |-- units     1 GB                                                                                     
  |- apiPut     $0.005 per 1,000 PUT, COPY, POST, or LIST requests                                $0.01  
  |-- units     1000 REQ                                                                                 
  [ Athena ]                                                                                               
  |> athenawg                                                                                              
  |- athena     Data scanned per query in Terabytes                                               $0.5   
  |-- units     0.1 TB                                                                                   
  [ Lambda ]                                                                                               
  |> samconnector                                                                                          
  |- lambda     AWS Lambda - Requests Free Tier - 1,000,000 Requests                              $0     
  |-- units     12500 GBS                                                                                
  [ Lambda ]                                                                                               
  |> handlerathenaD627B2D9                                                                                 
  |- lambda     AWS Lambda - Requests Free Tier - 1,000,000 Requests                              $0     
  |-- units     12500 GBS                                                                                
  [ AppSync ]                                                                                              
  |> api                                                                                                   
  |- api        $4 per million query and data modification operations in US East (N. Virginia)    $4     
  |-- units     1000000 REQ                                                                              
                                                                                                         
                                                                                   DAILY (USD)    $0     
                                                                                  WEEKLY (USD)    $1     
                                                                                 MONTHLY (USD)    $5     
                                                                                                         
                                                                                   DAILY (AUD)    $0     
                                                                                  WEEKLY (AUD)    $2     
                                                                                 MONTHLY (AUD)    $6    
