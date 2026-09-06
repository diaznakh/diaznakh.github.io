const assert = require("node:assert/strict");
const { SafeCPU6502, parseProgram, FLAGS, EXAMPLES } = require("../cpu-demo.js");

const cpu = new SafeCPU6502(parseProgram("A9 05 69 03 8D 00 02"));
cpu.run();
assert.equal(cpu.memory[0x0200], 0x08);
assert.equal(cpu.cycles, 15);
assert.equal(cpu.steps, 3);

const bcd = new SafeCPU6502(parseProgram("F8 18 A9 45 69 55 8D 00 02"));
bcd.run();
assert.equal(bcd.memory[0x0200], 0x00);
assert.equal(bcd.getFlag(FLAGS.C), true);

assert.throws(() => parseProgram("A9 NOT-HEX"), /two-digit hexadecimal/);
assert.throws(() => parseProgram(Array(65).fill("EA").join(" ")), /64 bytes/);
assert.throws(() => new SafeCPU6502(parseProgram("A9 01 8D 00 80")).run(), /restricted/);
assert.throws(() => new SafeCPU6502(parseProgram("FF")).run(), /Unsupported demo opcode/);

for (const [name, example] of Object.entries(EXAMPLES)) {
  const guided = new SafeCPU6502(parseProgram(example.bytes));
  for (const explanation of example.steps) {
    assert.equal(guided.halted, false, name + " has an explanation for every instruction");
    assert.ok(explanation.length > 0);
    guided.step();
  }
  assert.equal(guided.halted, true);
  assert.equal(guided.steps, example.steps.length);
  if (name === "flags") {
    assert.equal(guided.A, 0);
    assert.equal(guided.getFlag(FLAGS.C), true);
    assert.equal(guided.getFlag(FLAGS.Z), true);
    assert.equal(guided.getFlag(FLAGS.N), false);
  } else {
    assert.equal(guided.A, 8);
    assert.equal(guided.memory[0x0200], name === "store" ? 8 : 0);
  }
  guided.load(parseProgram(example.bytes));
  assert.equal(guided.steps, 0);
  assert.equal(guided.A, 0);
  assert.equal(guided.memory[0x0200], 0);
}
console.log("CPU demo safety and guided examples passed.");
