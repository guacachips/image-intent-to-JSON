import OpenAI from 'openai';
import { z } from 'zod';

export async function analyzeImageWithSchema(
  imageUrl: string,
  systemPrompt: string,
  zodSchemaString: string
) {
  if (!process.env.OPEN_AI_SECRET_KEY) {
    throw new Error(
      'OPEN_AI_SECRET_KEY is not set in the environment variables.'
    );
  }

  let DynamicSchema;
  try {
    const schemaFactory = new Function('z', `return ${zodSchemaString}`);
    DynamicSchema = schemaFactory(z);
  } catch (e) {
    console.error('Schema parsing failed:', e);
    if (e instanceof Error) {
      throw new Error(`Schema parsing error: ${e.message}`);
    }
    throw new Error('An unknown error occurred during schema parsing.');
  }

  if (!DynamicSchema || typeof DynamicSchema.parse !== 'function') {
    throw new Error(
      'Failed to create a valid Zod schema from the provided string.'
    );
  }

  const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_SECRET_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `${systemPrompt}\n\nYou must respond in a valid JSON format, adhering to the following Zod schema:\n\n${zodSchemaString}`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Here is the image to analyze. Please operate as defined in the system message.`,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'low',
            },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  const parsedJson = JSON.parse(content);
  return DynamicSchema.parse(parsedJson);
}
