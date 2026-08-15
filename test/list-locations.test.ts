import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../src/handlers/list-locations';

const dynamoDbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  dynamoDbMock.reset();
  process.env.TABLE_NAME = 'test-location-table';
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('returns locations from every DynamoDB page', async () => {
  const dallas = {
    LocationId: 'DAL-001',
    LocationName: 'Dallas Branch',
    City: 'Dallas',
    State: 'Texas',
    Country: 'United States',
    Latitude: 32.7762719,
    Longitude: -96.7968559
  };

  const durham = {
    LocationId: 'DUR-001',
    LocationName: 'Durham Branch',
    City: 'Durham',
    State: 'County Durham',
    Country: 'United Kingdom',
    Latitude: 54.666667,
    Longitude: -1.75
  };

  dynamoDbMock
    .on(ScanCommand)
    .resolvesOnce({
      Items: [dallas],
      LastEvaluatedKey: {
        LocationId: 'DAL-001'
      }
    })
    .resolvesOnce({
      Items: [durham]
    });

  const response = await handler();

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body)).toEqual([dallas, durham]);

  const calls = dynamoDbMock.commandCalls(ScanCommand);

  expect(calls).toHaveLength(2);
  expect(calls[1].args[0].input.ExclusiveStartKey).toEqual({
    LocationId: 'DAL-001'
  });
});
