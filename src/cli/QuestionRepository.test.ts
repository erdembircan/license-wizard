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

  describe("getAll", () => {
    it("returns all questions in insertion order", () => {
      const q0 = makeQuestion("q0");
      const q1 = makeQuestion("q1");
      const repo = new QuestionRepository([q0, q1]);

      expect(repo.getAll()).toEqual([q0, q1]);
    });

    it("returns an empty array when the repository is empty", () => {
      const repo = new QuestionRepository([]);

      expect(repo.getAll()).toEqual([]);
    });

    it("returns a copy that does not mutate the repository", () => {
      const q0 = makeQuestion("q0");
      const repo = new QuestionRepository([q0]);

      const all = repo.getAll();
      all.push(makeQuestion("intruder"));

      expect(repo.getAll()).toHaveLength(1);
    });
  });
});
