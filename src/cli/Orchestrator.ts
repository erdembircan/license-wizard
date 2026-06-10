/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { Answer } from "@cli/Answer.js";
import type { IRenderer } from "@cli/interfaces/IRenderer.js";
import type { QuestionRepository } from "@cli/QuestionRepository.js";

/**
 * Drives the question-and-answer session by iterating all questions
 * in the repository and delegating rendering to the provided renderer.
 *
 * When a question declares an `onAnswer` callback, the lifecycle's `inject`
 * function inserts follow-up questions into the repository immediately after
 * the current position. Their answers are collected into the parent answer's
 * `fields` map rather than surfaced as top-level entries in the result array.
 */
export class Orchestrator {
  readonly #repository: QuestionRepository;
  readonly #renderer: IRenderer;

  /**
   * Creates a new Orchestrator with the given repository and renderer.
   */
  constructor(repository: QuestionRepository, renderer: IRenderer) {
    this.#repository = repository;
    this.#renderer = renderer;
  }

  /**
   * Iterates all questions, renders each one, and returns the collected answers.
   * Follow-up questions injected via the `onAnswer` lifecycle are rolled up into
   * the parent answer's `fields` rather than added to the top-level result.
   */
  async run(): Promise<Answer[]> {
    const answers: Answer[] = [];
    let index = 0;

    while (true) {
      const question = this.#repository.getByIndex(index);
      if (question === null) break;

      const { answer, consumedCount } = await this.#renderAndCollect(index);
      answers.push(answer);
      index += consumedCount;
    }

    return answers;
  }

  async #renderAndCollect(
    index: number,
  ): Promise<{ answer: Answer; consumedCount: number }> {
    const question = this.#repository.getByIndex(index)!;
    const answer = await this.#renderer.render(question);

    if (!question.onAnswer) {
      return { answer, consumedCount: 1 };
    }

    let injectedCount = 0;
    const lifecycle = {
      inject: (questions: (typeof question)[]) => {
        this.#repository.insertAt(index + 1, questions);
        injectedCount += questions.length;
      },
    };

    await question.onAnswer(answer, lifecycle);

    if (injectedCount === 0) {
      return { answer, consumedCount: 1 };
    }

    const fields: Record<string, string | boolean> = {};
    let childIndex = index + 1;
    let childrenRemaining = injectedCount;

    while (childrenRemaining > 0) {
      const { answer: childAnswer, consumedCount: childConsumed } =
        await this.#renderAndCollect(childIndex);
      fields[childAnswer.questionId] = childAnswer.value;
      if (childAnswer.fields) {
        Object.assign(fields, childAnswer.fields);
      }
      childIndex += childConsumed;
      childrenRemaining -= childConsumed;
    }

    return {
      answer: { ...answer, fields },
      consumedCount: 1 + (childIndex - (index + 1)),
    };
  }
}
