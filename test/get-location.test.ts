import type { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../src/handlers/get-location';

const dynamoDbMock = mockClient(DynamoDBDocumentClient);

function createEvent(locationId?: string): APIGatewayProxyEvent {
  return {
    pathParameters: locationId ? { locationId } : null
  } as APIGatewayProxyEvent;
}

beforeEach(() => {
  dynamoDbMock.reset();
  process.env.TABLE_NAME = 'test-location-table';
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('returns 404 when the location does not exist', async () => {
  dynamoDbMock.on(GetCommand).resolves({});

  const response = await handler(createEvent('DAL-001'));

  expect(response.statusCode).toBe(404);
  expect(JSON.parse(response.body)).toEqual({
    message: 'Location not found'
  });
});

test('returns 200 when the location exists', async () => {
  const location = {
    LocationId: 'DAL-001',
    LocationName: 'Dallas Branch',
    City: 'Dallas',
    State: 'Texas',
    Country: 'United States',
    Latitude: 32.7762719,
    Longitude: -96.7968559
  };

  dynamoDbMock.on(GetCommand).resolves({
    Item: location
  });

  const response = await handler(createEvent('DAL-001'));

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body)).toEqual(location);

  const calls = dynamoDbMock.commandCalls(GetCommand);

  expect(calls[0].args[0].input).toEqual({
    TableName: 'test-location-table',
    Key: {
      LocationId: 'DAL-001'
    }
  });
});
