# Branch Location Demo

##AI was used for this README EXCEPT for the Production Improvements list.

This project creates a REST API for storing and retrieving branch locations.

When a location is created or updated, the API uses OpenStreetMap Nominatim to find the latitude and longitude for the supplied city, state, and country. The complete location is then stored in DynamoDB.

## Architecture

The project creates:

- An API Gateway REST API
- Four Lambda functions for creating, updating, getting, and listing locations
- A DynamoDB table
- IAM execution roles with only the permissions needed by each Lambda
- CloudWatch log groups and an API 5XX alarm

## API Endpoints

| Method | Path | Authorization | Description |
|---|---|---|---|
| POST | `/locations` | AWS IAM | Create a location |
| PUT | `/locations/{locationId}` | AWS IAM | Update a location |
| GET | `/locations/{locationId}` | Public | Get one location |
| GET | `/locations` | Public | List all locations |

Requests to the POST and PUT endpoints must be signed with AWS credentials that have `execute-api:Invoke` permission.

The stack does not create IAM identities for API consumers. An administrator must grant approved callers permission to use the POST and PUT methods.

Example request body:

```json
{
  "locationName": "Dallas Branch",
  "city": "Dallas",
  "state": "Texas",
  "country": "United States"
}
```

The PUT endpoint performs a full update, so all four request fields are required.

The API generates the Location ID and adds the latitude and longitude returned by Nominatim.

## Build and Test

Run the following commands to install the dependencies, build the project, run the tests, and create the CloudFormation template:

    npm ci
    npm run build
    npm test
    npx cdk synth

Before deploying for the first time, the AWS account must be bootstrapped:

    npx cdk bootstrap

Deploy the development environment:

    npx cdk deploy -c environment=development

The API URL is displayed as a CloudFormation output after deployment.

## Configuration

Application, environment, Nominatim URL, and Nominatim User-Agent values are configured through CDK context in `cdk.json`.

The production environment enables DynamoDB point-in-time recovery, deletion protection, retained data, and longer CloudWatch log retention.

## Notes

The coordinates represent the city returned by Nominatim. They are not the exact street coordinates of the branch.

Geocoding data is provided by [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) under the ODbL 1.0 license. Use of Nominatim must follow the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).

## Production Improvements

1. Use separate AWS accounts for development and production.
2. Add one CodePipeline for the service. It would build, test, and deploy to development before deploying to production after manual approval.
3. Add least-privilege cross-account deployment roles.
4. Add a deployment helper script for prerequisite roles, the pipeline, and application stacks.
5. Add a CloudWatch dashboard and send alarms to an SNS notification topic.
6. Add AWS WAF and API Gateway throttling.
7. Add caching and rate limiting for Nominatim requests. The public Nominatim service has a maximum usage rate of one request per second.
8. Add pagination to the list endpoint so large result sets are not returned in one response.
9. Add request validation at API Gateway.
10. Add a custom domain and ACM certificate.
11. Add integration tests and a CloudWatch Synthetics canary.
12. Add duplicate detection or idempotency handling to prevent the same branch from being created more than once.
