import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const handler = async (): Promise<APIGatewayProxyResult> => {
  const tableName = process.env.TABLE_NAME;

  if (!tableName) {
    throw new Error('Table name missing');
  }

  try {
    const locations: Record<string, unknown>[] = [];
    let lastEvaluatedKey: ScanCommandInput['ExclusiveStartKey'];

    do {
      const command = new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const response = await documentClient.send(command);

      locations.push(...(response.Items ?? []));
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locations),
    };
  } catch (error) {
    console.error('Error listing locations:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};