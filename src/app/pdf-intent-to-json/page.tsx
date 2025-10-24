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

const samplePDFs: string[] = [];

const defaultSystemPrompt = `Analyze this medical prescription document and extract all relevant information.

Your response must be a valid JSON object. Extract patient information (name, date of birth, age, address, phone number), medications with dosage and frequency, doctor information, date, diagnosis, and any checkboxes that are checked in the document.

For checkboxes, look for checkmarks, X marks, or filled boxes and extract the label/text associated with each checked box.

If the document is unusable (e.g., blurry, corrupted, not a prescription), set "isTaskRefused" to true and provide a "refusalReason".`;

const defaultJsonSchema = `z.object({
  isTaskRefused: z.boolean(),
  refusalReason: z.string().nullable(),
  patientName: z.string().nullable(),
  patientDob: z.string().nullable(),
  patientAge: z.number().nullable(),
  patientAddress: z.string().nullable(),
  patientPhoneNumber: z.string().nullable(),
  date: z.string().nullable(),
  medications: z.array(
    z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string(),
    })
  ),
  doctorName: z.string().nullable(),
  diagnosis: z.string().nullable(),
  checkboxesChecked: z.array(
    z.object({
      name: z.string(),
    })
  ),
})`;

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed"
    >
      {pending ? 'Analyzing...' : 'Analyze PDF'}
    </button>
  );
}

export default function PDFIntentPage() {
  const [state, formAction] = useActionState(analyze, initialState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [jsonSchema, setJsonSchema] = useState(defaultJsonSchema);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      updateHiddenInput(file);
    }
  };

  const handleSampleSelect = async (src: string) => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const file = new File([blob], src.split('/').pop() || 'sample.pdf', {
        type: 'application/pdf',
      });
      setSelectedFile(file);
      updateHiddenInput(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error loading sample PDF:', error);
    }
  };

  const updateHiddenInput = (file: File) => {
    if (hiddenFileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      hiddenFileInputRef.current.files = dataTransfer.files;
    }
  };

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
            PDF Intent to JSON Playground
          </h1>
          <div className="flex gap-4">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              ← Image Intent
            </Link>
            <Link
              href="/text-intent-to-json"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Text Intent →
            </Link>
          </div>
        </div>

        <form action={formAction} className="space-y-6">
          <div>
            <label className="block text-lg font-medium mb-2">
              Upload PDF or Select Sample
            </label>

            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="block w-full text-sm border rounded-md p-2 bg-background cursor-pointer"
              />
            </div>

            {samplePDFs.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Sample PDFs:</p>
                <div className="space-y-2">
                  {samplePDFs.map((src) => (
                    <div
                      key={src}
                      className={`p-3 bg-background border rounded-md cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all ${
                        selectedFile?.name === src.split('/').pop()
                          ? 'ring-2 ring-blue-500'
                          : ''
                      }`}
                      onClick={() => handleSampleSelect(src)}
                    >
                      {src.split('/').pop()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedFile && (
              <div className="mb-4 p-4 bg-gray-900 border rounded-md">
                <p className="text-sm text-gray-400 mb-1">Selected File:</p>
                <p className="font-semibold">{selectedFile.name}</p>
                <p className="text-sm text-gray-400">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <input
              ref={hiddenFileInputRef}
              type="file"
              name="pdfFile"
              className="hidden"
              accept=".pdf"
            />
            {state.fieldErrors?.pdfFile && (
              <p className="mt-2 text-sm text-red-500">
                {state.fieldErrors.pdfFile.join(', ')}
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

          <SubmitButton disabled={!selectedFile} />
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
