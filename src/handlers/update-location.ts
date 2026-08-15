import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getCoordinates, LocationNotFoundError } from '../services/openstreetmap-helper';

interface UpdateLocationRequest {
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

  const locationId = event.pathParameters?.locationId?.trim();

  if (!locationId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'locationId is required' })
    };
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
      body: JSON.stringify({ message: 'Invalid JSON in request body' })
    };
  }

  if (typeof parsedBody !== 'object' || parsedBody === null || Array.isArray(parsedBody)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Invalid request body' })
    };
  }

  const request = parsedBody as UpdateLocationRequest;

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
      body: JSON.stringify({ message: 'Invalid request body' })
    };
  }

  try {
    const coordinates = await getCoordinates(request.city, request.state, request.country);

    const command = new UpdateCommand({
      TableName: tableName,
      Key: { LocationId: locationId },
      UpdateExpression: 'SET #locationName = :locationName, #city = :city, #state = :state, #country = :country, #latitude = :latitude, #longitude = :longitude',
      ConditionExpression: 'attribute_exists(#locationId)',
      ExpressionAttributeNames: {
        '#locationId': 'LocationId',
        '#locationName': 'LocationName',
        '#city': 'City',
        '#state': 'State',
        '#country': 'Country',
        '#latitude': 'Latitude',
        '#longitude': 'Longitude'
      },
      ExpressionAttributeValues: {
        ':locationName': request.locationName.trim(),
        ':city': request.city.trim(),
        ':state': request.state.trim(),
        ':country': request.country.trim(),
        ':latitude': coordinates.latitude,
        ':longitude': coordinates.longitude
      },
      ReturnValues: 'ALL_NEW'
    });

    const response = await documentClient.send(command);

    if (!response.Attributes) {
      throw new Error('Failed to update location');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response.Attributes)
    };
  } catch (error) {
    if (error instanceof LocationNotFoundError) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'No matching location was found' })
      };
    }

    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Location not found' })
      };
    }

    console.error('Error updating location:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};