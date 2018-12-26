#!/usr/bin/env node

const fs = require("fs");

const WavDecoder = require("wav-decoder");

const commandLineArgs = require('command-line-args');

const decodeDSP = require("./decode_DSP");
const decodePWM = require("./decode_PWM");

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

const USE_DSP = true;

if(USE_DSP) bytes = decodeDSP(samples, samplerate, low_tone, high_tone);
else        bytes = decodePWM(samples, samplerate, low_tone, high_tone);

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


function parseOptions(optionDefinitions) {
   try {       
      return commandLineArgs(optionDefinitions);
   } catch(ex) {
      console.log(ex.message);
      process.exit(-1);
   }
}
