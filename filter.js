function filterSamples(samples, samplerate, lo, hi) {
   var Fili = require('fili');

   const calc = new Fili.FirCoeffs();
 
   // calculate filter coefficients
   const ltone_coeffs = calc.bandpass({
      order: 64, 
      Fs: samplerate,
      F1: lo - (lo/6),    // 1000 - 1400
      F2: lo + (lo/6)
   });

   // calculate filter coefficients
   const htone_coeffs = calc.bandpass({
      order: 64,
      Fs: samplerate,
      F1: (hi - (hi/6)), // 2000 - 2800
      F2: (hi + (hi/6))
   });

   // calculate filter coefficients
   var bitstream_coeffs = calc.lowpass({
      order: 64, 
      Fs: samplerate, 
      Fc: lo / 24          // about 50 Hz
   });
      
   var FL = new Fili.FirFilter(ltone_coeffs);
   var FH = new Fili.FirFilter(htone_coeffs);
   var FB = new Fili.FirFilter(bitstream_coeffs);

   const tone_l = FL.multiStep(samples); const bit_l_tone = invert(FB.multiStep(rectify(tone_l)));
   const tone_h = FH.multiStep(samples); const bit_h_tone = FB.multiStep(rectify(tone_h));

   const joined = [];
   const bit_signal = [];
   for(let t=0; t<tone_l.length; t++)
   {      
      joined.push(tone_l[t] + tone_h[t]);
      bit_signal.push(bit_l_tone[t] + bit_h_tone[t]);
   }   

   const bitsignal_squared = square(bit_signal);   

   // writeWavFile(bit_signal, samplerate, "_f.wav");   
    
   return bitsignal_squared;
}

function writeWavFile(xsam, samplerate, name) {
   const WavEncoder = require("wav-encoder");
   const fs = require("fs");
   const wavData = {
      sampleRate: samplerate,
      channelData: [ new Float32Array(xsam) ]
   };     

   const buffer = WavEncoder.encode.sync(wavData, { bitDepth: 16, float: false });    
   fs.writeFileSync(name, new Buffer(buffer));
}

function rectify(samples) {
   return samples.map(e=>{
      return e<0 ? -e : e;
   });
}

function invert(samples) {
   return samples.map(e=>-e);
}

function square(samples) {
   return samples.map(e=>e<0?-0.5:0.5);
}

module.exports = filterSamples;

