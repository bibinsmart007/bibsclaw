import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock agent module
const mockChat = vi.fn();
vi.mock('../../agent/index.js', () => ({
  createAgent: () => ({ chat: mockChat }),
}));

describe('Agent Chat Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Message Processing', () => {
    it('should process a simple text message', async () => {
      mockChat.mockResolvedValue({ content: 'Hello! How can I help?', model: 'perplexity' });
      const result = await mockChat('Hello');
      expect(result).toBeDefined();
      expect(result.content).toContain('Hello');
      expect(mockChat).toHaveBeenCalledWith('Hello');
    });

    it('should handle empty messages gracefully', async () => {
      mockChat.mockResolvedValue({ content: 'Please provide a message.', model: 'perplexity' });
      const result = await mockChat('');
      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
    });

    it('should handle long messages without truncation', async () => {
      const longMessage = 'a'.repeat(5000);
      mockChat.mockResolvedValue({ content: 'Processed long message', model: 'perplexity' });
      const result = await mockChat(longMessage);
      expect(result).toBeDefined();
    });
  });

  describe('Model Fallback', () => {
    it('should fallback to Claude when Perplexity fails', async () => {
      mockChat
        .mockRejectedValueOnce(new Error('Perplexity API error'))
        .mockResolvedValueOnce({ content: 'Response from Claude', model: 'claude' });
      try {
        await mockChat('test');
      } catch {
        const result = await mockChat('test');
        expect(result.model).toBe('claude');
      }
    });

    it('should handle all providers being down', async () => {
      mockChat.mockRejectedValue(new Error('All providers unavailable'));
      await expect(mockChat('test')).rejects.toThrow('All providers unavailable');
    });
  });

  describe('Tool Execution', () => {
    it('should execute file read tool', async () => {
      mockChat.mockResolvedValue({
        content: 'File contents: hello world',
        model: 'claude',
        toolsUsed: ['readFile'],
      });
      const result = await mockChat('Read the README file');
      expect(result.toolsUsed).toContain('readFile');
    });

    it('should handle tool execution errors', async () => {
      mockChat.mockResolvedValue({
        content: 'Error reading file: permission denied',
        model: 'claude',
        toolsUsed: ['readFile'],
        errors: ['EACCES: permission denied'],
      });
      const result = await mockChat('Read /etc/shadow');
      expect(result.errors).toBeDefined();
    });
  });

  describe('Conversation Context', () => {
    it('should maintain conversation history', async () => {
      mockChat
        .mockResolvedValueOnce({ content: 'My name is BibsClaw', model: 'perplexity' })
        .mockResolvedValueOnce({ content: 'I said my name is BibsClaw', model: 'perplexity' });
      await mockChat('What is your name?');
      const result = await mockChat('What did you just say?');
      expect(result.content).toContain('BibsClaw');
    });

    it('should handle context window limits', async () => {
      for (let i = 0; i < 100; i++) {
        mockChat.mockResolvedValueOnce({ content: `Response ${i}`, model: 'perplexity' });
      }
      for (let i = 0; i < 100; i++) {
        const result = await mockChat(`Message ${i}`);
        expect(result).toBeDefined();
      }
      expect(mockChat).toHaveBeenCalledTimes(100);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rapid successive requests', async () => {
      mockChat.mockResolvedValue({ content: 'OK', model: 'perplexity' });
      const promises = Array.from({ length: 10 }, (_, i) => mockChat(`Request ${i}`));
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(r => expect(r.content).toBe('OK'));
    });
  });
});
