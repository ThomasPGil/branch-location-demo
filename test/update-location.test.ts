import type { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../src/handlers/update-location';

const dynamoDbMock = mockClient(DynamoDBDocumentClient);

function createEvent(
  locationId: string | undefined,
  body: object
): APIGatewayProxyEvent {
  return {
    pathParameters: locationId ? { locationId } : null,
    body: JSON.stringify(body)
  } as APIGatewayProxyEvent;
}

const requestBody = {
  locationName: 'Updated Dallas Branch',
  city: 'Dallas',
  state: 'Texas',
  country: 'United States'
};

beforeEach(() => {
  dynamoDbMock.reset();

  process.env.TABLE_NAME = 'test-location-table';
  process.env.NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
  process.env.NOMINATIM_USER_AGENT = 'branch-location-demo/1.0';
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('updates an existing location and its coordinates', async () => {
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

  const updatedLocation = {
    LocationId: 'DAL-001',
    LocationName: 'Updated Dallas Branch',
    City: 'Dallas',
    State: 'Texas',
    Country: 'United States',
    Latitude: 32.7762719,
    Longitude: -96.7968559
  };

  dynamoDbMock.on(UpdateCommand).resolves({
    Attributes: updatedLocation
  });

  const response = await handler(createEvent('DAL-001', requestBody));

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body)).toEqual(updatedLocation);

  const calls = dynamoDbMock.commandCalls(UpdateCommand);

  expect(calls).toHaveLength(1);
  expect(calls[0].args[0].input).toEqual(
    expect.objectContaining({
      TableName: 'test-location-table',
      Key: {
        LocationId: 'DAL-001'
      },
      ConditionExpression: 'attribute_exists(#locationId)',
      ReturnValues: 'ALL_NEW',
      ExpressionAttributeValues: {
        ':locationName': 'Updated Dallas Branch',
        ':city': 'Dallas',
        ':state': 'Texas',
        ':country': 'United States',
        ':latitude': 32.7762719,
        ':longitude': -96.7968559
      }
    })
  );

  expect(calls[0].args[0].input.UpdateExpression).toContain('#locationName');
});

test('returns 404 when the location does not exist', async () => {
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

  const conditionError = new Error('Conditional request failed');
  conditionError.name = 'ConditionalCheckFailedException';

  dynamoDbMock.on(UpdateCommand).rejects(conditionError);

  const response = await handler(createEvent('DOES-NOT-EXIST', requestBody));

  expect(response.statusCode).toBe(404);
  expect(JSON.parse(response.body)).toEqual({
    message: 'Location not found'
  });
});
