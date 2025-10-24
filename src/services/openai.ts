import OpenAI from 'openai';
import { z } from 'zod';

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in the environment variables.');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function parseZodSchema(zodSchemaString: string) {
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
    throw new Error('Failed to create a valid Zod schema from the provided string.');
  }

  return DynamicSchema;
}

function extractAndValidateContent(completion: OpenAI.Chat.Completions.ChatCompletion, schema: z.ZodSchema) {
  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  const parsedJson = JSON.parse(content);
  return schema.parse(parsedJson);
}

export async function analyzeTextWithSchema(
  userText: string,
  systemPrompt: string,
  zodSchemaString: string
) {
  const openai = getOpenAIClient();
  const schema = parseZodSchema(zodSchemaString);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `${systemPrompt}\n\nYou must respond in a valid JSON format, adhering to the following Zod schema:\n\n${zodSchemaString}`,
      },
      {
        role: 'user',
        content: userText,
      },
    ],
    response_format: { type: 'json_object' },
  });

  return extractAndValidateContent(completion, schema);
}

export async function analyzeImageWithSchema(
  imageUrl: string,
  systemPrompt: string,
  zodSchemaString: string
) {
  const openai = getOpenAIClient();
  const schema = parseZodSchema(zodSchemaString);

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

  return extractAndValidateContent(completion, schema);
}

export async function analyzePDFWithSchema(
  pdfFile: File,
  systemPrompt: string,
  zodSchemaString: string
) {
  const openai = getOpenAIClient();
  const schema = parseZodSchema(zodSchemaString);

  const uploadedFile = await openai.files.create({
    file: pdfFile,
    purpose: 'assistants',
  });

  const assistant = await openai.beta.assistants.create({
    model: 'gpt-4o-mini',
    instructions: `${systemPrompt}\n\nYou must respond in a valid JSON format, adhering to the following Zod schema:\n\n${zodSchemaString}`,
    tools: [{ type: 'file_search' }],
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: 'user',
        content: 'Please analyze this PDF document according to the system instructions.',
        attachments: [
          {
            file_id: uploadedFile.id,
            tools: [{ type: 'file_search' }],
          },
        ],
      },
    ],
  });

  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id,
  });

  if (run.status !== 'completed') {
    throw new Error(`Run failed with status: ${run.status}`);
  }

  const messages = await openai.beta.threads.messages.list(thread.id);
  const assistantMessage = messages.data.find((msg) => msg.role === 'assistant');

  if (!assistantMessage || assistantMessage.content[0].type !== 'text') {
    throw new Error('No text response from assistant');
  }

  let content = assistantMessage.content[0].text.value;

  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    content = jsonMatch[1];
  }

  await openai.beta.assistants.delete(assistant.id);
  await openai.files.delete(uploadedFile.id);

  const parsedJson = JSON.parse(content);
  return schema.parse(parsedJson);
}
