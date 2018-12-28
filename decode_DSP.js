let tape = [];
let ptr = 0;
let buffer = [];

let bitsize, halfsize;

function decodeDSP(samples, fileSampleRate, lowtone, highttone, debug)
{
   let samplerate = fileSampleRate;

   const DOWNSAMPLE = false;

   if(DOWNSAMPLE) 
   {
      samplerate = highttone * 4;
      console.log(`donwsampling from ${fileSampleRate} Hz to ${samplerate} Hz...`);
      const downSample = require("./downSample");
      samples = downSample(samples, fileSampleRate, samplerate);
      samples = new Float32Array(samples);   
   }

   console.log(`filtering`);
   const filterSamples = require("./filter");    

   bitsize = samplerate / lowtone * 4;
   halfsize = bitsize / 2;

   console.log(`bitsize ${bitsize} samples`);

   samples = filterSamples(samples, samplerate, lowtone, highttone, debug);

   tape = samples;
   ptr = 0;   

   // initial sync
   while(ptr < tape.length) {
      const header = endOfStopBit();
      if(header > 128) break;
   }

   console.log(`initial stop bit ends at ${ptr}`);

   while(ptr < tape.length) {
      const startbit = read_bit();  // discarded
      const bit0     = read_bit();  
      const bit1     = read_bit();
      const bit2     = read_bit();
      const bit3     = read_bit();
      const bit4     = read_bit();
      const bit5     = read_bit();
      const bit6     = read_bit();
      const bit7     = read_bit();
      const parity   = read_bit();

      const parity_check = (bit0+bit1+bit2+bit3+bit4+bit5+bit6+bit7) % 2;

      if(parity_check != parity) {
         console.log(`byte n. ${buffer.length} has a wrong parity bit (byte from ${ptr-(bitsize*9)-halfsize} to ${ptr-halfsize})`);
      }      

      const byte = 
         (bit7 << 7) |
         (bit6 << 6) |
         (bit5 << 5) |
         (bit4 << 4) |
         (bit3 << 3) |
         (bit2 << 2) |
         (bit1 << 1) |
         (bit0 << 0);
                     
      if(buffer.length === 0) console.log(`start found at ${ptr}, decoding bytes...`);

      buffer.push(byte);      

      const stoplen = endOfStopBit();      

      if(stoplen > 64) break;

      if(stoplen > 2) {
         console.log(`byte n. ${buffer.length}: stop bits too long at ${ptr}, length=${stoplen} bits`);
      }   
      else if(stoplen < 1.2) {
         console.log(`byte n. ${buffer.length}; stop bits too short at ${ptr}, length=${stoplen} bits`);
      }   
   }

   return buffer;
}

function read_bit() {   
   if(ptr >= tape.length) return 0;

   const braw = tape[Math.round(ptr)];
   const bit = braw < 0 ? 0 : 1;

   //console.log(`${bit} center is ${ptr}`);

   ptr += bitsize; // advance to next bit;   

   return bit;
}

// positions to the end of the stop bit
function endOfStopBit() {
   const iptr = ptr;
   if(ptr >= tape.length) return 0;

   // advance while stop bit signal
   while(tape[Math.round(ptr)]>0) ptr++;

   // calculate length of stop bits, for end of tape marker
   const stop_length = (ptr-iptr) / bitsize;
   
   ptr += halfsize; // position to the mid of next bit

   return stop_length;
}

module.exports = decodeDSP;