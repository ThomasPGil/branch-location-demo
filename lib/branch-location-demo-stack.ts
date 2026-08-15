import * as path from 'node:path';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';


export interface BranchLocationDemoStackProps extends cdk.StackProps {
  readonly environment: 'development' | 'production';
  readonly application: string;
  readonly nominatimBaseUrl: string;
  readonly nominatimUserAgent: string;
}

export class BranchLocationDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BranchLocationDemoStackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Application', props.application);

    const isProd = props.environment === 'production';

    // DynamoDB Table for Branch Locations
    const table = new dynamodb.TableV2(this, 'BranchLocationTable', {
      partitionKey: { name: 'LocationId', type: dynamodb.AttributeType.STRING },
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: isProd },
      deletionProtection: isProd,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Resources for getLocation Lambda function
    // Log group for getLocation Lambda function
    const getLocationLogGroup = new logs.LogGroup(this, 'GetLocationLogGroup', {
      retention: isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Execution role for getLocation Lambda function
    const getLocationRole = new iam.Role(this, 'GetLocationRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    getLocationLogGroup.grantWrite(getLocationRole);
    table.grant(getLocationRole, 'dynamodb:GetItem');

    // getLocation Lambda function
    const getLocationLambda = new nodejs.NodejsFunction(this, 'GetLocation', {
      entry: path.join(__dirname, '../src/handlers/get-location.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_24_X,
      timeout: cdk.Duration.seconds(30),
      role: getLocationRole,
      logGroup: getLocationLogGroup,
      loggingFormat: lambda.LoggingFormat.JSON,
      environment: {
        TABLE_NAME: table.tableName,
      },
      bundling: {
        bundleAwsSDK: true
      }
    });

    // Resources for listLocations Lambda function
    // Log group for listLocations Lambda function
    const listLocationsLogGroup = new logs.LogGroup(this, 'ListLocationsLogGroup', {
      retention: isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Execution role for listLocations Lambda function
    const listLocationsRole = new iam.Role(this, 'ListLocationsRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    listLocationsLogGroup.grantWrite(listLocationsRole);
    table.grant(listLocationsRole, 'dynamodb:Scan');

    // listLocations Lambda function
    const listLocationsLambda = new nodejs.NodejsFunction(this, 'ListLocations', {
      entry: path.join(__dirname, '../src/handlers/list-locations.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_24_X,
      timeout: cdk.Duration.seconds(30),
      role: listLocationsRole,
      logGroup: listLocationsLogGroup,
      loggingFormat: lambda.LoggingFormat.JSON,
      environment: {
        TABLE_NAME: table.tableName,
      },
      bundling: {
        bundleAwsSDK: true
      }
    });

    // Resources for createLocation Lambda function
    // Log group for createLocation Lambda function
    const createLocationLogGroup = new logs.LogGroup(this, 'CreateLocationLogGroup', {
      retention: isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Execution role for createLocation Lambda function
    const createLocationRole = new iam.Role(this, 'CreateLocationRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    createLocationLogGroup.grantWrite(createLocationRole);
    table.grant(createLocationRole, 'dynamodb:PutItem');

    // createLocation Lambda function
    const createLocationLambda = new nodejs.NodejsFunction(this, 'CreateLocation', {
      entry: path.join(__dirname, '../src/handlers/create-location.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_24_X,
      timeout: cdk.Duration.seconds(30),
      role: createLocationRole,
      logGroup: createLocationLogGroup,
      loggingFormat: lambda.LoggingFormat.JSON,
      environment: {
        TABLE_NAME: table.tableName,
        NOMINATIM_BASE_URL: props.nominatimBaseUrl,
        NOMINATIM_USER_AGENT: props.nominatimUserAgent
      },
      bundling: {
        bundleAwsSDK: true
      }
    });

    // Resources for updateLocation Lambda function
    // Log group for updateLocation Lambda function
    const updateLocationLogGroup = new logs.LogGroup(this, 'UpdateLocationLogGroup', {
      retention: isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Execution role for updateLocation Lambda function
    const updateLocationRole = new iam.Role(this, 'UpdateLocationRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    updateLocationLogGroup.grantWrite(updateLocationRole);
    table.grant(updateLocationRole, 'dynamodb:UpdateItem');

    // updateLocation Lambda function
    const updateLocationLambda = new nodejs.NodejsFunction(this, 'UpdateLocation', {
      entry: path.join(__dirname, '../src/handlers/update-location.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_24_X,
      timeout: cdk.Duration.seconds(30),
      role: updateLocationRole,
      logGroup: updateLocationLogGroup,
      loggingFormat: lambda.LoggingFormat.JSON,
      environment: {
        TABLE_NAME: table.tableName,
        NOMINATIM_BASE_URL: props.nominatimBaseUrl,
        NOMINATIM_USER_AGENT: props.nominatimUserAgent
      },
      bundling: {
        bundleAwsSDK: true
      }
    });

    // Resources for API Gateway
    // Log group for API Gateway access logs
    const apiAccessLogGroup = new logs.LogGroup(this, 'ApiAccessLogGroup', {
      retention: isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'BranchLocationApi', {
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      cloudWatchRole: true,
      deployOptions: {
        stageName: props.environment,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.ERROR,
        accessLogDestination: new apigateway.LogGroupLogDestination(apiAccessLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      }
    });

    const locationsResource = api.root.addResource('locations');
    const locationResource = locationsResource.addResource('{locationId}');

    // Integration for getLocation Lmabda function
    const getLocationIntegration = new apigateway.LambdaIntegration(getLocationLambda, {
      proxy: true,
    });
    locationResource.addMethod('GET', getLocationIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Integration for listLocations Lambda function
    const listLocationsIntegration = new apigateway.LambdaIntegration(listLocationsLambda, {
      proxy: true,
    });
    locationsResource.addMethod('GET', listLocationsIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Integration for createLocation Lambda function
    const createLocationIntegration = new apigateway.LambdaIntegration(createLocationLambda, {
      proxy: true,
    });
    locationsResource.addMethod('POST', createLocationIntegration, {
      authorizationType: apigateway.AuthorizationType.IAM
    });

    // Integration for updateLocation Lambda function
    const updateLocationIntegration = new apigateway.LambdaIntegration(updateLocationLambda, {
      proxy: true,
    });
    locationResource.addMethod('PUT', updateLocationIntegration, {
      authorizationType: apigateway.AuthorizationType.IAM
    });

    // Cloudwatch Alarm for API responses with 5XX status codes
    new cloudwatch.Alarm(this, 'ApiServerErrorAlarm', {
      metric: api.metricServerError({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum'
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Cloudformation Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url
    });
  }
}


