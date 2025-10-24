'use server';

import { analyzePDFWithSchema } from '@/services/openai';
import { z } from 'zod';
import { ZodError } from 'zod';

type AnalysisResult = Record<string, unknown> | null;

export interface PlaygroundState {
  data?: AnalysisResult;
  error?: string;
  fieldErrors?: {
    pdfFile?: string[];
    systemPrompt?: string[];
    jsonSchema?: string[];
  };
}

const PlaygroundSchema = z.object({
  pdfFile: z.instanceof(File, { message: 'Please select a PDF file.' }),
  systemPrompt: z.string().min(1, { message: 'System prompt cannot be empty.' }),
  jsonSchema: z.string().min(1, { message: 'JSON schema cannot be empty.' }),
});

export async function analyze(
  prevState: PlaygroundState,
  formData: FormData
): Promise<PlaygroundState> {
  const validatedFields = PlaygroundSchema.safeParse({
    pdfFile: formData.get('pdfFile'),
    systemPrompt: formData.get('systemPrompt'),
    jsonSchema: formData.get('jsonSchema'),
  });

  if (!validatedFields.success) {
    return {
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await analyzePDFWithSchema(
      validatedFields.data.pdfFile,
      validatedFields.data.systemPrompt,
      validatedFields.data.jsonSchema
    );
    return { data: result };
  } catch (e) {
    if (e instanceof ZodError) {
      return { error: `AI response validation failed: ${e.message}` };
    } else if (e instanceof Error) {
      return { error: e.message };
    }
    return { error: 'An unknown error occurred.' };
  }
}
