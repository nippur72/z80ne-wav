#!/usr/bin/env node

const fs = require("fs");
const path = require('path');

const WavDecoder = require("wav-decoder");

const commandLineArgs = require('command-line-args');

const optionDefinitions = [
   { name: 'input', alias: 'i', type: String },
   { name: 'output', alias: 'o', type: String },   
   { name: 'noheader', alias: 'n', type: Boolean },   
];

const options = (()=>{ 
   try { 
      return commandLineArgs(optionDefinitions); 
   } catch(ex) {
      console.log(ex.message);
      process.exit(-1);
   }
})();

if(options.input === undefined || options.output === undefined) {
   console.log("usage: decodewav -i input.wav -o output.hex [-noheader]");
   process.exit(-1);
}

const fileName = options.input;

const file = fs.readFileSync(fileName);

const audioData = WavDecoder.decode.sync(file);

const samples = audioData.channelData[0];
const samplerate = audioData.sampleRate;

const lo = samplerate / 1200;
const hi = samplerate / 2400;
const mid = (hi + lo) / 2.0;

const durations = samples_to_duration(samples);
const hl = duration_to_hl(durations);

// durations.forEach((e)=>process.stdout.write(e.toString()));

/*
hl.forEach((e,i)=>{
   process.stdout.write(e);
   if(i%80 === 0) process.stdout.write("\n");
});
*/

let bytes = hl_to_bytes(hl);
const address = bytes[0]+bytes[0]*256;
if(options.noheader) {
   // skip 2 header bytes
   bytes = bytes.slice(0,-2);
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
         // start bit found
         const start_bit = read_bit(hl);
         const bit7      = read_bit(hl);
         const bit6      = read_bit(hl);
         const bit5      = read_bit(hl);
         const bit4      = read_bit(hl);
         const bit3      = read_bit(hl);
         const bit2      = read_bit(hl);
         const bit1      = read_bit(hl);
         const bit0      = read_bit(hl);
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
      if(last_s < 0 && s > 0) {
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

