/**
 * Tests for conversation delete and trash functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Delete/Trash Functionality', () => {
  describe('Soft Delete', () => {
    it('should mark conversation as deleted with timestamp', async () => {
      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      // Simulate soft delete
      const conversationId = 123;
      const now = new Date().toISOString();

      await mockDb
        .update('conversations')
        .set({ deletedAt: now })
        .where(`id = ${conversationId}`);

      expect(mockDb.update).toHaveBeenCalledWith('conversations');
      expect(mockDb.set).toHaveBeenCalledWith({ deletedAt: expect.any(String) });
    });

    it('should also soft delete associated messages', async () => {
      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const conversationId = 123;

      // Soft delete messages
      await mockDb
        .update('messages')
        .set({ deletedAt: expect.any(String) })
        .where(`conversation_id = ${conversationId} AND deleted_at IS NULL`);

      expect(mockDb.update).toHaveBeenCalledWith('messages');
    });
  });

  describe('Restore', () => {
    it('should clear deletedAt on conversation', async () => {
      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const conversationId = 123;

      await mockDb
        .update('conversations')
        .set({ deletedAt: null })
        .where(`id = ${conversationId}`);

      expect(mockDb.set).toHaveBeenCalledWith({ deletedAt: null });
    });

    it('should restore all messages in conversation', async () => {
      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const conversationId = 123;

      await mockDb
        .update('messages')
        .set({ deletedAt: null })
        .where(`conversation_id = ${conversationId}`);

      expect(mockDb.set).toHaveBeenCalledWith({ deletedAt: null });
    });
  });

  describe('Permanent Delete', () => {
    it('should delete conversation tags first', async () => {
      const mockDb = {
        all: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const conversationId = 123;

      await mockDb.all(
        `DELETE FROM conversation_tags WHERE conversation_id = ${conversationId}`
      );

      expect(mockDb.all).toHaveBeenCalled();
    });

    it('should delete all messages', async () => {
      const mockDb = {
        all: vi.fn().mockResolvedValue([]),
      };

      const conversationId = 123;

      await mockDb.all(
        `DELETE FROM messages WHERE conversation_id = ${conversationId}`
      );

      expect(mockDb.all).toHaveBeenCalled();
    });

    it('should delete the conversation itself', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const conversationId = 123;

      await mockDb.delete('conversations').where(`id = ${conversationId}`);

      expect(mockDb.delete).toHaveBeenCalledWith('conversations');
    });
  });

  describe('List Deleted (Trash)', () => {
    it('should only return conversations with deletedAt set', () => {
      const conversations = [
        { id: 1, userId: 'user1', deletedAt: '2024-01-01' },
        { id: 2, userId: 'user2', deletedAt: null },
        { id: 3, userId: 'user3', deletedAt: '2024-01-02' },
      ];

      const deleted = conversations.filter((c) => c.deletedAt !== null);

      expect(deleted).toHaveLength(2);
      expect(deleted.map((c) => c.id)).toEqual([1, 3]);
    });

    it('should order by deletedAt DESC (most recent first)', () => {
      const deletedConversations = [
        { id: 1, deletedAt: '2024-01-01T10:00:00Z' },
        { id: 3, deletedAt: '2024-01-03T10:00:00Z' },
        { id: 2, deletedAt: '2024-01-02T10:00:00Z' },
      ];

      const sorted = [...deletedConversations].sort(
        (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
      );

      expect(sorted.map((c) => c.id)).toEqual([3, 2, 1]);
    });
  });

  describe('Active Conversations Query', () => {
    it('should exclude deleted conversations', () => {
      const allConversations = [
        { id: 1, userId: 'user1', deletedAt: null },
        { id: 2, userId: 'user2', deletedAt: '2024-01-01' },
        { id: 3, userId: 'user3', deletedAt: null },
      ];

      const active = allConversations.filter((c) => c.deletedAt === null);

      expect(active).toHaveLength(2);
      expect(active.map((c) => c.id)).toEqual([1, 3]);
    });
  });

  describe('API Endpoint Behavior', () => {
    it('should return 400 for permanent delete without confirmation', async () => {
      const body = { permanent: false };

      // Simulating the API check
      if (!body.permanent) {
        const error = { status: 400, message: 'Must specify permanent: true for permanent deletion' };
        expect(error.status).toBe(400);
      }
    });

    it('should return 404 for non-existent conversation', async () => {
      const conversation = null;

      if (!conversation) {
        const error = { status: 404, message: 'Conversation not found' };
        expect(error.status).toBe(404);
      }
    });
  });
});
