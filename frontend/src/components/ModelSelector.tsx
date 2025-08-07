import React from 'react';
import { Bot, Brain, Sparkles, Zap, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export type AIModel = 
  | 'gpt-4.1-2025-04-14'
  | 'gpt-4.1-mini-2025-04-14'
  | 'claude-opus-4-20250514'
  | 'claude-sonnet-4-20250514'
  | 'claude-3-5-haiku-20241022';

export interface ModelConfig {
  id: AIModel;
  name: string;
  provider: 'openai' | 'anthropic';
  description: string;
  icon: React.ReactNode;
  capabilities: string[];
  pricing: 'low' | 'medium' | 'high';
  speed: 'fast' | 'medium' | 'slow';
  quality: 'good' | 'excellent' | 'superior';
}

const modelConfigs: Record<AIModel, ModelConfig> = {
  'gpt-4.1-2025-04-14': {
    id: 'gpt-4.1-2025-04-14',
    name: 'GPT-4.1',
    provider: 'openai',
    description: 'OpenAI\'s flagship model with exceptional reasoning',
    icon: <Bot className="w-4 h-4" />,
    capabilities: ['Text', 'Code', 'Analysis', 'Creative'],
    pricing: 'high',
    speed: 'medium',
    quality: 'superior'
  },
  'gpt-4.1-mini-2025-04-14': {
    id: 'gpt-4.1-mini-2025-04-14',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    description: 'Fast and efficient version of GPT-4.1',
    icon: <Zap className="w-4 h-4" />,
    capabilities: ['Text', 'Code', 'Analysis'],
    pricing: 'medium',
    speed: 'fast',
    quality: 'excellent'
  },
  'claude-opus-4-20250514': {
    id: 'claude-opus-4-20250514',
    name: 'Claude 4 Opus',
    provider: 'anthropic',
    description: 'Most capable and intelligent model with superior reasoning',
    icon: <Brain className="w-4 h-4" />,
    capabilities: ['Text', 'Code', 'Analysis', 'Creative', 'Research'],
    pricing: 'high',
    speed: 'slow',
    quality: 'superior'
  },
  'claude-sonnet-4-20250514': {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude 4 Sonnet',
    provider: 'anthropic',
    description: 'High-performance model with exceptional reasoning and efficiency',
    icon: <Sparkles className="w-4 h-4" />,
    capabilities: ['Text', 'Code', 'Analysis', 'Creative'],
    pricing: 'medium',
    speed: 'medium',
    quality: 'excellent'
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fastest model for quick responses',
    icon: <Zap className="w-4 h-4" />,
    capabilities: ['Text', 'Code'],
    pricing: 'low',
    speed: 'fast',
    quality: 'good'
  }
};

interface ModelSelectorProps {
  selectedModel: AIModel;
  onModelChange: (model: AIModel) => void;
  disabled?: boolean;
  className?: string;
}

export default function ModelSelector({ 
  selectedModel, 
  onModelChange, 
  disabled = false,
  className = ''
}: ModelSelectorProps) {
  const currentModel = modelConfigs[selectedModel];

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'text-emerald-600';
      case 'anthropic': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getPricingColor = (pricing: string) => {
    switch (pricing) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled}
          className={`justify-between min-w-[200px] ${className}`}
        >
          <div className="flex items-center gap-2">
            {currentModel.icon}
            <span className="font-medium">{currentModel.name}</span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 bg-white border border-gray-200 shadow-lg rounded-lg p-2">
        <DropdownMenuLabel className="text-sm font-semibold text-gray-700 px-2 py-1">
          Choose AI Model
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* OpenAI Models */}
        <DropdownMenuLabel className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1">
          OpenAI
        </DropdownMenuLabel>
        {Object.values(modelConfigs)
          .filter(model => model.provider === 'openai')
          .map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => onModelChange(model.id)}
              className={`p-3 cursor-pointer rounded-md hover:bg-gray-50 ${
                selectedModel === model.id ? 'bg-blue-50 border-blue-200 border' : ''
              }`}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="mt-0.5">{model.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">{model.name}</span>
                    <span className={`text-xs font-medium ${getProviderColor(model.provider)}`}>
                      {model.provider.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{model.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {model.capabilities.slice(0, 3).map((cap) => (
                        <span 
                          key={cap} 
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-medium ${getPricingColor(model.pricing)}`}>
                        ${model.pricing}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600">{model.speed}</span>
                    </div>
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        
        <DropdownMenuSeparator />
        
        {/* Anthropic Models */}
        <DropdownMenuLabel className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1">
          Anthropic
        </DropdownMenuLabel>
        {Object.values(modelConfigs)
          .filter(model => model.provider === 'anthropic')
          .map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => onModelChange(model.id)}
              className={`p-3 cursor-pointer rounded-md hover:bg-gray-50 ${
                selectedModel === model.id ? 'bg-purple-50 border-purple-200 border' : ''
              }`}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="mt-0.5">{model.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">{model.name}</span>
                    <span className={`text-xs font-medium ${getProviderColor(model.provider)}`}>
                      {model.provider.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{model.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {model.capabilities.slice(0, 3).map((cap) => (
                        <span 
                          key={cap} 
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-medium ${getPricingColor(model.pricing)}`}>
                        ${model.pricing}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600">{model.speed}</span>
                    </div>
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { modelConfigs };