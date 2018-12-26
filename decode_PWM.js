let lo, hi, mid, shortest, longest;

function decodePWM(samples, samplerate, low_tone, high_tone) 
{
   lo = samplerate / low_tone;
   hi = samplerate / high_tone;
   mid = (hi + lo) / 2.0;
   shortest = hi - mid / 2;
   longest  = lo + mid / 2;

   console.log(`longest  pulse: ${lo} samples`);
   console.log(`shortest pulse: ${hi} samples`);
   console.log(`midline: ${mid}`);

   const { durations, positions } = samples_to_duration(samples);
   const { hl, positions2 } = duration_to_hl(durations, positions);

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

   let bytes = hl_to_bytes(hl, positions2);

   return bytes;
}

function hl_to_bytes(hl, positions) {
   let ptr;

   const read_bit = function(hl, positions) {
      const bit = look(hl, ptr);   
      if(bit === 0 || bit === 1) {
         ptr += 8;
         return bit;
      }   
      const lh = hl.slice(ptr, ptr+8).join("");
      console.log(`bad hardware bit at sample ${positions[ptr]}: ${lh}`);
      ptr++;
      return 0;
   }

   let bytes = [];
   for(ptr=0; ptr<hl.length-8;) {
      const bit = look(hl, ptr);
      if(bit === 0) {
         // console.log(`start bit found at pos ${ptr}`);
         // start bit found
         const start_bit = read_bit(hl, positions);
         const bit0      = read_bit(hl, positions);
         const bit1      = read_bit(hl, positions);
         const bit2      = read_bit(hl, positions);
         const bit3      = read_bit(hl, positions);
         const bit4      = read_bit(hl, positions);
         const bit5      = read_bit(hl, positions);
         const bit6      = read_bit(hl, positions);
         const bit7      = read_bit(hl, positions);
         const parity    = read_bit(hl, positions);
         const stop_bit1 = read_bit(hl, positions);
         const stop_bit2 = read_bit(hl, positions);

         const parity_check = (bit0+bit1+bit2+bit3+bit4+bit5+bit6+bit7) % 2;

         if(stop_bit1 !== 1 || stop_bit2 !== 1) {
            console.log(`byte rejected: bad stop bits at sample ${positions[ptr]}`);
         }
         else if(parity_check != parity) {
            console.log(`byte rejected: bad parity bit at sample ${positions[ptr]}`);
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
            console.log(`byte n. ${bytes.length-1} accepted at sample ${positions[ptr]}`);
         }
      }
      else ptr++;
   }
   return bytes;
}

function samples_to_duration(samples) {
   let durations = [];
   let positions = [];
   let last_s = 0;
   for(let t=0, c=0; t<samples.length; t++) {
      const s = samples[t];
      c++;
      if(last_s < 0 && s >= 0) {
         // edge detected
         durations.push(c);
         positions.push(t-c);

         if(c < shortest) {
            console.log(`warning: duration (${c}) too short at sample ${t}`);
         }
         else if(c > longest) {
            console.log(`warning: duration (${c}) too long at sample ${t}`);
         }
         c=0;
      }
      last_s = s;
   }
   return { durations, positions };
}

function duration_to_hl(durations, positions) {
   let hl = [];
   let positions2 = [];
   for(let t=0; t<durations.length; t++) {
      const d = durations[t];
      // TODO implement tolerance?
      if(d > mid) { 
         hl.push("L"); hl.push("L"); 
         positions2.push(positions[t]);
         positions2.push(positions[t]);
      }
      else {
         hl.push("H"); 
         positions2.push(positions[t]);
      }
   }
   return { hl, positions2 };
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

module.exports = decodePWM;