import * as cdk from 'aws-cdk-lib/core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { BranchLocationDemoStack } from '../lib/branch-location-demo-stack';

const app = new cdk.App();

const stack = new BranchLocationDemoStack(app, 'TestStack', {
  application: 'branch-location-demo',
  environment: 'development',
  nominatimBaseUrl: 'https://nominatim.openstreetmap.org',
  nominatimUserAgent: 'branch-location-demo-test/1.0'
});

const template = Template.fromStack(stack);

test('creates the branch location table', () => {
  template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      {
        AttributeName: 'LocationId',
        KeyType: 'HASH'
      }
    ]
  });
});

test('creates a public GET Lambda proxy method', () => {
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    AuthorizationType: 'NONE',
    HttpMethod: 'GET',
    Integration: {
      IntegrationHttpMethod: 'POST',
      Type: 'AWS_PROXY'
    }
  });
});

test('enables API access logs and metrics', () => {
  template.hasResourceProperties('AWS::ApiGateway::Stage', {
    StageName: 'development',
    AccessLogSetting: {
      DestinationArn: Match.anyValue(),
      Format: Match.anyValue()
    },
    MethodSettings: Match.arrayWith([
      Match.objectLike({
        DataTraceEnabled: false,
        LoggingLevel: 'ERROR',
        MetricsEnabled: true
      })
    ])
  });
});

test('creates one Lambda function for each operation', () => {
  template.resourceCountIs('AWS::Lambda::Function', 4);
});

test('creates an IAM-protected POST method', () => {
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    AuthorizationType: 'AWS_IAM',
    HttpMethod: 'POST',
    Integration: {
      IntegrationHttpMethod: 'POST',
      Type: 'AWS_PROXY'
    }
  });
});

test('creates an IAM-protected PUT method', () => {
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    AuthorizationType: 'AWS_IAM',
    HttpMethod: 'PUT',
    Integration: {
      IntegrationHttpMethod: 'POST',
      Type: 'AWS_PROXY'
    }
  });
});
