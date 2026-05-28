import { describe, it, expect } from "vitest";
import { QuestionRepository } from "@cli/QuestionRepository.js";
import type { Question } from "@cli/Question.js";

const makeQuestion = (id: string): Question => ({
  id,
  text: `Question ${id}`,
  type: "text",
});

describe("QuestionRepository", () => {
  describe("getByIndex", () => {
    it("returns the question at the given index", () => {
      const q0 = makeQuestion("q0");
      const q1 = makeQuestion("q1");
      const repo = new QuestionRepository([q0, q1]);

      expect(repo.getByIndex(0)).toEqual(q0);
      expect(repo.getByIndex(1)).toEqual(q1);
    });

    it("returns null when the index is out of bounds", () => {
      const repo = new QuestionRepository([makeQuestion("q0")]);

      expect(repo.getByIndex(1)).toBeNull();
    });

    it("returns null for a negative index", () => {
      const repo = new QuestionRepository([makeQuestion("q0")]);

      expect(repo.getByIndex(-1)).toBeNull();
    });

    it("returns null when the repository is empty", () => {
      const repo = new QuestionRepository([]);

      expect(repo.getByIndex(0)).toBeNull();
    });
  });

  describe("insertAt", () => {
    it("inserts questions at the given index, shifting existing questions right", () => {
      const q0 = makeQuestion("q0");
      const q1 = makeQuestion("q1");
      const injected = makeQuestion("injected");
      const repo = new QuestionRepository([q0, q1]);

      repo.insertAt(1, [injected]);

      expect(repo.getByIndex(0)).toEqual(q0);
      expect(repo.getByIndex(1)).toEqual(injected);
      expect(repo.getByIndex(2)).toEqual(q1);
    });

    it("inserts at the head when index is 0", () => {
      const q0 = makeQuestion("q0");
      const injected = makeQuestion("injected");
      const repo = new QuestionRepository([q0]);

      repo.insertAt(0, [injected]);

      expect(repo.getByIndex(0)).toEqual(injected);
      expect(repo.getByIndex(1)).toEqual(q0);
    });

    it("inserts at the end when index equals the current length", () => {
      const q0 = makeQuestion("q0");
      const injected = makeQuestion("injected");
      const repo = new QuestionRepository([q0]);

      repo.insertAt(1, [injected]);

      expect(repo.getByIndex(0)).toEqual(q0);
      expect(repo.getByIndex(1)).toEqual(injected);
    });

    it("inserts multiple questions in order", () => {
      const q0 = makeQuestion("q0");
      const a = makeQuestion("a");
      const b = makeQuestion("b");
      const repo = new QuestionRepository([q0]);

      repo.insertAt(1, [a, b]);

      expect(repo.getByIndex(1)).toEqual(a);
      expect(repo.getByIndex(2)).toEqual(b);
    });

    it("inserts into an empty repository at index 0", () => {
      const injected = makeQuestion("injected");
      const repo = new QuestionRepository([]);

      repo.insertAt(0, [injected]);

      expect(repo.getByIndex(0)).toEqual(injected);
    });
  });
});
