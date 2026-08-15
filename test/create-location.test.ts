import type { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../src/handlers/create-location';

const dynamoDbMock = mockClient(DynamoDBDocumentClient);

function createEvent(body: object): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body)
  } as APIGatewayProxyEvent;
}

beforeEach(() => {
  dynamoDbMock.reset();

  process.env.TABLE_NAME = 'test-location-table';
  process.env.NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
  process.env.NOMINATIM_USER_AGENT = 'branch-location-demo/1.0';
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('creates a location with coordinates', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify([
        {
          lat: '32.7762719',
          lon: '-96.7968559'
        }
      ]),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  );

  dynamoDbMock.on(PutCommand).resolves({});

  const response = await handler(
    createEvent({
      locationName: 'Dallas Branch',
      city: 'Dallas',
      state: 'Texas',
      country: 'United States'
    })
  );

  expect(response.statusCode).toBe(201);

  const responseBody = JSON.parse(response.body);

  expect(responseBody).toEqual({
    LocationId: expect.any(String),
    LocationName: 'Dallas Branch',
    City: 'Dallas',
    State: 'Texas',
    Country: 'United States',
    Latitude: 32.7762719,
    Longitude: -96.7968559
  });

  const calls = dynamoDbMock.commandCalls(PutCommand);

  expect(calls).toHaveLength(1);
  expect(calls[0].args[0].input).toEqual({
    TableName: 'test-location-table',
    Item: responseBody
  });
});

test('returns 400 when the location cannot be found', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  );

  const response = await handler(
    createEvent({
      locationName: 'Unknown Branch',
      city: 'Unknown City',
      state: 'Unknown State',
      country: 'Unknown Country'
    })
  );

  expect(response.statusCode).toBe(400);
  expect(JSON.parse(response.body)).toEqual({
    message: 'No matching location was found'
  });
  expect(dynamoDbMock.commandCalls(PutCommand)).toHaveLength(0);
});
