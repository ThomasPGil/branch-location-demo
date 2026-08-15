import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getCoordinates, LocationNotFoundError } from '../services/openstreetmap-helper';

interface CreateLocationRequest {
  locationName?: string;
  city?: string;
  state?: string;
  country?: string;
}

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const tableName = process.env.TABLE_NAME;
  
  if (!tableName) {
    throw new Error('Table name missing');
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Request body is required' })
    };
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Invalid JSON' })
    };
  }

  if (typeof parsedBody !== 'object' || parsedBody === null || Array.isArray(parsedBody)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Invalid request body' })
    };
  }

  const request = parsedBody as CreateLocationRequest;

  if (
    typeof request.locationName !== 'string' ||
    request.locationName.trim().length === 0 ||
    typeof request.city !== 'string' ||
    request.city.trim().length === 0 ||
    typeof request.state !== 'string' ||
    request.state.trim().length === 0 ||
    typeof request.country !== 'string' ||
    request.country.trim().length === 0
  ) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'locationName, city, state, and country are required' })
    };
  }

  try {
    const coordinates = await getCoordinates(request.city, request.state, request.country);

    const location = {
      LocationId: randomUUID(),
      LocationName: request.locationName.trim(),
      City: request.city.trim(),
      State: request.state.trim(),
      Country: request.country.trim(),
      Latitude: coordinates.latitude,
      Longitude: coordinates.longitude
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: location
    });

    await documentClient.send(command);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location)
    };
  } catch (error) {
    if (error instanceof LocationNotFoundError) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'No matching location was found' })
      };
    }

    console.error('Error creating location:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};