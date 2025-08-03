import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, SparklesIcon, CogIcon, ZapIcon } from '@heroicons/react/24/outline';

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-xl font-bold font-mono">
              clixen<span className="text-zinc-500">.ai</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/auth"
                className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-white/90 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-6xl font-bold font-mono mb-6">
            AI-Powered
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
              n8n Workflows
            </span>
          </h1>
          <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
            Transform natural language into functional n8n workflows.
            Deploy, test, and manage automation pipelines with AI assistance.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/auth"
              className="bg-white text-black px-8 py-3 rounded-md font-medium hover:bg-white/90 transition-colors flex items-center space-x-2"
            >
              <span>Start Building</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <button className="border border-white/20 px-8 py-3 rounded-md font-medium hover:bg-white/5 transition-colors">
              View Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-white" />
            <h3 className="text-xl font-semibold mb-2">AI Generation</h3>
            <p className="text-zinc-400">
              Describe your workflow in plain English and watch AI generate
              the complete n8n automation.
            </p>
          </div>
          <div className="text-center">
            <CogIcon className="w-12 h-12 mx-auto mb-4 text-white" />
            <h3 className="text-xl font-semibold mb-2">Auto Deployment</h3>
            <p className="text-zinc-400">
              Workflows are automatically validated, deployed, and configured
              in your n8n instance.
            </p>
          </div>
          <div className="text-center">
            <ZapIcon className="w-12 h-12 mx-auto mb-4 text-white" />
            <h3 className="text-xl font-semibold mb-2">Real-time Testing</h3>
            <p className="text-zinc-400">
              Test your workflows instantly with built-in validation
              and error handling.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to automate?</h2>
          <p className="text-zinc-400 mb-8">
            Join developers building the future of workflow automation.
          </p>
          <Link
            to="/auth"
            className="bg-white text-black px-8 py-3 rounded-md font-medium hover:bg-white/90 transition-colors inline-flex items-center space-x-2"
          >
            <span>Start Free Trial</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-zinc-500">
            <p>&copy; 2024 Clixen. Built with AI for the future of automation.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}