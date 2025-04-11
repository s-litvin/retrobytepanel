let cols = 16;
let rows = 8;
let leds = [];

let instructionQueue = [];
let aluRegisters = [null, null, null, null];
let memory = [null, null, null, null];
let systemRegisters = [0, 0, null, null]; // clock, instruction counter

let cycle = 0; // 0 = fetch, 1 = execute, 2 = memory write
let panelHeight = 320;

function setup() {
  createCanvas(640, 380);
  frameRate(2);

  for (let y = 0; y < rows; y++) {
    leds[y] = [];
    for (let x = 0; x < cols; x++) {
      leds[y][x] = false;
    }
  }

  for (let i = 0; i < 4; i++) {
    instructionQueue.push(generateInstruction());
  }
}

function draw() {
  background(10);
  clearLeds();
  drawGridLines();

  if (cycle === 0) {
    for (let i = 0; i < 4; i++) aluRegisters[i] = null;
    aluRegisters[0] = instructionQueue.shift();
    instructionQueue.push(generateInstruction());
    systemRegisters[1]++;
  }

  if (cycle === 1) {
    aluRegisters[1] = generateInstruction();
    if (random() < 0.66) aluRegisters[2] = generateInstruction();
    if (random() < 0.33) aluRegisters[3] = generateInstruction();
  }

  if (cycle === 2) {
    for (let i = 0; i < 4; i++) {
      memory[i] = generateInstruction();
    }
  }

  drawQueueBlock();
  drawALUBlock();
  drawMemoryBlock();
  drawSystemBlock();

  drawIndicators();
  drawLeds();

  cycle = (cycle + 1) % 3;
  systemRegisters[0]++;
}

function generateInstruction() {
  let bits = [];
  for (let i = 0; i < 8; i++) {
    bits.push(floor(random(2)));
  }
  return { bits: bits };
}

function clearLeds() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      leds[y][x] = false;
    }
  }
}

function drawLeds() {
  let w = width / cols;
  let h = panelHeight / rows;
  noStroke();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let c;
      if (x < 4) c = color(100, 255, 150); // Queue – greenish
      else if (x < 8) c = color(255, 180, 50); // ALU – amber
      else if (x < 12) c = color(180, 220, 255); // Memory – pale blue
      else c = color(255, 80, 80); // System – red

      fill(leds[y][x] ? c : color(30));
      ellipse(x * w + w / 2, y * h + h / 2, w * 0.7, h * 0.7);
    }
  }
}

function drawGridLines() {
  strokeWeight(4);
  let w = width / cols;
  for (let i = 0; i <= cols; i++) {
    if (i === 4 || i === 8 || i === 12) {
      stroke(60, 120, 200, 100);
    } else {
      stroke(40);
    }
    line(i * w, 0, i * w, panelHeight);
  }
}

function drawQueueBlock() {
  for (let i = 0; i < instructionQueue.length; i++) {
    let instr = instructionQueue[instructionQueue.length - i - 1];
    if (instr) {
      for (let y = 0; y < 8; y++) {
        leds[y][i] = instr.bits[y];
      }
    }
  }
}

function drawALUBlock() {
  for (let i = 0; i < aluRegisters.length; i++) {
    let instr = aluRegisters[i];
    if (instr) {
      for (let y = 0; y < 8; y++) {
        leds[y][4 + i] = instr.bits[y];
      }
    }
  }
}

function drawMemoryBlock() {
  for (let i = 0; i < memory.length; i++) {
    let instr = memory[i];
    if (instr) {
      for (let y = 0; y < 8; y++) {
        leds[y][8 + i] = instr.bits[y];
      }
    }
  }
}

function drawSystemBlock() {
  let bits1 = numberToBits(systemRegisters[0] % 256, 8);
  for (let y = 0; y < 8; y++) leds[y][12] = bits1[y];

  let bits2 = numberToBits(systemRegisters[1] % 256, 8);
  for (let y = 0; y < 8; y++) leds[y][13] = bits2[y];

  // R3, R4 unused for now
}

function numberToBits(n, length) {
  let b = n.toString(2).padStart(length, '0');
  return b.split('').map(bit => bit === '1' ? 1 : 0);
}

function drawIndicators() {
  let w = width / cols;
  let h = height / rows;

  textAlign(CENTER, CENTER);
  textSize(10);
  noStroke();

  // Queue duplicate detector
  let hasDuplicate = checkDuplicates(instructionQueue);
  fill(hasDuplicate ? color(0, 255, 0) : color(50));
  rect(1 * w, height - 30, w, w * 0.7, 3);
  fill(200);
  text("DUPL", 1 * w + w / 2, height - 14);

  // ALU full usage
  let aluFull = aluRegisters[3] !== null;
  fill(aluFull ? color(255, 180, 50) : color(50));
  rect(5 * w, height - 30, w, w * 0.7, 3);
  fill(200);
  textSize(7);
  text("ALU FULL", 5 * w + w / 2, height - 14);

  // System counter empty
  let empty = systemRegisters[0] === 0 || systemRegisters[1] === 0;
  fill(empty ? color(255, 0, 0) : color(50));
  rect(13 * w, height - 30, w, w * 0.7, 3);
  fill(200);
  text("CNT OVF", 13 * w + w / 2, height - 14);

  // Memory chaos detector (if values very different)
  let chaos = memoryVariance() > 4;
  fill(chaos ? color(0, 200, 255) : color(50));
  rect(9 * w, height - 30, w, w * 0.7, 3);
  fill(200);
  textSize(6);
  text("MEM CHAOS", 9 * w + w / 2, height - 14);
}

function checkDuplicates(queue) {
  let seen = new Set();
  for (let instr of queue) {
    let key = instr.bits.join("");
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function memoryVariance() {
  let ones = 0;
  let total = 0;
  for (let m of memory) {
    if (m) {
      total += 8;
      ones += m.bits.reduce((a, b) => a + b, 0);
    }
  }
  let avg = ones / total;
  return Math.abs(avg * 8 - 4); // distance from balanced
}

