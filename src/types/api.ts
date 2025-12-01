export interface Source {
  pageTitle: string;
  pageUrl: string;
  score: number;
  chunkText: string;
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RAGQueryRequest {
  question: string;
  projectId?: string;
  conversationId?: string;
  conversationHistory?: ConversationMessage[];
}

export interface RAGQueryResponse {
  success: boolean;
  answer: string;
  sources: Source[];
  question: string;
  conversationId?: string;
  rewrittenQuery?: string;
  usage?: Usage;
  maxScore?: number;
  threshold?: number;
}

export interface SwaggerSource {
  endpoint: string;
  method: string;
  path: string;
  score: number;
  swaggerKey: string;
}

export interface SwaggerQueryRequest {
  question: string;
  projectId?: string;
  conversationId?: string;
  conversationHistory?: ConversationMessage[];
  swaggerKey?: string;
}

export interface SwaggerQueryResponse {
  success: boolean;
  answer: string;
  sources: SwaggerSource[];
  question: string;
  conversationId?: string;
  rewrittenQuery?: string;
  usage?: Usage;
  maxScore?: number;
  threshold?: number;
}

export interface Message {
  id: string;
  question: string;
  answer?: string;
  sources?: Source[] | SwaggerSource[];
  usage?: Usage;
  isLoading?: boolean;
  error?: string;
  isSuccess?: boolean;
  queryType?: 'rag' | 'swagger';
}

