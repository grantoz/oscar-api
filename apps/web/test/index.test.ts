import { describe, it, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import Stack from "../src/stack.ts";

test("will pass", () => {
  assert.ok("hello world yeah");
});

test("I have env vars defined in .env", () => {
  assert.notEqual(process.env.DEPLOYMENT, undefined);
});

// test("will fail", () => {
//   assert.fail("fail");
// });

describe("a new stack", () => {
  let stack: Stack;

  beforeEach(() => {
    stack = new Stack();
  });

  it("is empty", () => {
    assert.equal(stack.size(), 0);
  });

  it("is not empty after push", () => {
    stack.push("item");
    assert.equal(stack.size(), 1);
  });

  it("pop returns undefined for an empty stack", () => {
    assert.equal(stack.pop(), undefined);
  });
});