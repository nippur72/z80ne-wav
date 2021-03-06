#!/usr/bin/env node

const fs = require("fs");
const path = require('path');

const WavEncoder = require("wav-encoder");

const commandLineArgs = require('command-line-args');

const options = parseOptions([
   { name: 'input', alias: 'i', type: String },
   { name: 'output', alias: 'o', type: String },   
   { name: 'address', alias: 'a', type: String },   
   { name: 'baud', alias: 'b', type: Number },   
   { name: 'head', alias: 'h', type: Number },   
   { name: 'tail', alias: 't', type: Number },
   { name: 'invert', type: Boolean },
   { name: 'samplerate', alias: 's', type: Number },
   { name: 'sinewave', type: Boolean },
   { name: 'squarewave', type: Boolean },
   { name: 'triangularwave', type: Boolean },
   { name: 'rc', type: Number }
]);

if(options.input === undefined || options.output === undefined) {
   console.log("usage: encodewav -i input.hex -o output.wav [-a address] [-b 300|600|1200] ...options...");
   console.log("         -a or --address num     memory loading address (decimal or hex with '0x' prefix.");
   console.log("                                 (if not specified the address will be formed from the");
   console.log("                                 first two bytes of the input file)");
   console.log("         -b or --baud num        the baudrate among 300, 600 and 1200 baud. (300 is default)");
   console.log("         -h or --head num        the length of the sync header in seconds (default 10 secs)");
   console.log("         -t or --tail num        the length of the sync tail in seconds (default 5 secs)");
   console.log("         -s or --samplerate num  the samplerate of the output WAV file (44100 default)");
   console.log("         --invert                inverts the polarity of the audio samples");
   console.log("         --sinewave              uses a sine wave for generating tones (default)");
   console.log("         --squarewave            uses a square wave for generating tones");
   console.log("         --triangularwave        emulates a realistic LX.385 wave ");
   console.log("         --rc num                RC parameter for the triangular wave, from 2 to 1000 (16 default)");
   process.exit(-1);
}

let TONE_LOW    = 1200;
let TONE_HIGH   = 2400;
let MULTIPLIER  = 1

     if(options.baud ===  300) { TONE_LOW = 1200; TONE_HIGH = 2400; MULTIPLIER = 1 }
else if(options.baud ===  600) { TONE_LOW = 2400; TONE_HIGH = 4800; MULTIPLIER = 2 }
else if(options.baud === 1200) { TONE_LOW = 4800; TONE_HIGH = 9600; MULTIPLIER = 3 }
else if(options.baud !== undefined) { 
   console.log("invalid baudrate option. Use 300, 600 or 1200 only.");
   process.exit(-1);
};

const SAMPLE_RATE = options.samplerate || 44100;
const BIT_SIZE    = SAMPLE_RATE / TONE_LOW * 4;

const RC_VALUE = options.rc || 16;

const fileName = options.input;
const wavName = options.output;

let bytes = fs.readFileSync(fileName);

if(options.address !== undefined) {
   const address = options.address;
   bytes = [ hi(address), lo(address), ...bytes];
   console.log(`adding start address to tape data: ${address} (${address.toString(16)}h)`);
}
else {
   const address = bytes[0] * 256 + bytes[1];
   console.log(`no address was specified, it will be the first two bytes in the file`);
   console.log(`start address is: ${address} (${address.toString(16)}h)`);
}

let bits = bytesToBits(bytes);

// sync bits at start and end (1,1,1,...)

const head_len = options.head || 10;
const tail_len = options.tail || 5;

const head_len_bits = Math.round(head_len * SAMPLE_RATE / BIT_SIZE);
const tail_len_bits = Math.round(tail_len * SAMPLE_RATE / BIT_SIZE);

let head = new Array(head_len_bits).fill(1);
let tail = new Array(tail_len_bits).fill(1);
bits = [ ...head, ...bits, ...tail];

let samples = bitsToSamples(bits);

if(options.invert) samples = samples.map(e=>-e);

const wavData = {
  sampleRate: SAMPLE_RATE,
  channelData: [ new Float32Array(samples) ]
};
 
const buffer = WavEncoder.encode.sync(wavData, { bitDepth: 16, float: false });

fs.writeFileSync(wavName, new Buffer(buffer));

console.log(`file "${wavName}" generated`);

function bytesToBits(bytes) {
   const bits = [];

   for(let t=0; t<bytes.length; t++) {
      const b = bytes[t];
      const b0 = (b & (1 << 0)) >> 0;
      const b1 = (b & (1 << 1)) >> 1;
      const b2 = (b & (1 << 2)) >> 2;
      const b3 = (b & (1 << 3)) >> 3;
      const b4 = (b & (1 << 4)) >> 4;
      const b5 = (b & (1 << 5)) >> 5;
      const b6 = (b & (1 << 6)) >> 6;
      const b7 = (b & (1 << 7)) >> 7;
      const parity = (b0+b1+b2+b3+b4+b5+b6+b7)%2;

      bits.push(0);      // start bit
      bits.push(b0);     // data bit
      bits.push(b1);     // data bit
      bits.push(b2);     // data bit
      bits.push(b3);     // data bit
      bits.push(b4);     // data bit
      bits.push(b5);     // data bit
      bits.push(b6);     // data bit
      bits.push(b7);     // data bit
      bits.push(parity); // parity bit
      bits.push(1);      // stop bit
      bits.push(1);      // stop bit
   }

   return bits;
}

function bitsToSamples(bits) {
   const samples = [];   

   let phase = 0;

   let last_s = 0;

   let RC = 1-((1/RC_VALUE)*(44100 / SAMPLE_RATE)*MULTIPLIER);   

   for(let t=0; t<bits.length; t++) {
      const b = bits[t];

      for(let i=0; i<BIT_SIZE; i++)
      {
         let s = Math.sin(phase) * 0.75; 
         if(options.squarewave) 
         {  
            s = s>0 ? 1.0 : -1.0;
            samples.push(s);
         }
         else if(options.triangularwave) 
         {
            s = s>0 ? 1.0 : -1.0;
            s = s * (1-RC) + last_s * RC;         
            samples.push(s*1.0);
         }         
         else {
            samples.push(s);
         }
         
         last_s = s;
         const f = (b === 0) ? TONE_LOW : TONE_HIGH;
         phase += 2 * Math.PI * f / SAMPLE_RATE;

         phase = phase % (2 * Math.PI);         
      }      
   }

   return samples;
}

function lo(word) {
   return word & 0xff;   
}

function hi(word) {
   return (word >> 8) & 0xff;
}

function parseOptions(optionDefinitions) {
   try {       
      return commandLineArgs(optionDefinitions);
   } catch(ex) {
      console.log(ex.message);
      process.exit(-1);
   }
}
