function filterSamples(samples, samplerate, lo, hi, writeDebugWav) {
   var Fili = require('fili');   

   const calc = new Fili.FirCoeffs();

   const multiplier = samplerate / 44100;
   const orderBP = Math.round(80 * multiplier);
   const orderLP = Math.round(64 * multiplier);

   console.log(`tone BP FIR order: ${orderBP}, bit envelope LP FIR order: ${orderLP}`);
 
   // calculate filter coefficients
   const ltone_coeffs = calc.bandpass({
      order: orderBP,
      Fs: samplerate,
      F1: lo - (lo/6),    // 1000 - 1400
      F2: lo + (lo/6)
   });

   // calculate filter coefficients
   const htone_coeffs = calc.bandpass({
      order: orderBP,
      Fs: samplerate,
      F1: (hi - (hi/6)), // 2000 - 2800
      F2: (hi + (hi/6))
   });

   // calculate filter coefficients
   var bitstream_coeffs = calc.lowpass({
      order: orderLP,
      Fs: samplerate, 
      Fc: lo / 4          // bitrate frequency
   });
      
   var FL = new Fili.FirFilter(ltone_coeffs);
   var FH = new Fili.FirFilter(htone_coeffs);
   var FB = new Fili.FirFilter(bitstream_coeffs);

   //const tone_l = amplify(FL.multiStep(samples), 1/0.45); 
   const tone_l = maximize(FL.multiStep(samples)); 
   const tone_l_rect = rectify(tone_l);
   const bit_l_tone = maximize(FB.multiStep(tone_l_rect));

   //const tone_h = amplify(FH.multiStep(samples), 1/0.45); 
   const tone_h = maximize(FH.multiStep(samples)); 
   const tone_h_rect = rectify(tone_h);
   const bit_h_tone = maximize(FB.multiStep(tone_h_rect));

   const amplitude_signal = [];
   const bit_signal = [];
   for(let t=0; t<tone_l.length; t++)
   {      
      amplitude_signal.push(bit_h_tone[t] + bit_l_tone[t]);
      bit_signal.push(bit_h_tone[t] - bit_l_tone[t]);
   }   

   const bitsignal_squared = square(bit_signal);   

   const channelData = [
       samples,
       tone_l,
       tone_l_rect,
       bit_l_tone,
       tone_h,
       tone_h_rect,
       bit_h_tone,
       bit_signal,
       bitsignal_squared,
       amplitude_signal
   ]

   if(writeDebugWav) writeWavFile(channelData, samplerate, "_debug.wav");   
    
   return bitsignal_squared;
}

function writeWavFile(channelData, sampleRate, name) {
   const WavEncoder = require("wav-encoder");
   const fs = require("fs");
   const wavData = {
      sampleRate,
      channelData
   };     

   const buffer = WavEncoder.encode.sync(wavData, { bitDepth: 16, float: false });    
   fs.writeFileSync(name, new Buffer(buffer));
}

function maximize(samples) {
    let maxVolume = 0;
    samples.forEach(e=>{
        maxVolume = Math.max(Math.abs(e), maxVolume);
    });

    return amplify(samples, (0.75) / maxVolume);
}

function amplify(samples, a) {
    return samples.map(e=>e*a);    
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

