import React from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { Database } from 'lucide-react';

export default function SetupScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-8 text-center">
          <Database className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Supabase Configuration Required</h1>
          <p className="text-blue-100">Please configure your database connection to continue.</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="prose prose-blue max-w-none">
            <p className="text-gray-600 leading-relaxed">
              This application requires a Supabase PostgreSQL database to manage its relational data (Admins, Teachers, Students, Classes, Subjects, and Scores).
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Step 1: Set Environment Variables</h3>
            <p className="text-gray-600 mb-2">Add the following keys to your project's secrets panel or <code>.env</code> file:</p>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-sm text-gray-700">
              VITE_SUPABASE_URL="your-supabase-project-url"<br />
              VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Step 2: Run the Database Schema</h3>
            <p className="text-gray-600 mb-2">Copy the contents of <code>supabase-schema.sql</code> and execute it in your Supabase project's SQL Editor to create the necessary tables.</p>
            
            <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 flex items-start">
              <span className="text-2xl mr-3">💡</span>
              <p className="text-sm mt-1">After adding your environment variables, the development server will automatically restart and this screen will disappear.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
