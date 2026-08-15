#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { BranchLocationDemoStack } from '../lib/branch-location-demo-stack';

const app = new cdk.App();

const application = app.node.tryGetContext('application') || 'branch-location-demo';
const environment = app.node.tryGetContext('environment') || 'development';
const nominatimBaseUrl = app.node.tryGetContext('nominatimBaseUrl');
const nominatimUserAgent = app.node.tryGetContext('nominatimUserAgent');

if (typeof application !== 'string' || application.length === 0) {
  throw new Error('application must be a non-empty string');
}

if (environment !== 'development' && environment !== 'production') {
  throw new Error('environment must be either "development" or "production"');
}

if (typeof nominatimBaseUrl !== 'string' || nominatimBaseUrl.length === 0) {
  throw new Error('nominatimBaseUrl must be a non-empty string');
}

if (typeof nominatimUserAgent !== 'string' || nominatimUserAgent.length === 0) {
  throw new Error('nominatimUserAgent must be a non-empty string');
}

new BranchLocationDemoStack(app, 'BranchLocationDemoStack', {
  application,
  environment,
  nominatimBaseUrl,
  nominatimUserAgent
});
