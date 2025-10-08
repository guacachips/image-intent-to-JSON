'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { analyze, PlaygroundState } from './actions';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const initialState: PlaygroundState = {
  data: undefined,
  error: undefined,
  fieldErrors: undefined,
};

const defaultSystemPrompt = `Analyze the user's text and extract relevant information.

Your response must be a valid JSON object following the provided schema.

If the text is unusable or cannot be processed, set "isTaskRefused" to true and provide a "refusalReason".`;

const defaultJsonSchema = `z.object({
  isTaskRefused: z.boolean(),
  refusalReason: z.string().nullable(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  topics: z.array(z.string()),
  entities: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
    })
  ),
})`;

const sampleTexts = [
  "I love the new iPhone 15! Apple really outdid themselves this time. The camera quality is amazing and the battery life is incredible.",
  "The weather in San Francisco today is terrible. It's been raining all morning and I forgot my umbrella at home.",
  "Breaking: Tesla announces new factory in Austin, Texas. CEO Elon Musk says this will create 10,000 new jobs.",
];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-500"
    >
      {pending ? 'Analyzing...' : 'Analyze Text'}
    </button>
  );
}

export default function TextIntentPage() {
  const [state, formAction] = useActionState(analyze, initialState);
  const [userText, setUserText] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [jsonSchema, setJsonSchema] = useState(defaultJsonSchema);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((state.data || state.error) && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state]);

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 w-full max-w-4xl">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            Text Intent to JSON Playground
          </h1>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            ← Image Intent
          </Link>
        </div>

        <form action={formAction} className="space-y-6">
          <div>
            <label htmlFor="userText" className="block text-lg font-medium mb-2">
              User Text Input
            </label>
            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-400">Quick samples (click to use):</p>
              <div className="space-y-2">
                {sampleTexts.map((text, index) => (
                  <div
                    key={index}
                    className="p-3 bg-background border rounded-md cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all text-sm"
                    onClick={() => setUserText(text)}
                  >
                    {text}
                  </div>
                ))}
              </div>
            </div>
            <textarea
              id="userText"
              name="userText"
              rows={6}
              className="mt-1 block w-full bg-background border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg p-2"
              required
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="Enter your text here..."
            ></textarea>
            {state.fieldErrors?.userText && (
              <p className="mt-2 text-sm text-red-500">
                {state.fieldErrors.userText.join(', ')}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="systemPrompt"
              className="block text-lg font-medium"
            >
              System Prompt
            </label>
            <textarea
              id="systemPrompt"
              name="systemPrompt"
              rows={8}
              className="mt-1 block w-full bg-background border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg p-2 font-mono"
              required
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            ></textarea>
            {state.fieldErrors?.systemPrompt && (
              <p className="mt-2 text-sm text-red-500">
                {state.fieldErrors.systemPrompt.join(', ')}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="jsonSchema"
              className="block text-lg font-medium"
            >
              Zod Schema
            </label>
            <textarea
              id="jsonSchema"
              name="jsonSchema"
              rows={8}
              className="mt-1 block w-full bg-background border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg p-2 font-mono"
              required
              value={jsonSchema}
              onChange={(e) => setJsonSchema(e.target.value)}
            ></textarea>
            {state.fieldErrors?.jsonSchema && (
              <p className="mt-2 text-sm text-red-500">
                {state.fieldErrors.jsonSchema.join(', ')}
              </p>
            )}
          </div>

          <SubmitButton />
        </form>

        {(state.data || state.error) && (
          <div ref={resultsRef} className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Result</h2>
            {state.data && (
              <pre className="p-4 rounded-md overflow-x-auto">
                {JSON.stringify(state.data, null, 2)}
              </pre>
            )}
            {state.error && (
              <div className="bg-red-900 border border-red-700 p-4 rounded-md">
                <p className="font-bold">Error:</p>
                <p>{state.error}</p>
              </div>
            )}
          </div>
        )}
      </main>
      <footer className="row-start-3 flex gap-4 items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/guacachips/image-intent-to-JSON"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            aria-hidden="true"
            height="16"
            viewBox="0 0 16 16"
            version="1.1"
            width="16"
            className="fill-current"
          >
            <path
              fillRule="evenodd"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            ></path>
          </svg>
          View on GitHub
        </a>
      </footer>
    </div>
  );
}
