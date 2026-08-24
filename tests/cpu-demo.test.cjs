const assert = require("node:assert/strict");
const { SafeCPU6502, parseProgram, FLAGS } = require("./cpu-demo.js");

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

console.log("CPU demo safety tests passed.");
