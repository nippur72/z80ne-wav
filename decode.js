#!/usr/bin/env node

const fs = require("fs");
const path = require('path');

const WavDecoder = require("wav-decoder");

const commandLineArgs = require('command-line-args');

const options = parseOptions([
   { name: 'input', alias: 'i', type: String },
   { name: 'output', alias: 'o', type: String },   
   { name: 'noheader', alias: 'n', type: Boolean },
   { name: 'invert', type: Boolean },
   { name: 'baud', alias: 'b', type: Number },   
]);

if(options.input === undefined || options.output === undefined) {
   console.log("usage: decodewav -i input.wav -o output.hex [--noheader] [-b 300|600|1200] [--invert]");
   process.exit(-1);
}

const fileName = options.input;

const file = fs.readFileSync(fileName);

const audioData = WavDecoder.decode.sync(file);

let samples = audioData.channelData[0];

// invert audio amplitude if --invert option is given
if(options.invert) samples = samples.map(s=>-s);

const samplerate = audioData.sampleRate;

let low_tone = 1200, high_tone = 2400;

     if(options.baud ===  300) { low_tone = 1200, high_tone = 2400 }
else if(options.baud ===  600) { low_tone = 2400, high_tone = 4800 }
else if(options.baud === 1200) { low_tone = 4800, high_tone = 9600 }
else if(options.baud !== undefined) { 
   console.log("invalid baudrate option. Use 300, 600 or 1200 only.");
   process.exit(-1);
};

console.log(`sample rate is ${samplerate} Hz`);

const lo = samplerate / low_tone;
const hi = samplerate / high_tone;
const mid = (hi + lo) / 2.0;

const durations = samples_to_duration(samples);
const hl = duration_to_hl(durations);

/*
durations.forEach((e,i)=>{
   process.stdout.write(`${e},`);
   if(i%20 === 0) process.stdout.write("\n");
});

hl.forEach((e,i)=>{
   process.stdout.write(e);
   if(i%80 === 0) process.stdout.write("\n");
});
*/

let bytes = hl_to_bytes(hl);
const address = bytes[0]*256+bytes[1];
if(options.noheader) {
   // skip 2 header bytes
   bytes = bytes.slice(2);
}
const buffer = new Uint8Array(bytes);

// write
fs.writeFileSync(options.output, buffer);
if(options.noheader) console.log(`written ${bytes.length} bytes without header to "${options.output}", start address is ${address.toString(16)}h`);
else console.log(`written ${bytes.length} bytes to "${options.output}" (2 bytes start address header included)`);

function hl_to_bytes(hl) {
   let ptr;
   const read_bit = function(hl) {
      const bit = look(hl, ptr);   
      if(bit === 0 || bit === 1) {
         ptr += 8;
         return bit;
      }   
      ptr++;
      console.log(`bad hardware bit at pos ${ptr}`);
      return 0;
   }

   let bytes = [];
   for(ptr=0; ptr<hl.length-8;) {
      const bit = look(hl, ptr);
      if(bit === 0) {
         // console.log(`start bit found at pos ${ptr}`);
         // start bit found
         const start_bit = read_bit(hl);
         const bit0      = read_bit(hl);
         const bit1      = read_bit(hl);
         const bit2      = read_bit(hl);
         const bit3      = read_bit(hl);
         const bit4      = read_bit(hl);
         const bit5      = read_bit(hl);
         const bit6      = read_bit(hl);
         const bit7      = read_bit(hl);
         const parity    = read_bit(hl);
         const stop_bit1 = read_bit(hl);
         const stop_bit2 = read_bit(hl);

         const parity_check = (bit0+bit1+bit2+bit3+bit4+bit5+bit6+bit7) % 2;

         if(stop_bit1 !== 1 || stop_bit2 !== 1) {
            console.log(`byte rejected: bad stop bits at pos ${ptr}`);
         }
         else if(parity_check != parity) {
            console.log(`byte rejected: bad parity bit at pos ${ptr}`);
         }
         else {            
            const byte = 
               (bit7 << 7) |
               (bit6 << 6) |
               (bit5 << 5) |
               (bit4 << 4) |
               (bit3 << 3) |
               (bit2 << 2) |
               (bit1 << 1) |
               (bit0 << 0);
                        
            bytes.push(byte);
            // console.log(`byte accepted at pos ${ptr}`);
         }
      }
      else ptr++;
   }
   return bytes;
}

function samples_to_duration(samples) {
   let durations = [];
   let last_s = 0;
   for(let t=0, c=0; t<samples.length; t++) {
      const s = samples[t];
      c++;
      if(last_s < 0 && s >= 0) {
         // edge detected
         durations.push(c);
         c=0;
      }
      last_s = s;
   }
   return durations;
}

function duration_to_hl(durations) {
   let hl = [];
   for(let t=0; t<durations.length; t++) {
      const d = durations[t];
      // TODO implement tolerance?
      if(d > mid) { hl.push("L"); hl.push("L"); }
      else hl.push("H"); 
   }
   return hl;
}

function look(hl, ptr) {
   if(hl[ptr+0] === "L" && 
      hl[ptr+1] === "L" && 
      hl[ptr+2] === "L" && 
      hl[ptr+3] === "L" && 
      hl[ptr+4] === "L" && 
      hl[ptr+5] === "L" && 
      hl[ptr+6] === "L" && 
      hl[ptr+7] === "L") return 0;

   if(hl[ptr+0] === "H" && 
      hl[ptr+1] === "H" && 
      hl[ptr+2] === "H" && 
      hl[ptr+3] === "H" && 
      hl[ptr+4] === "H" && 
      hl[ptr+5] === "H" && 
      hl[ptr+6] === "H" && 
      hl[ptr+7] === "H") return 1;   

   return -1;
}

function parseOptions(optionDefinitions) {
   try {       
      return commandLineArgs(optionDefinitions);
   } catch(ex) {
      console.log(ex.message);
      process.exit(-1);
   }
}
