(function () {
  "use strict";

  const START = 0x8000;
  const OUTPUT_MIN = 0x0200;
  const OUTPUT_MAX = 0x02ff;
  const MAX_PROGRAM_BYTES = 64;
  const MAX_STEPS = 64;
  const FLAGS = { C: 1, Z: 2, I: 4, D: 8, B: 16, U: 32, V: 64, N: 128 };

  function hex(value, width) {
    return "$" + (value >>> 0).toString(16).toUpperCase().padStart(width, "0");
  }

  function parseProgram(source) {
    if (typeof source !== "string" || source.length > 256) {
      throw new Error("Program text is too long.");
    }
    const trimmed = source.trim();
    if (!trimmed) throw new Error("Enter at least one machine-code byte.");
    const tokens = trimmed.split(/[\s,]+/);
    if (tokens.length > MAX_PROGRAM_BYTES) {
      throw new Error("Programs are limited to 64 bytes.");
    }
    return tokens.map((token) => {
      if (!/^[0-9a-fA-F]{2}$/.test(token)) {
        throw new Error("Use two-digit hexadecimal bytes, for example A9 05.");
      }
      return Number.parseInt(token, 16);
    });
  }

  class SafeCPU6502 {
    constructor(program) {
      this.memory = new Uint8Array(0x10000);
      this.load(program);
    }

    load(program) {
      if (!Array.isArray(program) || program.length < 1 || program.length > MAX_PROGRAM_BYTES) {
        throw new Error("Program must contain between 1 and 64 bytes.");
      }
      this.memory.fill(0);
      this.memory.set(program, START);
      this.programLength = program.length;
      this.A = 0;
      this.X = 0;
      this.Y = 0;
      this.SP = 0xfd;
      this.PC = START;
      this.STATUS = FLAGS.U | FLAGS.I;
      this.cycles = 7;
      this.steps = 0;
      this.halted = false;
      this.message = "Reset complete. PC loaded at $8000.";
      this.trace = [];
    }

    getFlag(flag) { return (this.STATUS & flag) !== 0; }
    setFlag(flag, condition) {
      this.STATUS = condition ? (this.STATUS | flag) : (this.STATUS & ~flag);
    }
    setZN(value) {
      this.setFlag(FLAGS.Z, value === 0);
      this.setFlag(FLAGS.N, (value & 0x80) !== 0);
    }
    fetchByte() {
      const end = START + this.programLength;
      if (this.PC < START || this.PC >= end) throw new Error("Instruction reads outside the loaded program.");
      return this.memory[this.PC++];
    }
    addTrace(pc, text) {
      this.trace.push(`${hex(pc, 4)}  ${text}`);
      if (this.trace.length > 20) this.trace.shift();
    }

    adc(value) {
      const carry = this.getFlag(FLAGS.C) ? 1 : 0;
      const binary = this.A + value + carry;
      const binaryResult = binary & 0xff;
      this.setFlag(FLAGS.V, ((~(this.A ^ value) & (this.A ^ binaryResult)) & 0x80) !== 0);
      if (this.getFlag(FLAGS.D)) {
        let low = (this.A & 0x0f) + (value & 0x0f) + carry;
        let high = (this.A >> 4) + (value >> 4);
        if (low > 9) { low += 6; high += 1; }
        if (high > 9) high += 6;
        this.setFlag(FLAGS.C, high > 15);
        this.A = ((high << 4) | (low & 0x0f)) & 0xff;
      } else {
        this.setFlag(FLAGS.C, binary > 0xff);
        this.A = binaryResult;
      }
      this.setZN(this.A);
    }

    sbc(value) {
      const borrow = this.getFlag(FLAGS.C) ? 0 : 1;
      const difference = this.A - value - borrow;
      const binaryResult = difference & 0xff;
      this.setFlag(FLAGS.V, ((this.A ^ value) & (this.A ^ binaryResult) & 0x80) !== 0);
      this.setFlag(FLAGS.C, difference >= 0);
      if (this.getFlag(FLAGS.D)) {
        let low = (this.A & 0x0f) - (value & 0x0f) - borrow;
        let high = (this.A >> 4) - (value >> 4);
        if (low < 0) { low -= 6; high -= 1; }
        if (high < 0) high -= 6;
        this.A = (((high & 0x0f) << 4) | (low & 0x0f)) & 0xff;
      } else {
        this.A = binaryResult;
      }
      this.setZN(this.A);
    }

    step() {
      if (this.halted) return;
      if (this.steps >= MAX_STEPS) throw new Error("Execution stopped at the 64-instruction safety limit.");
      if (this.PC === START + this.programLength) {
        this.halted = true;
        this.message = "Program complete.";
        return;
      }

      const pc = this.PC;
      const opcode = this.fetchByte();
      let description = "";
      switch (opcode) {
        case 0xa9: {
          const value = this.fetchByte(); this.A = value; this.setZN(this.A); this.cycles += 2;
          description = `LDA #${hex(value, 2)}  → A=${hex(this.A, 2)}`; break;
        }
        case 0x69: {
          const value = this.fetchByte(); this.adc(value); this.cycles += 2;
          description = `ADC #${hex(value, 2)}  → A=${hex(this.A, 2)}`; break;
        }
        case 0xe9: {
          const value = this.fetchByte(); this.sbc(value); this.cycles += 2;
          description = `SBC #${hex(value, 2)}  → A=${hex(this.A, 2)}`; break;
        }
        case 0x8d: {
          const lo = this.fetchByte(); const hi = this.fetchByte(); const address = lo | (hi << 8);
          if (address < OUTPUT_MIN || address > OUTPUT_MAX) {
            throw new Error("STA is restricted to the demo output page $0200–$02FF.");
          }
          this.memory[address] = this.A; this.cycles += 4;
          description = `STA ${hex(address, 4)}  → [${hex(address, 4)}]=${hex(this.A, 2)}`; break;
        }
        case 0x18: this.setFlag(FLAGS.C, false); this.cycles += 2; description = "CLC"; break;
        case 0x38: this.setFlag(FLAGS.C, true); this.cycles += 2; description = "SEC"; break;
        case 0xd8: this.setFlag(FLAGS.D, false); this.cycles += 2; description = "CLD"; break;
        case 0xf8: this.setFlag(FLAGS.D, true); this.cycles += 2; description = "SED"; break;
        case 0xea: this.cycles += 2; description = "NOP"; break;
        case 0x00: this.cycles += 7; this.halted = true; this.message = "BRK reached; demo halted safely."; description = "BRK"; break;
        default: throw new Error(`Unsupported demo opcode ${hex(opcode, 2)} at ${hex(pc, 4)}.`);
      }
      this.steps += 1;
      this.addTrace(pc, description);
      if (!this.halted && this.PC === START + this.programLength) {
        this.halted = true;
        this.message = "Program complete.";
      }
    }

    run() {
      while (!this.halted) this.step();
    }
  }

  function initDemo() {
    const root = document.querySelector("[data-cpu-demo]");
    if (!root) return;
    const input = root.querySelector("[data-cpu-program]");
    const status = root.querySelector("[data-cpu-status]");
    const trace = root.querySelector("[data-cpu-trace]");
    const fields = Object.fromEntries(Array.from(root.querySelectorAll("[data-register]"), (node) => [node.dataset.register, node]));
    let cpu = null;

    function render() {
      if (!cpu) return;
      fields.A.textContent = hex(cpu.A, 2); fields.X.textContent = hex(cpu.X, 2); fields.Y.textContent = hex(cpu.Y, 2);
      fields.SP.textContent = hex(cpu.SP, 2); fields.PC.textContent = hex(cpu.PC, 4); fields.STATUS.textContent = hex(cpu.STATUS, 2);
      fields.cycles.textContent = String(cpu.cycles); fields.output.textContent = hex(cpu.memory[0x0200], 2);
      status.textContent = cpu.message;
      trace.textContent = cpu.trace.length ? cpu.trace.join("\n") : "No instructions executed yet.";
    }
    function reset() {
      try { cpu = new SafeCPU6502(parseProgram(input.value)); render(); }
      catch (error) { status.textContent = error instanceof Error ? error.message : "Invalid program."; }
    }
    function act(mode) {
      try {
        if (!cpu) reset();
        if (!cpu) return;
        if (mode === "run") cpu.run(); else cpu.step();
        render();
      } catch (error) {
        cpu.halted = true;
        cpu.message = error instanceof Error ? error.message : "Execution stopped safely.";
        render();
      }
    }
    root.querySelector("[data-cpu-reset]").addEventListener("click", reset);
    root.querySelector("[data-cpu-step]").addEventListener("click", () => act("step"));
    root.querySelector("[data-cpu-run]").addEventListener("click", () => act("run"));
    input.addEventListener("input", () => { cpu = null; status.textContent = "Program changed. Reset before running."; });
    reset();
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initDemo, { once: true });
    else initDemo();
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { SafeCPU6502, parseProgram, FLAGS };
})();
